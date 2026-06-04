const RANGE_DAYS = {
  '7d': 7,
  '30d': 30
};

const EMPTY_SUMMARY = '这一段时间，还没有足够的心湖记录形成稳定模式。';
const EMPTY_QUESTION = '下一次会话，可以先从此刻最真实的一句话开始。';

function incrementCount(map, key) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) || 0) + 1);
}

function toSortedCounts(map, keyName, limit) {
  return [...map.entries()]
    .map(([key, count]) => ({
      [keyName]: key,
      count
    }))
    .sort((a, b) => b.count - a.count || String(a[keyName]).localeCompare(String(b[keyName])))
    .slice(0, limit);
}

function isWithinRange(createdAt, range) {
  const days = RANGE_DAYS[range];
  const createdTime = new Date(createdAt).getTime();

  if (!Number.isFinite(createdTime)) {
    return false;
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return createdTime >= cutoff;
}

function formatTagPair(topTags) {
  const names = topTags.slice(0, 2).map((tag) => tag.tag);
  return names.join('和');
}

function buildSummary(range, topTags) {
  if (!topTags.length) {
    return EMPTY_SUMMARY;
  }

  const tagText = formatTagPair(topTags);

  if (range === '7d') {
    return `这一周，你反复提到${tagText}。`;
  }

  return `过去 30 天，你最常出现的主题是${tagText}。`;
}

function buildQuestion(topTags) {
  const highestTag = topTags[0]?.tag;

  if (highestTag === '疲惫感' || highestTag === '期待压力') {
    return '接下来，你可以留意自己在哪些时刻最容易被外部期待推着走。';
  }

  if (highestTag === '方向不清' || highestTag === '不确定性') {
    return '当方向还不清楚时，哪一小步是你现在就能确认的？';
  }

  if (highestTag === '情绪压抑' || highestTag === '关系压力') {
    return '哪些情绪是你已经感觉到了，但还没有真正表达出来的？';
  }

  return '接下来，你可以留意这个主题通常在什么场景里出现。';
}

function collectRepeatedQuestions(sessions) {
  const seen = new Set();
  const questions = [];

  for (const session of sessions) {
    const question = session.insight?.question;

    if (question && !seen.has(question)) {
      seen.add(question);
      questions.push(question);
    }

    if (questions.length >= 3) {
      break;
    }
  }

  return questions;
}

export function buildPatterns({ sessions, anonymousId, range }) {
  const filtered = sessions
    .filter((session) => session.anonymousId === anonymousId)
    .filter((session) => !session.isDeleted)
    .filter((session) => session.riskLevel !== 'crisis')
    .filter((session) => isWithinRange(session.createdAt, range))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const emotionCounts = new Map();
  const tagCounts = new Map();

  for (const session of filtered) {
    incrementCount(emotionCounts, session.emotionLabel);

    for (const tag of session.tags || []) {
      incrementCount(tagCounts, tag.tag);
    }
  }

  const topEmotions = toSortedCounts(emotionCounts, 'emotionLabel', 5);
  const topTags = toSortedCounts(tagCounts, 'tag', 8);
  const repeatedQuestions = collectRepeatedQuestions(filtered);

  return {
    range,
    sessionCount: filtered.length,
    topEmotions,
    topTags,
    repeatedQuestions,
    summary: filtered.length ? buildSummary(range, topTags) : EMPTY_SUMMARY,
    question: filtered.length ? buildQuestion(topTags) : EMPTY_QUESTION
  };
}
