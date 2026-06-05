import { buildSystemPrompt, buildUserPrompt } from './prompt.js';

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 600;

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAiConfig() {
  return {
    provider: process.env.AI_PROVIDER || 'openai_compatible',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || '',
    model: process.env.AI_MODEL || '',
    timeoutMs: parseInteger(process.env.AI_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), DEFAULT_TIMEOUT_MS),
    enabled: process.env.AI_ENABLED === 'true',
    temperature: parseNumber(process.env.AI_TEMPERATURE || String(DEFAULT_TEMPERATURE), DEFAULT_TEMPERATURE),
    maxTokens: parseInteger(process.env.AI_MAX_TOKENS || String(DEFAULT_MAX_TOKENS), DEFAULT_MAX_TOKENS),
    forceJson: process.env.AI_FORCE_JSON !== 'false'
  };
}

function buildChatCompletionsUrl(baseUrl) {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

function createTimeoutController(timeoutMs, externalSignal) {
  const controller = new AbortController();
  let timeoutId = null;

  function abort() {
    controller.abort();
  }

  if (externalSignal?.aborted) {
    abort();
  } else if (externalSignal) {
    externalSignal.addEventListener('abort', abort, { once: true });
  }

  timeoutId = setTimeout(abort, timeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abort);
      }
    }
  };
}

function buildRequestBody(config, { transcript, anonymousId, durationSeconds, timezone }) {
  const body = {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt()
      },
      {
        role: 'user',
        content: buildUserPrompt({ transcript, anonymousId, durationSeconds, timezone })
      }
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens
  };

  if (config.forceJson) {
    body.response_format = {
      type: 'json_object'
    };
  }

  return body;
}

export async function callAiProvider({
  transcript,
  anonymousId,
  durationSeconds,
  timezone,
  signal,
  fetchImpl
} = {}) {
  try {
    const config = getAiConfig();

    if (!config.enabled) {
      return {
        ok: false,
        reason: 'AI_DISABLED'
      };
    }

    if (!config.apiKey || !config.baseUrl || !config.model) {
      return {
        ok: false,
        reason: 'AI_CONFIG_MISSING'
      };
    }

    if (config.provider !== 'openai_compatible') {
      return {
        ok: false,
        reason: 'AI_PROVIDER_UNSUPPORTED'
      };
    }

    const requestFetch = fetchImpl || globalThis.fetch;

    if (typeof requestFetch !== 'function') {
      return {
        ok: false,
        reason: 'AI_FETCH_UNAVAILABLE'
      };
    }

    const timeout = createTimeoutController(config.timeoutMs, signal);

    try {
      const response = await requestFetch(buildChatCompletionsUrl(config.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(buildRequestBody(config, { transcript, anonymousId, durationSeconds, timezone })),
        signal: timeout.signal
      });

      if (!response.ok) {
        return {
          ok: false,
          reason: 'AI_HTTP_ERROR',
          status: response.status
        };
      }

      const body = await response.json();
      const choice = Array.isArray(body?.choices) ? body.choices[0] : null;

      if (!choice) {
        return {
          ok: false,
          reason: 'AI_EMPTY_CHOICES'
        };
      }

      const content = typeof choice.message?.content === 'string' ? choice.message.content.trim() : '';

      if (!content) {
        return {
          ok: false,
          reason: 'AI_EMPTY_CONTENT'
        };
      }

      return {
        ok: true,
        rawContent: content
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return {
          ok: false,
          reason: 'AI_TIMEOUT'
        };
      }

      return {
        ok: false,
        reason: 'AI_NETWORK_ERROR'
      };
    } finally {
      timeout.cleanup();
    }
  } catch {
    return {
      ok: false,
      reason: 'AI_PROVIDER_ERROR'
    };
  }
}
