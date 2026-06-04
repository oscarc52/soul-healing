const VALID_RATINGS = ['accurate', 'somewhat', 'inaccurate'];
const VALID_CARDS = ['struggle', 'pattern', 'question'];
const VALID_TONE_PREFERENCES = ['more_direct', 'softer', 'current'];
const MAX_NOTE_LENGTH = 300;

function normalizeNullableEnum(value, allowedValues, errorCode, message) {
  if (value === undefined || value === null || value === '') {
    return {
      ok: true,
      value: null
    };
  }

  if (!allowedValues.includes(value)) {
    return {
      ok: false,
      error: {
        code: errorCode,
        message
      }
    };
  }

  return {
    ok: true,
    value
  };
}

function normalizeNote(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.slice(0, MAX_NOTE_LENGTH);
}

export function validateFeedbackPayload(payload = {}) {
  if (!VALID_RATINGS.includes(payload.rating)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_FEEDBACK_RATING',
        message: '反馈选项只支持 accurate、somewhat、inaccurate'
      }
    };
  }

  const mostUsefulCard = normalizeNullableEnum(
    payload.mostUsefulCard,
    VALID_CARDS,
    'INVALID_FEEDBACK_CARD',
    '卡片字段只支持 struggle、pattern、question'
  );

  if (!mostUsefulCard.ok) {
    return mostUsefulCard;
  }

  const missedCard = normalizeNullableEnum(
    payload.missedCard,
    VALID_CARDS,
    'INVALID_FEEDBACK_CARD',
    '卡片字段只支持 struggle、pattern、question'
  );

  if (!missedCard.ok) {
    return missedCard;
  }

  const tonePreference = normalizeNullableEnum(
    payload.tonePreference,
    VALID_TONE_PREFERENCES,
    'INVALID_TONE_PREFERENCE',
    '语气偏好只支持 more_direct、softer、current'
  );

  if (!tonePreference.ok) {
    return tonePreference;
  }

  return {
    ok: true,
    feedback: {
      rating: payload.rating,
      mostUsefulCard: mostUsefulCard.value,
      missedCard: missedCard.value,
      tonePreference: tonePreference.value,
      note: normalizeNote(payload.note),
      createdAt: new Date().toISOString()
    }
  };
}
