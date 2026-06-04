import { hasCrisisRisk, pickMockInsight } from '../utils/insightMock.js';
import { callAiProvider } from './provider.js';
import { validateInsightPayload } from './validateInsight.js';

const SAFETY_MESSAGE = '你刚才提到的内容包含较高现实风险。请立刻联系身边可信任的人，或当地紧急援助渠道。';

function buildMockResult(transcript) {
  const result = pickMockInsight(transcript);

  return {
    source: 'mock',
    riskLevel: 'normal',
    insight: result.insight,
    emotionLabel: result.emotionLabel,
    tags: result.tags,
    saved: true
  };
}

function buildSafetyResult() {
  return {
    source: 'safety',
    riskLevel: 'crisis',
    insight: null,
    emotionLabel: '混合',
    tags: [],
    saved: false,
    safetyMessage: SAFETY_MESSAGE
  };
}

function buildAiResult(payload) {
  if (payload.riskLevel === 'crisis') {
    return buildSafetyResult();
  }

  return {
    source: 'ai',
    riskLevel: payload.riskLevel,
    insight: {
      struggle: payload.struggle,
      pattern: payload.pattern,
      question: payload.question
    },
    emotionLabel: payload.emotionLabel,
    tags: payload.tags,
    saved: true
  };
}

export async function generateInsight({ transcript, anonymousId, durationSeconds, timezone }) {
  if (hasCrisisRisk(transcript)) {
    return buildSafetyResult();
  }

  const providerResult = await callAiProvider({
    transcript,
    anonymousId,
    durationSeconds,
    timezone
  });

  if (!providerResult.ok) {
    return buildMockResult(transcript);
  }

  const validation = validateInsightPayload(providerResult.data);

  if (!validation.ok) {
    console.warn('[Xinhu AI] Invalid AI insight payload; fallback to mock.', validation.error);
    return buildMockResult(transcript);
  }

  return buildAiResult(validation.data);
}
