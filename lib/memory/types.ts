/**
 * 记忆系统 V2 类型定义
 * 从"聊天机器人"升级为"长期数字伴侣"记忆架构
 * 
 * 4层记忆：基础记忆 / 关系记忆 / 情绪记忆 / 成长记忆
 */

// ─── 记忆层级 ──────────────────────────────────────────────

/** 记忆层级（4层架构） */
export type MemoryLayer = 'fact' | 'relationship' | 'emotion' | 'growth'

/** 记忆类型（V1兼容） */
export type MemoryType = 'profile' | 'preference' | 'event' | 'emotion' | 'goal'

// ─── 核心数据结构 ──────────────────────────────────────────

/** 用户记忆 V2（长期数字伴侣专用） */
export interface UserMemory {
  id: string
  userId: string

  // ── 4层分类 ──
  layer: MemoryLayer
  type: MemoryType

  // ── 基础字段 ──
  key: string
  value: string

  // ── 4维评分系统 ──
  scores: MemoryScores

  // ── 主题标签（如 ['创业', '压力', '成长']）──
  topics: string[]

  // ── 关联情绪 ──
  emotion?: EmotionLabel

  // ── 时间戳 ──
  createdAt: Date
  updatedAt: Date
}

/** 4维记忆评分 */
export interface MemoryScores {
  /** 信息重要性 0-1 */
  importance: number
  /** 情绪价值 0-1 */
  emotional: number
  /** 关系价值 0-1 */
  relationship: number
  /** 未来价值 0-1 */
  futureValue: number
}

/** 最终加权分数公式 */
export function calcMemoryScore(scores: MemoryScores): number {
  return (
    scores.importance * 0.3 +
    scores.emotional * 0.3 +
    scores.relationship * 0.2 +
    scores.futureValue * 0.2
  )
}

// ─── 成长记忆专用 ──────────────────────────────────────────

/** 目标状态变迁 */
export type GoalStatus = 'ongoing' | 'progress' | 'success' | 'abandoned'

/** 成长记忆条目 */
export interface GrowthMemory extends UserMemory {
  layer: 'growth'
  type: 'goal'
  goalStatus?: GoalStatus
  milestones?: { date: Date; description: string }[]
}

// ─── 关系记忆专用 ──────────────────────────────────────────

export interface RelationshipMemory extends UserMemory {
  layer: 'relationship'
  relationshipEvent: string // 例如 '第一次聊创业'
  relationshipEmotion: string // 例如 'admire'
}

// ─── 提取相关 ──────────────────────────────────────────────

export interface MemoryExtraction {
  key: string
  value: string
  type: MemoryType
  layer: MemoryLayer
  importance: number
  emotion?: EmotionLabel
  scores?: Partial<MemoryScores>
  topics?: string[]
}

export interface MemoryFilterResult {
  shouldStore: boolean
  reason: string
}

// ─── 召回相关 ──────────────────────────────────────────────

export interface MemoryRecallResult {
  memories: UserMemory[]
  memoryContext: string
  currentTopic?: string
}

/** 主题检测结果 */
export interface TopicDetection {
  topic: string
  confidence: number
}

// ─── 关系等级 ──────────────────────────────────────────────

export interface RelationshipLevel {
  score: number // 0-100
  level: RelationshipTier
  daysCount: number
  messageCount: number
  voiceCount: number
}

export type RelationshipTier =
  | 'stranger'      // 0-20: 陌生人
  | 'acquaintance'  // 21-40: 相识
  | 'friend'        // 41-60: 朋友
  | 'close'         // 61-80: 亲密
  | 'intimate'      // 81-100: 挚密

// ─── 存储相关 ──────────────────────────────────────────────

export interface MemoryStorageData {
  memories: UserMemory[]
  metadata: {
    lastUpdated: string
    totalCount: number
    layerStats: Record<MemoryLayer, number>
  }
}

// ─── 情绪标签 ──────────────────────────────────────────────

export type EmotionLabel =
  | 'happy'
  | 'sad'
  | 'excited'
  | 'worried'
  | 'grateful'
  | 'frustrated'
  | 'hopeful'
  | 'lonely'
  | 'proud'
  | 'surprised'
  | 'confused'
  | 'calm'
  | 'tired'
  | 'motivated'

// ─── V1 到 V2 迁移函数 ─────────────────────────────────────

/** 将V1记忆迁移到V2格式 */
export function migrateV1toV2(v1Memory: { id: string; userId: string; key: string; value: string; type: MemoryType; importance: number; createdAt: Date; updatedAt: Date }): UserMemory {
  return {
    id: v1Memory.id,
    userId: v1Memory.userId,
    layer: mapTypeToLayer(v1Memory.type),
    type: v1Memory.type,
    key: v1Memory.key,
    value: v1Memory.value,
    scores: {
      importance: v1Memory.importance,
      emotional: v1Memory.type === 'emotion' ? v1Memory.importance : 0.3,
      relationship: 0.3,
      futureValue: v1Memory.type === 'goal' ? v1Memory.importance : 0.1,
    },
    topics: inferTopics(v1Memory.key, v1Memory.value),
    createdAt: v1Memory.createdAt,
    updatedAt: v1Memory.updatedAt,
  }
}

/** V1 type → V2 layer 映射 */
function mapTypeToLayer(type: MemoryType): MemoryLayer {
  switch (type) {
    case 'emotion': return 'emotion'
    case 'goal': return 'growth'
    case 'event': return 'relationship'
    default: return 'fact'
  }
}

/** 从 key/value 推断主题标签 */
function inferTopics(key: string, value: string): string[] {
  const text = `${key} ${value}`.toLowerCase()
  const topics: string[] = []

  const topicPatterns: Record<string, RegExp> = {
    '创业': /创业|项目|产品|开发|上线/,
    '工作': /工作|加班|辞职|面试|入职/,
    '生活': /生活|日常|家|房子|搬家/,
    '情感': /情感|心情|感觉|孤独|想/,
    '学习': /学习|读书|课程|考试/,
    '健康': /健身|运动|跑步|身体/,
    '家庭': /爸|妈|父母|家人|亲戚/,
    '社交': /朋友|聊天|认识|见面/,
    '目标': /目标|计划|梦想|未来/,
    '压力': /压力|累|难|焦虑|烦/,
  }

  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(text)) {
      topics.push(topic)
    }
  }

  return topics.length > 0 ? topics : ['生活']
}
