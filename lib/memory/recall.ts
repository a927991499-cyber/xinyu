/**
 * 记忆召回模块 V2
 * 支持主题检测和主题过滤召回
 * 优化 Prompt 注入格式（从列表 → 叙述性）
 */

import {
  UserMemory,
  MemoryExtraction,
  MemoryRecallResult,
  MemoryScores,
  calcMemoryScore,
  TopicDetection,
} from './types'
// loadMemories 已从 storage.ts 改为从数据库读取，直接导入使用
import { loadMemories } from './storage'

/**
 * 记忆过滤规则
 * 使用4维评分决定是否写入
 */
export function filterMemory(extraction: MemoryExtraction): {
  shouldStore: boolean
  reason: string
} {
  const layer = extraction.layer

  // 规则1: 强情绪（emotional >= 0.7）
  const emotionalScore = extraction.scores?.emotional ?? 0
  if (emotionalScore >= 0.7) {
    return { shouldStore: true, reason: '强情绪记忆' }
  }

  // 规则2: 事实层明确信息
  if (layer === 'fact' && (extraction.type === 'profile' || extraction.type === 'preference')) {
    return { shouldStore: true, reason: '明确的事实信息' }
  }

  // 规则3: 关系层级（始终存储）
  if (layer === 'relationship') {
    return { shouldStore: true, reason: '关系事件记忆' }
  }

  // 规则4: 情绪层（始终存储，数字伴侣核心记忆）
  if (layer === 'emotion') {
    return { shouldStore: true, reason: '情绪状态记忆' }
  }

  // 规则5: 成长层（未来价值高）
  if (layer === 'growth') {
    return { shouldStore: true, reason: '成长轨迹，未来有价值' }
  }

  // 规则6: 最低重要性阈值
  if (extraction.importance < 0.3) {
    return { shouldStore: false, reason: '重要性过低' }
  }

  return { shouldStore: true, reason: '符合存储条件' }
}

/**
 * 主题检测：从当前消息中推断话题
 */
export function detectTopic(message: string): TopicDetection[] {
  const text = message.toLowerCase()
  const detections: TopicDetection[] = []

  const topicPatterns: { topic: string; pattern: RegExp; confidence: number }[] = [
    { topic: '创业', pattern: /创业|项目|产品|开发|上线|融资|投资|市场|商业模式/, confidence: 0.9 },
    { topic: '工作', pattern: /工作|加班|辞职|面试|入职|老板|同事|开会|deadline/, confidence: 0.9 },
    { topic: '压力', pattern: /压力|累|焦虑|烦|忙|喘不过气|崩溃/, confidence: 0.85 },
    { topic: '生活', pattern: /生活|日常|家|房子|搬家|做饭|装修/, confidence: 0.8 },
    { topic: '情感', pattern: /情感|心情|感觉|孤独|想|在乎|关系|吵架/, confidence: 0.85 },
    { topic: '健康', pattern: /健身|运动|跑步|身体|生病|医院|锻炼/, confidence: 0.9 },
    { topic: '家庭', pattern: /爸|妈|父母|家人|亲戚|回家|家里人/, confidence: 0.85 },
    { topic: '社交', pattern: /朋友|聊天|认识|见面|聚会|社交|联系/, confidence: 0.8 },
    { topic: '学习', pattern: /学习|读书|课程|考试|上课|看书|培训/, confidence: 0.9 },
    { topic: '目标', pattern: /目标|计划|梦想|未来|打算|想要|想成为/, confidence: 0.85 },
    { topic: '金钱', pattern: /钱|存款|工资|收入|花钱|涨价|贵/, confidence: 0.8 },
  ]

  for (const { topic, pattern, confidence } of topicPatterns) {
    if (pattern.test(text)) {
      detections.push({ topic, confidence })
    }
  }

  // 按置信度排序
  return detections.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
}

/**
 * 召回相关记忆（主题感知）
 * @param userId 用户ID
 * @param currentMessage 当前消息，用于主题检测
 * @param limit 返回数量限制
 * @returns 召回结果
 */
export async function recallMemories(
  userId: string,
  currentMessage?: string,
  limit: number = 5
): Promise<MemoryRecallResult> {
  try {
    const allMemories = await loadMemories(userId)

    if (allMemories.length === 0) {
      return { memories: [], memoryContext: '', currentTopic: undefined }
    }

    // ── 主题检测 ──
    let currentTopic: string | undefined
    let topicRelevant: UserMemory[] = []
    let otherRelevant: UserMemory[] = []

    if (currentMessage) {
      const topics = detectTopic(currentMessage)
      currentTopic = topics[0]?.topic

      // 按主题过滤
      for (const mem of allMemories) {
        const hasTopic = topics.some(t => mem.topics?.includes(t.topic))
        if (hasTopic) {
          topicRelevant.push(mem)
        } else {
          otherRelevant.push(mem)
        }
      }
    }

    if (topicRelevant.length === 0) {
      // 没有主题匹配，退回到全量排序
      topicRelevant = allMemories
    }

    // ── 排序 ──
    const sortedTopic = sortMemories(topicRelevant)
    const sortedOther = sortMemories(otherRelevant)

    // ── 混合策略：80% 主题相关 + 20% 其他重要记忆 ──
    const topicCount = Math.min(Math.ceil(limit * 0.8), sortedTopic.length)
    const otherCount = Math.min(limit - topicCount, sortedOther.length)

    const topMemories = [
      ...sortedTopic.slice(0, topicCount),
      ...sortedOther.slice(0, otherCount),
    ]

    // 构建记忆上下文
    const memoryContext = buildMemoryContextV2(topMemories, currentTopic)

    return {
      memories: topMemories,
      memoryContext,
      currentTopic,
    }
  } catch (error) {
    console.error('Memory recall error:', error)
    return { memories: [], memoryContext: '', currentTopic: undefined }
  }
}

/**
 * 排序记忆（4维评分 + 时间）
 */
function sortMemories(memories: UserMemory[]): UserMemory[] {
  return [...memories].sort((a, b) => {
    const scoreA = calcMemoryScore(a.scores)
    const scoreB = calcMemoryScore(b.scores)

    // 按最终分数排序
    if (Math.abs(scoreB - scoreA) > 0.05) {
      return scoreB - scoreA
    }

    // 分数相近时按更新时间排序（新的优先）
    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  })
}

/**
 * 构建记忆上下文文本（V2 叙述性格式）
 * 从机械列表 → 自然叙述
 */
function buildMemoryContextV2(
  memories: UserMemory[],
  currentTopic?: string
): string {
  if (memories.length === 0) {
    return ''
  }

  // ── 按层级分组 ──
  const facts = memories.filter(m => m.layer === 'fact')
  const relationships = memories.filter(m => m.layer === 'relationship')
  const emotions = memories.filter(m => m.layer === 'emotion')
  const growths = memories.filter(m => m.layer === 'growth')

  const lines: string[] = []

  // ── 主题引入 ──
  if (currentTopic) {
    lines.push(`当前对话主题：${currentTopic}`)
    lines.push('')
  }

  lines.push('你记得：')
  lines.push('')

  // ── 基础事实（精简为一句）──
  if (facts.length > 0) {
    const factSummary = facts.map(f => f.value).join('；')
    lines.push(`${factSummary}。`)
    lines.push('')
  }

  // ── 关系记忆（最重要的部分）──
  if (relationships.length > 0) {
    for (const rel of relationships) {
      const date = rel.createdAt
        ? new Date(rel.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
        : '之前'
      lines.push(`${date}，${rel.value}。`)
    }
    lines.push('')
  }

  // ── 情绪记忆 ──
  if (emotions.length > 0) {
    for (const emo of emotions) {
      lines.push(`你记得他曾${emo.value}。`)
    }
    lines.push('')
  }

  // ── 成长记忆 ──
  if (growths.length > 0) {
    for (const gr of growths) {
      lines.push(`他正在${gr.value}。`)
    }
    lines.push('')
  }

  lines.push('请自然地运用这些记忆，不要刻意提及。')
  lines.push('更像是一个记得他过去的老朋友，而不是在调用数据库。')

  return lines.join('\n')
}

/**
 * 获取记忆类型的可读标签（V1兼容）
 */
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    profile: '个人资料',
    preference: '偏好',
    event: '事件',
    emotion: '情绪',
    goal: '目标',
  }
  return labels[type] || type
}

/**
 * 检查记忆是否命中
 */
export function isMemoryHit(memories: UserMemory[]): boolean {
  return memories.length > 0
}

/**
 * V1兼容：旧的列表式上下文构建（保留供迁移使用）
 */
export function buildMemoryContextV1(memories: UserMemory[]): string {
  if (memories.length === 0) return ''

  const lines = ['以下是你关于用户的重要记忆（请自然地运用，不要直接提及）：']
  for (const mem of memories) {
    lines.push(`- [${getTypeLabel(mem.type)}] ${mem.key}: ${mem.value}`)
  }
  return lines.join('\n')
}
