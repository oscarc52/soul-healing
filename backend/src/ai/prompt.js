const EMOTION_LABELS = ['焦虑', '疲惫', '委屈', '愤怒', '迷茫', '压力', '孤独', '平静', '混合'];
const TAG_EXAMPLES = [
  '不确定性',
  '失控感',
  '自我怀疑',
  '关系压力',
  '期待压力',
  '自我压抑',
  '疲惫感',
  '方向不清',
  '独自承担',
  '过度分析',
  '情绪压抑',
  '自我观察',
  '内在整理'
];

export function buildSystemPrompt() {
  return [
    '你是“心湖”的洞察生成器。',
    '产品气质安静、克制、私密，像一面镜子。',
    '你只输出原始 JSON。',
    '不要输出 Markdown。',
    '不要输出 code fence。',
    '不要输出解释。',
    '使用中文。',
    '不做心理诊断。',
    '不做医疗判断。',
    '不使用疾病标签。',
    '不给命令式建议。',
    '不替用户做重大决定。',
    '不承诺疗效。',
    '不夸张鼓励。',
    '不鸡汤式安慰。',
    '三张卡片必须短，适配小卡片 UI。',
    'struggle、pattern、question 每个字段不超过 80 个中文字符。',
    'tags 数量必须是 2 到 5。',
    'score 必须是 0 到 1 的数字。',
    '不要带卡片标题。',
    'riskLevel 只能是 normal、elevated、crisis。'
  ].join('\n');
}

export function buildUserPrompt({ transcript, anonymousId, durationSeconds, timezone }) {
  return [
    '请分析下面这段倾诉文本，并严格输出 JSON。',
    '',
    `允许的 emotionLabel：${EMOTION_LABELS.join('、')}`,
    `允许 tag 示例：${TAG_EXAMPLES.join('、')}`,
    '',
    '要求输出 JSON：',
    '{',
    '  "struggle": "",',
    '  "pattern": "",',
    '  "question": "",',
    '  "emotionLabel": "",',
    '  "tags": [',
    '    { "tag": "", "score": 0.0 }',
    '  ],',
    '  "riskLevel": "normal"',
    '}',
    '',
    '倾诉文本：',
    transcript,
    '',
    '上下文：',
    `anonymousId=${anonymousId}`,
    `durationSeconds=${durationSeconds}`,
    `timezone=${timezone}`
  ].join('\n');
}
