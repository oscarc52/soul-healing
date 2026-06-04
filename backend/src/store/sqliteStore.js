import { getDb } from '../db/sqlite.js';

function createSessionId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `session_${Date.now()}_${random}`;
}

function toBoolean(value) {
  return Boolean(value);
}

function toIntegerBoolean(value) {
  return value ? 1 : 0;
}

function cloneTags(tags = []) {
  return tags.map((tag) => ({ ...tag }));
}

function mapSessionRow(row, tags = [], feedback = null) {
  return {
    id: row.id,
    anonymousId: row.anonymous_id,
    transcript: row.transcript,
    durationSeconds: row.duration_seconds,
    timezone: row.timezone,
    insight: {
      struggle: row.struggle || '',
      pattern: row.pattern || '',
      question: row.question || ''
    },
    emotionLabel: row.emotion_label,
    tags: cloneTags(tags),
    riskLevel: row.risk_level,
    saved: toBoolean(row.saved),
    feedback,
    isDeleted: toBoolean(row.is_deleted),
    isFavorite: toBoolean(row.is_favorite),
    createdAt: row.created_at,
    deletedAt: row.deleted_at
  };
}

function mapTagRow(row) {
  return {
    tag: row.tag,
    score: row.score
  };
}

function mapFeedbackRow(row) {
  if (!row) {
    return null;
  }

  return {
    rating: row.rating,
    mostUsefulCard: row.most_useful_card,
    missedCard: row.missed_card,
    tonePreference: row.tone_preference,
    note: row.note,
    createdAt: row.created_at
  };
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

function getTags(sessionId) {
  return getDb()
    .prepare('SELECT tag, score FROM session_tags WHERE session_id = ? ORDER BY id ASC')
    .all(sessionId)
    .map(mapTagRow);
}

function getFeedback(sessionId) {
  return mapFeedbackRow(
    getDb()
      .prepare(
        `SELECT rating, most_useful_card, missed_card, tone_preference, note, created_at
         FROM session_feedback
         WHERE session_id = ?`
      )
      .get(sessionId)
  );
}

function getSessionById(sessionId) {
  const row = getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);

  if (!row) {
    return null;
  }

  return mapSessionRow(row, getTags(sessionId), getFeedback(sessionId));
}

export function saveSession({
  anonymousId,
  transcript,
  durationSeconds,
  timezone,
  insight,
  emotionLabel,
  tags,
  riskLevel = 'normal'
}) {
  const db = getDb();
  const sessionId = createSessionId();
  const createdAt = new Date().toISOString();
  const safeTags = cloneTags(tags);

  try {
    db.exec('BEGIN IMMEDIATE');
    db.prepare(
      `INSERT INTO sessions (
        id,
        anonymous_id,
        transcript,
        duration_seconds,
        timezone,
        struggle,
        pattern,
        question,
        emotion_label,
        risk_level,
        saved,
        is_deleted,
        is_favorite,
        created_at,
        deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      sessionId,
      anonymousId,
      transcript,
      durationSeconds,
      timezone,
      insight.struggle,
      insight.pattern,
      insight.question,
      emotionLabel,
      riskLevel,
      1,
      0,
      0,
      createdAt,
      null
    );

    const insertTag = db.prepare(
      `INSERT INTO session_tags (session_id, tag, score, created_at)
       VALUES (?, ?, ?, ?)`
    );

    for (const tag of safeTags) {
      insertTag.run(sessionId, tag.tag, tag.score, createdAt);
    }

    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors; the original error is more useful.
    }

    throw error;
  }

  return {
    id: sessionId,
    anonymousId,
    transcript,
    durationSeconds,
    timezone,
    insight: { ...insight },
    emotionLabel,
    tags: safeTags,
    riskLevel,
    saved: true,
    feedback: null,
    isDeleted: false,
    isFavorite: false,
    createdAt
  };
}

export function listSessions(anonymousId, limit) {
  const boundedLimit = Math.min(Math.max(limit, 0), 100);
  const rows = getDb()
    .prepare(
      `SELECT *
       FROM sessions
       WHERE anonymous_id = ? AND is_deleted = 0
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(anonymousId, boundedLimit);

  const items = rows
    .map((row) => mapSessionRow(row, getTags(row.id), getFeedback(row.id)))
    .map(toHistoryItem);

  return {
    items,
    total: items.length
  };
}

export function deleteAllSessions(anonymousId) {
  const result = getDb()
    .prepare(
      `UPDATE sessions
       SET is_deleted = 1, deleted_at = ?
       WHERE anonymous_id = ? AND is_deleted = 0`
    )
    .run(new Date().toISOString(), anonymousId);

  return result.changes;
}

export function deleteSession(anonymousId, sessionId) {
  const session = getDb()
    .prepare(
      `SELECT *
       FROM sessions
       WHERE id = ? AND anonymous_id = ? AND is_deleted = 0`
    )
    .get(sessionId, anonymousId);

  if (!session) {
    return null;
  }

  getDb()
    .prepare(
      `UPDATE sessions
       SET is_deleted = 1, deleted_at = ?
       WHERE id = ? AND anonymous_id = ? AND is_deleted = 0`
    )
    .run(new Date().toISOString(), sessionId, anonymousId);

  return getSessionById(sessionId);
}

export function updateFeedback(anonymousId, sessionId, feedback) {
  const session = getDb()
    .prepare(
      `SELECT id
       FROM sessions
       WHERE id = ? AND anonymous_id = ? AND is_deleted = 0`
    )
    .get(sessionId, anonymousId);

  if (!session) {
    return null;
  }

  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO session_feedback (
        session_id,
        rating,
        most_useful_card,
        missed_card,
        tone_preference,
        note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        rating = excluded.rating,
        most_useful_card = excluded.most_useful_card,
        missed_card = excluded.missed_card,
        tone_preference = excluded.tone_preference,
        note = excluded.note,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at`
    )
    .run(
      sessionId,
      feedback.rating,
      feedback.mostUsefulCard,
      feedback.missedCard,
      feedback.tonePreference,
      feedback.note,
      feedback.createdAt || now,
      now
    );

  return getSessionById(sessionId);
}

export function getSessionSnapshot() {
  const rows = getDb().prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();

  return rows.map((row) => mapSessionRow(row, getTags(row.id), getFeedback(row.id)));
}
