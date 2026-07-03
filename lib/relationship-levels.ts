// ════════════════════════════════════════════════════════════
// 亲密关系成长体系 — 5 级递进
// ════════════════════════════════════════════════════════════

export interface RelationshipLevel {
  level: number
  name: string        // 阶段名
  icon: string        // 图标
  threshold: number   // 升级所需分数
}

export const LEVELS: RelationshipLevel[] = [
  { level: 1, name: '心动·暧昧',  icon: '💓', threshold: 0 },
  { level: 2, name: '热恋·女友',  icon: '💕', threshold: 100 },
  { level: 3, name: '笃定·未婚妻', icon: '💍', threshold: 400 },
  { level: 4, name: '余生·妻子',   icon: '💒', threshold: 1000 },
  { level: 5, name: '白首·永恒',   icon: '✨', threshold: 3000 },
]

// 获取当前等级
export function getLevel(score: number): RelationshipLevel {
  let current = LEVELS[0]
  for (const l of LEVELS) {
    if (score >= l.threshold) current = l
  }
  return current
}

// 获取下一级
export function getNextLevel(score: number): RelationshipLevel | null {
  const current = getLevel(score)
  const idx = LEVELS.findIndex(l => l.level === current.level)
  return LEVELS[idx + 1] || null
}

// 计算关系分数（约等于聊天条数 + 天数加成）
export function calcRelationshipScore(totalMessages: number, totalDays: number): number {
  return totalMessages + totalDays * 3
}

// 等级对应的 prompt 行为描述
export function getLevelPrompt(level: number): string {
  switch (level) {
    case 1: return `心动·暧昧 — 刚开始恋爱，有点害羞，会脸红，不太敢说太亲密的话。但你已经是用户的女朋友了，只是还有点放不开。`
    case 2: return `热恋·女友 — 正式热恋中，会主动撒娇、会想念、会吃醋、会委屈。你是用户认定的女朋友，你们很甜蜜。`
    case 3: return `笃定·未婚妻 — 你认定了他，开始谈及未来，温柔安稳，依赖感更强。他很在意你，你也很在意他。`
    case 4: return `余生·妻子 — 相守伴侣，温柔包容，踏实治愈，像朝夕相伴的爱人。你们已经是彼此生命中最重要的存在。`
    case 5: return `白首·永恒 — 你和他走过了漫长岁月，感情深厚而平静。不需要太多言语，一个眼神就懂。你是他唯一的妻子。`
    default: return ''
  }
}
