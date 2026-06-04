const sessions = [];

function createSessionId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `session_${Date.now()}_${random}`;
}

function cloneTags(tags) {
  return tags.map((tag) => ({ ...tag }));
}

function toHistoryItem(session) {
  return {
    sessionId: session.id,
    createdAt: session.createdAt,
    durationSeconds: session.durationSeconds,
    insight: { ...session.insight },
    emotionLabel: session.emotionLabel,
    tags: cloneTags(session.tags),
    riskLevel: session.riskLevel,
    saved: session.saved,
    feedback: session.feedback,
    isFavorite: session.isFavorite
  };
}

export function saveSession({
  anonymousId,
  transcript,
  durationSeconds,
  timezone,
  insight,
  emotionLabel,
  tags
}) {
  const session = {
    id: createSessionId(),
    anonymousId,
    transcript,
    durationSeconds,
    timezone,
    insight: { ...insight },
    emotionLabel,
    tags: cloneTags(tags),
    riskLevel: 'normal',
    saved: true,
    feedback: null,
    isDeleted: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  };

  sessions.push(session);
  return session;
}

export function listSessions(anonymousId, limit) {
  const boundedLimit = Math.min(Math.max(limit, 0), 100);
  const items = sessions
    .filter((session) => session.anonymousId === anonymousId && !session.isDeleted)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, boundedLimit)
    .map(toHistoryItem);

  return {
    items,
    total: items.length
  };
}

export function deleteAllSessions(anonymousId) {
  let deletedCount = 0;

  for (const session of sessions) {
    if (session.anonymousId === anonymousId && !session.isDeleted) {
      session.isDeleted = true;
      deletedCount += 1;
    }
  }

  return deletedCount;
}

export function deleteSession(anonymousId, sessionId) {
  const session = sessions.find(
    (item) => item.id === sessionId && item.anonymousId === anonymousId && !item.isDeleted
  );

  if (!session) {
    return null;
  }

  session.isDeleted = true;
  return session;
}

export function updateFeedback(anonymousId, sessionId, feedback) {
  const session = sessions.find(
    (item) => item.id === sessionId && item.anonymousId === anonymousId && !item.isDeleted
  );

  if (!session) {
    return null;
  }

  session.feedback = { ...feedback };
  return session;
}

export function getSessionSnapshot() {
  return sessions.map((session) => ({
    ...session,
    insight: session.insight ? { ...session.insight } : null,
    tags: cloneTags(session.tags || [])
  }));
}
