const ALLOWED_EMOTION_LABELS = ['焦虑', '疲惫', '委屈', '愤怒', '迷茫', '压力', '孤独', '平静', '混合'];
const ALLOWED_RISK_LEVELS = ['normal', 'elevated', 'crisis'];
const MAX_CARD_LENGTH = 80;
const FORBIDDEN_TITLE_PREFIXES = [
  '一 ·',
  '二 ·',
  '三 ·',
  '你真正在纠结的',
  '我注意到的模式',
  '带走的问题'
];

function validationError(code, message) {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateCardText(value, fieldName) {
  const text = normalizeText(value);

  if (!text) {
    return validationError('AI_FIELD_EMPTY', `${fieldName} 必须是非空字符串`);
  }

  if (text.length > MAX_CARD_LENGTH) {
    return validationError('AI_FIELD_TOO_LONG', `${fieldName} 不能超过 ${MAX_CARD_LENGTH} 个字符`);
  }

  if (FORBIDDEN_TITLE_PREFIXES.some((prefix) => text.includes(prefix))) {
    return validationError('AI_FIELD_HAS_TITLE', `${fieldName} 不能包含卡片标题`);
  }

  return {
    ok: true,
    data: text
  };
}

function validateTags(tags) {
  if (!Array.isArray(tags) || tags.length < 2 || tags.length > 5) {
    return validationError('AI_TAGS_INVALID', 'tags 必须是 2 到 5 个元素的数组');
  }

  const normalizedTags = [];

  for (const item of tags) {
    if (!isObject(item)) {
      return validationError('AI_TAG_INVALID', 'tag 项必须是对象');
    }

    const tag = normalizeText(item.tag);
    const { score } = item;

    if (!tag) {
      return validationError('AI_TAG_INVALID', 'tag 必须是非空字符串');
    }

    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
      return validationError('AI_TAG_SCORE_INVALID', 'score 必须是 0 到 1 之间的数字');
    }

    normalizedTags.push({
      tag,
      score
    });
  }

  return {
    ok: true,
    data: normalizedTags
  };
}

export function validateInsightPayload(payload) {
  if (!isObject(payload)) {
    return validationError('AI_PAYLOAD_INVALID', 'AI 输出必须是 JSON 对象');
  }

  const struggle = validateCardText(payload.struggle, 'struggle');
  if (!struggle.ok) return struggle;

  const pattern = validateCardText(payload.pattern, 'pattern');
  if (!pattern.ok) return pattern;

  const question = validateCardText(payload.question, 'question');
  if (!question.ok) return question;

  const emotionLabel = normalizeText(payload.emotionLabel);
  if (!ALLOWED_EMOTION_LABELS.includes(emotionLabel)) {
    return validationError('AI_EMOTION_INVALID', 'emotionLabel 不在允许集合中');
  }

  const tags = validateTags(payload.tags);
  if (!tags.ok) return tags;

  const riskLevel = normalizeText(payload.riskLevel);
  if (!ALLOWED_RISK_LEVELS.includes(riskLevel)) {
    return validationError('AI_RISK_LEVEL_INVALID', 'riskLevel 只支持 normal、elevated、crisis');
  }

  return {
    ok: true,
    data: {
      struggle: struggle.data,
      pattern: pattern.data,
      question: question.data,
      emotionLabel,
      tags: tags.data,
      riskLevel
    }
  };
}
