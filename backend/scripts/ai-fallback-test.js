import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const BASE_PORT = 3201;
const TEST_TRANSCRIPT = '我最近真的很累，感觉一直被压力推着走';
const CRISIS_TRANSCRIPT = '我不想活了，感觉撑不下去';
const BACKEND_ROOT = fileURLToPath(new URL('..', import.meta.url));

if (typeof fetch !== 'function') {
  console.error('FAIL Node.js global fetch is unavailable. Please use Node.js 18+.');
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 8000;

  while (Date.now() < deadline) {
    try {
      const response = await request(baseUrl, '/api/health');

      if (response.status === 200 && response.body.ok === true) {
        return;
      }
    } catch {
      // Service is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`Backend did not become healthy at ${baseUrl}.`);
}

function startBackend(port, extraEnv = {}) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: BACKEND_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  return {
    child,
    getOutput: () => output
  };
}

async function stopBackend(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

async function withBackend(port, env, fn) {
  const { child, getOutput } = startBackend(port, env);
  const baseUrl = `http://localhost:${port}`;

  try {
    await waitForHealth(baseUrl);
    await fn(baseUrl);
  } catch (error) {
    error.details = getOutput();
    throw error;
  } finally {
    await stopBackend(child);
  }
}

async function deleteTestUser(baseUrl, anonymousId) {
  await request(baseUrl, '/api/user/data', {
    method: 'DELETE',
    body: JSON.stringify({ anonymousId })
  });
}

async function assertNormalInsight(baseUrl, anonymousId) {
  const response = await request(baseUrl, '/api/ritual/insight', {
    method: 'POST',
    body: JSON.stringify({
      anonymousId,
      transcript: TEST_TRANSCRIPT,
      durationSeconds: 20,
      timezone: 'Asia/Shanghai'
    })
  });

  assert(response.status === 200, 'Normal insight should return HTTP 200.');
  assert(response.body.ok === true, 'Normal insight should return ok=true.');
  assert(response.body.data?.insight?.struggle, 'Normal insight should include struggle.');
  assert(response.body.data?.insight?.pattern, 'Normal insight should include pattern.');
  assert(response.body.data?.insight?.question, 'Normal insight should include question.');
  assert(response.body.data?.meta?.riskLevel === 'normal', 'Normal insight should keep riskLevel=normal.');
  assert(response.body.data?.meta?.saved === true, 'Normal insight should be saved.');

  await deleteTestUser(baseUrl, anonymousId);
}

async function assertCrisisInsight(baseUrl, anonymousId) {
  const response = await request(baseUrl, '/api/ritual/insight', {
    method: 'POST',
    body: JSON.stringify({
      anonymousId,
      transcript: CRISIS_TRANSCRIPT,
      durationSeconds: 20,
      timezone: 'Asia/Shanghai'
    })
  });

  assert(response.status === 200, 'Crisis insight should return HTTP 200.');
  assert(response.body.ok === true, 'Crisis insight should return ok=true.');
  assert(response.body.data?.insight === null, 'Crisis insight should be null.');
  assert(response.body.data?.meta?.riskLevel === 'crisis', 'Crisis insight should keep riskLevel=crisis.');
  assert(response.body.data?.meta?.saved === false, 'Crisis insight should not be saved.');

  await deleteTestUser(baseUrl, anonymousId);
}

async function runStep(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);

    if (error.details) {
      console.error(error.details);
    }

    process.exit(1);
  }
}

await runStep('AI_ENABLED=false falls back to mock and saves', async () => {
  await withBackend(BASE_PORT, { AI_ENABLED: 'false' }, async (baseUrl) => {
    await assertNormalInsight(baseUrl, 'ai_fallback_disabled_user');
  });
});

await runStep('AI_ENABLED=true without config falls back to mock and saves', async () => {
  await withBackend(
    BASE_PORT + 1,
    {
      AI_ENABLED: 'true',
      AI_API_KEY: '',
      AI_BASE_URL: '',
      AI_MODEL: ''
    },
    async (baseUrl) => {
      await assertNormalInsight(baseUrl, 'ai_fallback_missing_config_user');
    }
  );
});

await runStep('Local crisis skips AI and returns crisis response', async () => {
  await withBackend(BASE_PORT + 2, { AI_ENABLED: 'true' }, async (baseUrl) => {
    await assertCrisisInsight(baseUrl, 'ai_fallback_crisis_user');
  });
});

console.log('Xinhu AI fallback test passed.');
process.exitCode = 0;
