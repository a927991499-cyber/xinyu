/**
 * 状态流转规则定义
 * 明确禁止和允许的转换路径
 */

import { Emotion } from './state-machine'

/**
 * 转换规则定义
 */
export interface TransitionRule {
  from: Emotion
  to: Emotion
  allowed: boolean
  reason: string
  requiresIntermediate?: boolean // 是否需要中间状态
  intermediateState?: Emotion
}

/**
 * 获取所有转换规则
 */
export function getTransitionRules(): TransitionRule[] {
  return [
    // 🔥 开发阶段：开放所有转换，让5张心情图自由切换
    // idle → 所有
    { from: 'idle', to: 'happy', allowed: true, reason: '空闲→开心' },
    { from: 'idle', to: 'care', allowed: true, reason: '空闲→关心' },
    { from: 'idle', to: 'shy', allowed: true, reason: '空闲→害羞' },
    { from: 'idle', to: 'sad', allowed: true, reason: '空闲→难过' },
    { from: 'idle', to: 'cry', allowed: true, reason: '空闲→哭泣' },
    { from: 'idle', to: 'miss', allowed: true, reason: '空闲→想念' },
    { from: 'idle', to: 'thinking', allowed: true, reason: '空闲→思考' },
    { from: 'idle', to: 'sleep', allowed: true, reason: '空闲→睡觉' },

    // happy → 所有
    { from: 'happy', to: 'idle', allowed: true, reason: '开心→平静' },
    { from: 'happy', to: 'care', allowed: true, reason: '开心→关心' },
    { from: 'happy', to: 'shy', allowed: true, reason: '开心→害羞' },
    { from: 'happy', to: 'sad', allowed: true, reason: '开心→难过' },
    { from: 'happy', to: 'cry', allowed: true, reason: '开心→哭泣' },
    { from: 'happy', to: 'miss', allowed: true, reason: '开心→想念' },
    { from: 'happy', to: 'thinking', allowed: true, reason: '开心→思考' },
    { from: 'happy', to: 'sleep', allowed: true, reason: '开心→睡觉' },

    // care → 所有
    { from: 'care', to: 'idle', allowed: true, reason: '关心→平静' },
    { from: 'care', to: 'happy', allowed: true, reason: '关心→开心' },
    { from: 'care', to: 'shy', allowed: true, reason: '关心→害羞' },
    { from: 'care', to: 'sad', allowed: true, reason: '关心→难过' },
    { from: 'care', to: 'cry', allowed: true, reason: '关心→哭泣' },
    { from: 'care', to: 'miss', allowed: true, reason: '关心→想念' },
    { from: 'care', to: 'thinking', allowed: true, reason: '关心→思考' },
    { from: 'care', to: 'sleep', allowed: true, reason: '关心→睡觉' },

    // shy → 所有
    { from: 'shy', to: 'idle', allowed: true, reason: '害羞→平静' },
    { from: 'shy', to: 'happy', allowed: true, reason: '害羞→开心' },
    { from: 'shy', to: 'care', allowed: true, reason: '害羞→关心' },
    { from: 'shy', to: 'sad', allowed: true, reason: '害羞→难过' },
    { from: 'shy', to: 'cry', allowed: true, reason: '害羞→哭泣' },
    { from: 'shy', to: 'miss', allowed: true, reason: '害羞→想念' },
    { from: 'shy', to: 'thinking', allowed: true, reason: '害羞→思考' },
    { from: 'shy', to: 'sleep', allowed: true, reason: '害羞→睡觉' },

    // sad → 所有
    { from: 'sad', to: 'idle', allowed: true, reason: '难过→平静' },
    { from: 'sad', to: 'happy', allowed: true, reason: '难过→开心' },
    { from: 'sad', to: 'care', allowed: true, reason: '难过→关心' },
    { from: 'sad', to: 'shy', allowed: true, reason: '难过→害羞' },
    { from: 'sad', to: 'cry', allowed: true, reason: '难过→哭泣' },
    { from: 'sad', to: 'miss', allowed: true, reason: '难过→想念' },
    { from: 'sad', to: 'thinking', allowed: true, reason: '难过→思考' },
    { from: 'sad', to: 'sleep', allowed: true, reason: '难过→睡觉' },

    // cry → 所有
    { from: 'cry', to: 'idle', allowed: true, reason: '哭泣→平静' },
    { from: 'cry', to: 'happy', allowed: true, reason: '哭泣→开心' },
    { from: 'cry', to: 'care', allowed: true, reason: '哭泣→关心' },
    { from: 'cry', to: 'shy', allowed: true, reason: '哭泣→害羞' },
    { from: 'cry', to: 'sad', allowed: true, reason: '哭泣→难过' },
    { from: 'cry', to: 'miss', allowed: true, reason: '哭泣→想念' },
    { from: 'cry', to: 'thinking', allowed: true, reason: '哭泣→思考' },
    { from: 'cry', to: 'sleep', allowed: true, reason: '哭泣→睡觉' },

    // miss → 所有
    { from: 'miss', to: 'idle', allowed: true, reason: '想念→平静' },
    { from: 'miss', to: 'happy', allowed: true, reason: '想念→开心' },
    { from: 'miss', to: 'care', allowed: true, reason: '想念→关心' },
    { from: 'miss', to: 'shy', allowed: true, reason: '想念→害羞' },
    { from: 'miss', to: 'sad', allowed: true, reason: '想念→难过' },
    { from: 'miss', to: 'cry', allowed: true, reason: '想念→哭泣' },
    { from: 'miss', to: 'thinking', allowed: true, reason: '想念→思考' },
    { from: 'miss', to: 'sleep', allowed: true, reason: '想念→睡觉' },

    // sleep → 所有
    { from: 'sleep', to: 'idle', allowed: true, reason: '睡醒→平静' },
    { from: 'sleep', to: 'happy', allowed: true, reason: '睡醒→开心' },
    { from: 'sleep', to: 'care', allowed: true, reason: '睡醒→关心' },
    { from: 'sleep', to: 'shy', allowed: true, reason: '睡醒→害羞' },
    { from: 'sleep', to: 'sad', allowed: true, reason: '睡醒→难过' },
    { from: 'sleep', to: 'cry', allowed: true, reason: '睡醒→哭泣' },
    { from: 'sleep', to: 'miss', allowed: true, reason: '睡醒→想念' },
    { from: 'sleep', to: 'thinking', allowed: true, reason: '睡醒→思考' },

    // thinking → 所有
    { from: 'thinking', to: 'idle', allowed: true, reason: '思考→平静' },
    { from: 'thinking', to: 'happy', allowed: true, reason: '思考→开心' },
    { from: 'thinking', to: 'care', allowed: true, reason: '思考→关心' },
    { from: 'thinking', to: 'shy', allowed: true, reason: '思考→害羞' },
    { from: 'thinking', to: 'sad', allowed: true, reason: '思考→难过' },
    { from: 'thinking', to: 'cry', allowed: true, reason: '思考→哭泣' },
    { from: 'thinking', to: 'miss', allowed: true, reason: '思考→想念' },
    { from: 'thinking', to: 'sleep', allowed: true, reason: '思考→睡觉' },
  ]
}

/**
 * 查找转换规则
 */
export function findTransitionRule(from: Emotion, to: Emotion): TransitionRule | undefined {
  const rules = getTransitionRules()
  return rules.find(r => r.from === from && r.to === to)
}

/**
 * 获取状态转换路径（如果需要中间状态）
 * @param from 起始状态
 * @param to 目标状态
 * @returns 转换路径（包含中间状态）
 */
export function getTransitionPath(from: Emotion, to: Emotion): Emotion[] {
  // 直接转换
  const directRule = findTransitionRule(from, to)
  if (directRule?.allowed) {
    return [from, to]
  }

  // 通过idle过渡
  if (from !== 'idle' && to !== 'idle') {
    const toIdle = findTransitionRule(from, 'idle')
    const fromIdle = findTransitionRule('idle', to)

    if (toIdle?.allowed && fromIdle?.allowed) {
      return [from, 'idle', to]
    }
  }

  // 无有效路径
  return []
}

/**
 * 验证转换是否有效
 */
export function isValidTransition(from: Emotion, to: Emotion): boolean {
  const rule = findTransitionRule(from, to)
  return rule?.allowed || false
}

/**
 * 获取状态转换的建议持续时间
 */
export function getSuggestedDuration(emotion: Emotion): { min: number; max: number } {
  const durations: Record<Emotion, { min: number; max: number }> = {
    'idle': { min: 2 * 60 * 1000, max: 30 * 60 * 1000 },      // 2-30分钟
    'happy': { min: 3 * 60 * 1000, max: 20 * 60 * 1000 },    // 3-20分钟
    'care': { min: 3 * 60 * 1000, max: 25 * 60 * 1000 },     // 3-25分钟
    'shy': { min: 2 * 60 * 1000, max: 15 * 60 * 1000 },      // 2-15分钟
    'sad': { min: 5 * 60 * 1000, max: 30 * 60 * 1000 },      // 5-30分钟
    'cry': { min: 3 * 60 * 1000, max: 20 * 60 * 1000 },      // 3-20分钟
    'miss': { min: 5 * 60 * 1000, max: 30 * 60 * 1000 },     // 5-30分钟
    'sleep': { min: 10 * 60 * 1000, max: 60 * 60 * 1000 },   // 10分钟-1小时
    'thinking': { min: 2 * 60 * 1000, max: 15 * 60 * 1000 }  // 2-15分钟
  }

  return durations[emotion]
}
