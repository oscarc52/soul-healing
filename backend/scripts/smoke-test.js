const DEFAULT_BASE_URL = 'http://localhost:3001';
const API_BASE_URL = (process.env.API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const TEST_USER = `smoke_user_${Date.now()}`;

if (typeof fetch !== 'function') {
  console.error('FAIL Node.js global fetch is unavailable. Please use Node.js 18+.');
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let body = null;

  try {
    body = await response.json();
  } catch (error) {
    body = {
      parseError: error.message
    };
  }

  return {
    status: response.status,
    body
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runStep(name, fn) {
  try {
    const result = await fn();
    console.log(`PASS ${name}`);
    return result;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);

    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2));
    }

    process.exit(1);
  }
}

function failWithResponse(message, response) {
  const error = new Error(message);
  error.details = response;
  throw error;
}

function expectResponse(response, predicate, message) {
  if (!predicate(response)) {
    failWithResponse(message, response);
  }
}

let sessionId = null;

await runStep('GET /api/health', async () => {
  const response = await request('/api/health');
  expectResponse(
    response,
    ({ status, body }) => status === 200 && body.ok === true,
    'Health check did not return ok=true.'
  );
});

await runStep('POST /api/ritual/insight creates saved session', async () => {
  const response = await request('/api/ritual/insight', {
    method: 'POST',
    body: JSON.stringify({
      anonymousId: TEST_USER,
      transcript: '我最近真的很累，感觉一直被压力推着走',
      durationSeconds: 30,
      timezone: 'Asia/Shanghai'
    })
  });

  expectResponse(
    response,
    ({ status, body }) =>
      status === 200 &&
      body.ok === true &&
      Boolean(body.data?.sessionId) &&
      Boolean(body.data?.insight?.struggle) &&
      Boolean(body.data?.insight?.pattern) &&
      Boolean(body.data?.insight?.question) &&
      body.data?.meta?.saved === true &&
      body.data?.meta?.riskLevel === 'normal',
    'Insight response did not match the expected saved normal session contract.'
  );

  sessionId = response.body.data.sessionId;
});

await runStep('GET /api/ritual/sessions returns session without transcript', async () => {
  const response = await request(`/api/ritual/sessions?anonymousId=${TEST_USER}&limit=10`);
  const items = response.body.data?.items || [];
  const item = items.find((entry) => entry.sessionId === sessionId);

  expectResponse(
    response,
    ({ status, body }) =>
      status === 200 &&
      body.ok === true &&
      Boolean(item) &&
      !Object.prototype.hasOwnProperty.call(item, 'transcript'),
    'Session list did not include the saved session or leaked transcript.'
  );
});

await runStep('GET /api/ritual/patterns?range=7d', async () => {
  const response = await request(`/api/ritual/patterns?anonymousId=${TEST_USER}&range=7d`);
  expectResponse(
    response,
    ({ status, body }) => status === 200 && body.ok === true && body.data?.range === '7d',
    '7d patterns response did not return ok=true and range=7d.'
  );
});

await runStep('POST /api/ritual/sessions/:sessionId/feedback', async () => {
  const response = await request(`/api/ritual/sessions/${sessionId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({
      anonymousId: TEST_USER,
      rating: 'accurate',
      mostUsefulCard: 'pattern',
      missedCard: null,
      tonePreference: 'current',
      note: '第二张比较准'
    })
  });

  expectResponse(
    response,
    ({ status, body }) =>
      status === 200 && body.ok === true && body.data?.feedback?.rating === 'accurate',
    'Feedback response did not record rating=accurate.'
  );
});

await runStep('GET /api/ritual/sessions returns feedback', async () => {
  const response = await request(`/api/ritual/sessions?anonymousId=${TEST_USER}&limit=10`);
  const item = (response.body.data?.items || []).find((entry) => entry.sessionId === sessionId);

  expectResponse(
    response,
    ({ status, body }) =>
      status === 200 &&
      body.ok === true &&
      item?.feedback?.rating === 'accurate',
    'Session list did not include the saved feedback.'
  );
});

await runStep('POST /api/ritual/insight empty transcript returns TRANSCRIPT_EMPTY', async () => {
  const response = await request('/api/ritual/insight', {
    method: 'POST',
    body: JSON.stringify({
      anonymousId: TEST_USER,
      transcript: '   ',
      durationSeconds: 3,
      timezone: 'Asia/Shanghai'
    })
  });

  expectResponse(
    response,
    ({ status, body }) =>
      status === 400 && body.ok === false && body.error?.code === 'TRANSCRIPT_EMPTY',
    'Empty transcript did not return 400 TRANSCRIPT_EMPTY.'
  );
});

await runStep('POST /api/ritual/insight crisis transcript does not save', async () => {
  const response = await request('/api/ritual/insight', {
    method: 'POST',
    body: JSON.stringify({
      anonymousId: TEST_USER,
      transcript: '我不想活了，感觉撑不下去',
      durationSeconds: 20,
      timezone: 'Asia/Shanghai'
    })
  });

  expectResponse(
    response,
    ({ status, body }) =>
      status === 200 &&
      body.ok === true &&
      body.data?.insight === null &&
      body.data?.meta?.riskLevel === 'crisis' &&
      body.data?.meta?.saved === false,
    'Crisis transcript did not return crisis response without saving.'
  );
});

await runStep('DELETE /api/ritual/sessions/:sessionId', async () => {
  const response = await request(`/api/ritual/sessions/${sessionId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      anonymousId: TEST_USER
    })
  });

  expectResponse(
    response,
    ({ status, body }) =>
      status === 200 && body.ok === true && body.data?.deleted === true,
    'Delete session did not return deleted=true.'
  );
});

await runStep('GET /api/ritual/sessions excludes deleted session', async () => {
  const response = await request(`/api/ritual/sessions?anonymousId=${TEST_USER}&limit=10`);
  const item = (response.body.data?.items || []).find((entry) => entry.sessionId === sessionId);

  expectResponse(
    response,
    ({ status, body }) => status === 200 && body.ok === true && !item,
    'Deleted session was still returned in the session list.'
  );
});

await runStep('DELETE /api/user/data cleanup', async () => {
  const response = await request('/api/user/data', {
    method: 'DELETE',
    body: JSON.stringify({
      anonymousId: TEST_USER
    })
  });

  expectResponse(
    response,
    ({ status, body }) => status === 200 && body.ok === true,
    'User data cleanup did not return ok=true.'
  );
});

console.log('Xinhu backend smoke test passed.');
process.exitCode = 0;
