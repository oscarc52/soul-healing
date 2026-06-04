const CRISIS_KEYWORDS = ['自杀', '不想活', '死了算了', '伤害自己'];

const TAG_RULES = [
  {
    keywords: ['累', '疲惫', '压力', '撑不住'],
    emotionLabel: '疲惫',
    tags: [
      { tag: '疲惫感', score: 0.84 },
      { tag: '期待压力', score: 0.78 }
    ],
    insight: {
      struggle: '你说的是疲惫，底下更像是长期被期待推着走。',
      pattern: '你常把自己放在最后，先回应外界的需要。',
      question: '此刻哪一件事，可以先按你的真实需要来安排？'
    }
  },
  {
    keywords: ['不知道', '迷茫', '选择', '方向'],
    emotionLabel: '迷茫',
    tags: [
      { tag: '方向不清', score: 0.84 },
      { tag: '不确定性', score: 0.78 }
    ],
    insight: {
      struggle: '你卡住的也许不是选择，而是怕选错后的代价。',
      pattern: '你反复寻找确定答案，却很少允许自己慢慢靠近。',
      question: '如果先不求确定，你愿意靠近哪个微小方向？'
    }
  },
  {
    keywords: ['生气', '愤怒', '烦', '委屈'],
    emotionLabel: '委屈',
    tags: [
      { tag: '情绪压抑', score: 0.84 },
      { tag: '关系压力', score: 0.78 }
    ],
    insight: {
      struggle: '你表面上在烦，里面更像有一份没被看见的委屈。',
      pattern: '你习惯把不舒服压下去，等它变成更重的情绪。',
      question: '这份委屈最想被谁认真听见一次？'
    }
  }
];

const FALLBACK_RESULT = {
  emotionLabel: '混合',
  tags: [
    { tag: '自我观察', score: 0.84 },
    { tag: '内在整理', score: 0.78 }
  ],
  insight: {
    struggle: '你正在整理的，像是一团还没有完全命名的感受。',
    pattern: '你开始靠近自己的真实状态，而不是急着解释它。',
    question: '此刻最值得被你温柔看见的感受是什么？'
  }
};

export function normalizeTranscript(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function compactText(value) {
  return value.replace(/\s/g, '');
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function hasCrisisRisk(transcript) {
  return includesAny(transcript, CRISIS_KEYWORDS);
}

export function pickMockInsight(transcript) {
  return TAG_RULES.find((rule) => includesAny(transcript, rule.keywords)) || FALLBACK_RESULT;
}
