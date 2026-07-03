/**
 * 关系等级计算模块
 * 根据互动历史计算用户与小雪的关系等级
 */

import { RelationshipLevel, RelationshipTier } from './types'

/**
 * 关系计算参数
 */
export interface RelationshipParams {
  userId: string
  firstInteractionDate: Date
  messageCount: number
  voiceCallCount: number
}

/**
 * 计算关系等级
 * 
 * 计算公式：
 * score = 天数 × 0.2 + 消息数 × 0.3 + 语音通话次数 × 0.5
 * 
 * 最高100分
 * 
 * @param params 关系计算参数
 * @returns 关系等级信息
 */
export function calculateRelationshipLevel(
  params: RelationshipParams
): RelationshipLevel {
  const now = new Date()
  const daysCount = calculateDaysBetween(params.firstInteractionDate, now)
  
  // 计算原始分数
  const rawScore = 
    daysCount * 0.2 + 
    params.messageCount * 0.3 + 
    params.voiceCallCount * 0.5

  // 限制在0-100范围内
  const score = Math.min(100, Math.max(0, rawScore))

  // 确定等级
  const level = getRelationshipTier(score)

  return {
    score,
    level,
    daysCount,
    messageCount: params.messageCount,
    voiceCount: params.voiceCallCount
  }
}

/**
 * 计算两个日期之间的天数
 */
function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const utcStart = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const utcEnd = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  return Math.floor((utcEnd - utcStart) / msPerDay)
}

/**
 * 根据分数确定关系等级
 */
function getRelationshipTier(score: number): RelationshipTier {
  if (score <= 20) return 'stranger'
  if (score <= 40) return 'acquaintance'
  if (score <= 60) return 'friend'
  if (score <= 80) return 'close'
  return 'intimate'
}

/**
 * 获取关系等级的描述文本
 */
export function getRelationshipDescription(level: RelationshipTier): string {
  const descriptions: Record<RelationshipTier, string> = {
    'stranger': '你们刚刚认识，还在互相了解中',
    'acquaintance': '你们已经有一些交流，开始熟悉起来',
    'friend': '你们已经是朋友，彼此有了一定的了解',
    'close': '你们关系很亲密，彼此非常了解',
    'intimate': '你们是最亲密的伙伴，无话不谈'
  }
  return descriptions[level]
}

/**
 * 获取关系等级的中文名称
 */
export function getRelationshipName(level: RelationshipTier): string {
  const names: Record<RelationshipTier, string> = {
    'stranger': '陌生人',
    'acquaintance': '相识',
    'friend': '朋友',
    'close': '亲密',
    'intimate': '挚密'
  }
  return names[level]
}

/**
 * 从本地存储（或数据库）加载关系参数
 * TODO: 实现实际的数据加载逻辑
 */
export async function loadRelationshipParams(
  userId: string
): Promise<RelationshipParams> {
  // TODO: 从数据库或文件加载实际的互动数据
  // 目前返回模拟数据
  return {
    userId,
    firstInteractionDate: new Date(), // 应该是实际的首次互动日期
    messageCount: 0,
    voiceCallCount: 0
  }
}

/**
 * 更新互动计数
 * @param userId 用户ID
 * @param type 互动类型
 */
export async function updateInteractionCount(
  userId: string,
  type: 'message' | 'voice'
): Promise<void> {
  // TODO: 实现实际的计数更新逻辑
  // 可以将计数存储在JSON文件中，或数据库中
  console.log(`Updating ${type} count for user ${userId}`)
}
