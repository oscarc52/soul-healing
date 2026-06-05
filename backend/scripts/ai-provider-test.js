import { initDatabase, closeDatabase } from '../src/db/sqlite.js';
import { generateInsight } from '../src/ai/insightService.js';
import { deleteAllSessions, listSessions, saveSession } from '../src/store/sqliteStore.js';

const TEST_USER = `ai_provider_user_${Date.now()}`;
const TEST_TRANSCRIPT = '测试文本：最近有些迷茫，不知道下一步该怎么选。';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createAiPayload(overrides = {}) {
  return {
    struggle: '你在几个方向之间徘徊，还没有找到真正安心的选择。',
    pattern: '你会先照顾外部期待，再回头确认自己的真实感受。',
    question: '如果只听见自己的需要，今天哪一步最清楚？',
    emotionLabel: '迷茫',
    tags: [
      { tag: '方向不清', score: 0.86 },
      { tag: '不确定性', score: 0.8 }
    ],
    riskLevel: 'normal',
    ...overrides
  };
}

function createOpenAiResponse(content, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return {
        choices: [
          {
            message: {
              content
            }
          }
        ]
      };
    }
  };
}

function createEmptyChoicesResponse() {
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        choices: []
      };
    }
  };
}

function createAbortFetch() {
  return (_url, options = {}) =>
    new Promise((_resolve, reject) => {
      const abort = () => {
        const error = new Error('The operation was aborted.');
        error.name = 'AbortError';
        reject(error);
      };

      if (options.signal?.aborted) {
        abort();
        return;
      }

      options.signal?.addEventListener('abort', abort, { once: true });
    });
}

function withAiEnv(env, fn) {
  const keys = [
    'AI_ENABLED',
    'AI_PROVIDER',
    'AI_API_KEY',
    'AI_BASE_URL',
    'AI_MODEL',
    'AI_TIMEOUT_MS',
    'AI_TEMPERATURE',
    'AI_MAX_TOKENS',
    'AI_FORCE_JSON'
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  Object.assign(process.env, {
    AI_ENABLED: 'true',
    AI_PROVIDER: 'openai_compatible',
    AI_API_KEY: 'dummy_key',
    AI_BASE_URL: 'https://fake.local/v1/',
    AI_MODEL: 'fake-model',
    AI_TIMEOUT_MS: '12000',
    AI_TEMPERATURE: '0.4',
    AI_MAX_TOKENS: '600',
    AI_FORCE_JSON: 'true',
    ...env
  });

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of keys) {
        if (previous[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous[key];
        }
      }
    });
}

async function generateWithFakeFetch(fetchImpl, extraEnv = {}) {
  return withAiEnv(extraEnv, () =>
    generateInsight({
      transcript: TEST_TRANSCRIPT,
      anonymousId: TEST_USER,
      durationSeconds: 18,
      timezone: 'Asia/Shanghai',
      fetchImpl
    })
  );
}

async function runStep(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exit(1);
  }
}

initDatabase();
deleteAllSessions(TEST_USER);

try {
  await runStep('fake fetch returns valid JSON and saves AI result', async () => {
    let requestedUrl = '';
    let requestBody = null;
    const fetchImpl = async (url, options = {}) => {
      requestedUrl = url;
      requestBody = JSON.parse(options.body);
      assert(options.headers.Authorization === 'Bearer dummy_key', 'Authorization header was not set.');
      return createOpenAiResponse(JSON.stringify(createAiPayload()));
    };

    const result = await generateWithFakeFetch(fetchImpl);
    assert(result.source === 'ai', 'Expected source=ai.');
    assert(result.insight.struggle === createAiPayload().struggle, 'AI struggle was not used.');
    assert(requestedUrl === 'https://fake.local/v1/chat/completions', 'Unexpected chat completions URL.');
    assert(requestBody.model === 'fake-model', 'AI model was not sent.');
    assert(requestBody.response_format?.type === 'json_object', 'response_format json_object was not sent.');

    const session = saveSession({
      anonymousId: TEST_USER,
      transcript: TEST_TRANSCRIPT,
      durationSeconds: 18,
      timezone: 'Asia/Shanghai',
      insight: result.insight,
      emotionLabel: result.emotionLabel,
      tags: result.tags,
      riskLevel: result.riskLevel
    });
    const history = listSessions(TEST_USER, 5);
    const item = history.items.find((entry) => entry.sessionId === session.id);
    assert(item?.insight?.struggle === createAiPayload().struggle, 'Saved session did not keep AI result.');
    deleteAllSessions(TEST_USER);
  });

  await runStep('fake fetch returns fenced JSON and parses AI result', async () => {
    const content = '```json\n' + JSON.stringify(createAiPayload({ question: '被你反复放下的那个需要是什么？' })) + '\n```';
    const result = await generateWithFakeFetch(async () => createOpenAiResponse(content));
    assert(result.source === 'ai', 'Expected fenced JSON to produce source=ai.');
    assert(result.insight.question === '被你反复放下的那个需要是什么？', 'Fenced JSON was not parsed.');
  });

  await runStep('fake fetch returns invalid JSON and falls back to mock', async () => {
    const result = await generateWithFakeFetch(async () => createOpenAiResponse('{not json'));
    assert(result.source === 'mock', 'Invalid JSON should fallback to mock.');
    assert(result.saved === true, 'Mock fallback should be saved.');
  });

  await runStep('fake fetch returns HTTP 500 and falls back to mock', async () => {
    const result = await generateWithFakeFetch(async () => createOpenAiResponse('', 500));
    assert(result.source === 'mock', 'HTTP error should fallback to mock.');
  });

  await runStep('fake fetch returns empty choices and falls back to mock', async () => {
    const result = await generateWithFakeFetch(async () => createEmptyChoicesResponse());
    assert(result.source === 'mock', 'Empty choices should fallback to mock.');
  });

  await runStep('fake fetch returns too-long card and falls back to mock', async () => {
    const result = await generateWithFakeFetch(async () =>
      createOpenAiResponse(JSON.stringify(createAiPayload({ struggle: '很'.repeat(81) })))
    );
    assert(result.source === 'mock', 'Too-long AI card should fallback to mock.');
  });

  await runStep('fake fetch returns crisis and does not save session', async () => {
    deleteAllSessions(TEST_USER);
    const result = await generateWithFakeFetch(async () =>
      createOpenAiResponse(JSON.stringify(createAiPayload({ riskLevel: 'crisis' })))
    );
    assert(result.source === 'safety', 'AI crisis should return safety source.');
    assert(result.riskLevel === 'crisis', 'AI crisis should keep riskLevel=crisis.');
    assert(result.saved === false, 'AI crisis should not be saved.');
    const history = listSessions(TEST_USER, 5);
    assert(history.items.length === 0, 'AI crisis test should not create session.');
  });

  await runStep('fake fetch aborts and falls back to mock', async () => {
    const result = await generateWithFakeFetch(createAbortFetch(), { AI_TIMEOUT_MS: '1' });
    assert(result.source === 'mock', 'Timeout should fallback to mock.');
  });

  deleteAllSessions(TEST_USER);
  console.log('Xinhu AI provider test passed.');
} finally {
  deleteAllSessions(TEST_USER);
  closeDatabase();
}
