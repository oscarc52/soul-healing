import { buildSystemPrompt, buildUserPrompt } from './prompt.js';

function getAiConfig() {
  return {
    provider: process.env.AI_PROVIDER || 'openai_compatible',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || '',
    model: process.env.AI_MODEL || '',
    timeoutMs: Number.parseInt(process.env.AI_TIMEOUT_MS || '12000', 10),
    enabled: process.env.AI_ENABLED === 'true'
  };
}

export async function callAiProvider({ transcript, anonymousId, durationSeconds, timezone, signal } = {}) {
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

    buildSystemPrompt();
    buildUserPrompt({ transcript, anonymousId, durationSeconds, timezone });
    void signal;

    return {
      ok: false,
      reason: 'AI_PROVIDER_NOT_IMPLEMENTED'
    };
  } catch {
    return {
      ok: false,
      reason: 'AI_PROVIDER_ERROR'
    };
  }
}
