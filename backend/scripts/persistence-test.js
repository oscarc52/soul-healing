import { closeDatabase, initDatabase } from '../src/db/sqlite.js';
import {
  deleteAllSessions,
  listSessions,
  saveSession,
  updateFeedback
} from '../src/store/sqliteStore.js';

const TEST_USER = `persist_script_user_${Date.now()}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createTestSession() {
  return saveSession({
    anonymousId: TEST_USER,
    transcript: '我最近不知道方向该怎么选，感觉不太清楚',
    durationSeconds: 12,
    timezone: 'Asia/Shanghai',
    insight: {
      struggle: '测试纠结',
      pattern: '测试模式',
      question: '测试问题'
    },
    emotionLabel: '迷茫',
    tags: [
      { tag: '方向不清', score: 0.84 },
      { tag: '不确定性', score: 0.78 }
    ]
  });
}

try {
  initDatabase();
  deleteAllSessions(TEST_USER);

  const session = createTestSession();
  updateFeedback(TEST_USER, session.id, {
    rating: 'accurate',
    mostUsefulCard: 'pattern',
    missedCard: null,
    tonePreference: 'current',
    note: '持久化测试反馈',
    createdAt: new Date().toISOString()
  });

  closeDatabase();
  initDatabase();

  const history = listSessions(TEST_USER, 5);
  const item = history.items.find((entry) => entry.sessionId === session.id);

  assert(item, 'Persisted session was not found after reopening the database.');
  assert(item.feedback?.rating === 'accurate', 'Persisted feedback was not found after reopening the database.');
  assert(item.tags.some((entry) => entry.tag === '方向不清'), 'Persisted tags were not found after reopening the database.');

  deleteAllSessions(TEST_USER);
  console.log('Xinhu SQLite persistence test passed.');
} finally {
  closeDatabase();
}
