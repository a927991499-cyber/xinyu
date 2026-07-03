/**
 * 情绪状态机核心逻辑
 * 保持情绪连续性，禁止瞬间跳变
 */

export type Emotion = 
  | 'idle'      // 空闲/平静
  | 'happy'     // 开心
  | 'care'      // 关心/温柔
  | 'shy'       // 害羞
  | 'sad'       // 难过
  | 'cry'       // 哭泣
  | 'miss'      // 想念
  | 'sleep'     // 睡眠
  | 'thinking'  // 思考
  | 'soft'      // 柔和
  | 'calm'      // 平静
  | 'angry'     // 生气（P0修复：补全缺失类型）
  | 'expect'    // 期待（P0修复：补全缺失类型）
  | 'surprised' // 惊讶（P0修复：补全缺失类型）
  | 'whisper'   // 耳语（P0修复：补全缺失类型）
  | 'gentle'    // 温和（P0修复：补全缺失类型）

export interface EmotionState {
  current: Emotion
  previous: Emotion | null
  startTime: number // 状态开始的时间戳
  minDuration: number // 最短持续时间（ms）
  maxDuration: number // 最长持续时间（ms）
}

export interface EmotionTransitionResult {
  success: boolean
  newState: Emotion
  reason: string
  duration: number // 建议的持续时间（ms）
}

/**
 * 情绪状态机类
 */
export class EmotionStateMachine {
  private state: EmotionState
  private userId: string

  // 默认持续时间配置（ms）
  private static readonly DEFAULT_DURATIONS: Record<Emotion, { min: number; max: number }> = {
    'idle': { min: 5 * 60 * 1000, max: 30 * 60 * 1000 },      // 🔧 修复：2→5分钟（更稳定的平静）
    'happy': { min: 5 * 60 * 1000, max: 20 * 60 * 1000 },    // 🔧 修复：3→5分钟（开心持续更久）
    'care': { min: 5 * 60 * 1000, max: 25 * 60 * 1000 },     // 🔧 修复：3→5分钟（关心持续更久）
    'shy': { min: 3 * 60 * 1000, max: 15 * 60 * 1000 },      // 🔧 修复：2→3分钟（害羞持续更久）
    'sad': { min: 8 * 60 * 1000, max: 30 * 60 * 1000 },      // 🔧 修复：5→8分钟（难过持续更久）
    'cry': { min: 5 * 60 * 1000, max: 20 * 60 * 1000 },      // 🔧 修复：3→5分钟（哭泣持续更久）
    'miss': { min: 8 * 60 * 1000, max: 30 * 60 * 1000 },     // 🔧 修复：5→8分钟（想念持续更久）
    'sleep': { min: 10 * 60 * 1000, max: 60 * 60 * 1000 },   // 10分钟-1小时
    'thinking': { min: 3 * 60 * 1000, max: 15 * 60 * 1000 },  // 🔧 修复：2→3分钟（思考持续更久）
    'soft': { min: 5 * 60 * 1000, max: 20 * 60 * 1000 },     // 柔和持续5-20分钟
    'calm': { min: 5 * 60 * 1000, max: 25 * 60 * 1000 },     // 平静持续5-25分钟
    'angry': { min: 5 * 60 * 1000, max: 20 * 60 * 1000 },    // 生气持续5-20分钟（P0修复）
    'expect': { min: 3 * 60 * 1000, max: 15 * 60 * 1000 },   // 期待持续3-15分钟（P0修复）
    'surprised': { min: 2 * 60 * 1000, max: 10 * 60 * 1000 }, // 惊讶持续2-10分钟（P0修复）
    'whisper': { min: 3 * 60 * 1000, max: 12 * 60 * 1000 },  // 耳语持续3-12分钟（P0修复）
    'gentle': { min: 5 * 60 * 1000, max: 20 * 60 * 1000 },   // 温和持续5-20分钟（P0修复）
  }

  constructor(userId: string, initialState: Emotion = 'idle') {
    this.userId = userId
    this.state = {
      current: initialState,
      previous: null,
      startTime: Date.now(),
      minDuration: EmotionStateMachine.DEFAULT_DURATIONS[initialState].min,
      maxDuration: EmotionStateMachine.DEFAULT_DURATIONS[initialState].max
    }
  }

  /**
   * 尝试转换到新状态
   * @param targetEmotion 目标情绪
   * @param triggerReason 触发原因
   * @returns 转换结果
   */
  transition(targetEmotion: Emotion, triggerReason: string): EmotionTransitionResult {
    const current = this.state.current

    // 检查是否已经是目标状态
    if (current === targetEmotion) {
      return {
        success: true,
        newState: current,
        reason: '已经是该状态',
        duration: this.getRemainingDuration()
      }
    }

    // 检查最短持续时间（避免情绪瞬间跳变）
    const elapsed = Date.now() - this.state.startTime
    if (elapsed < this.state.minDuration && current !== 'idle') {
      // 当前情绪还没到最短持续时间，拒绝切换（除非切换到idle）
      return {
        success: false,
        newState: current,
        reason: `情绪${getEmotionName(current)}持续时间太短（${Math.round(elapsed / 1000)}秒），需再等待${Math.round((this.state.minDuration - elapsed) / 1000)}秒`,
        duration: this.getRemainingDuration()
      }
    }

    // 检查转换是否允许
    const transitionCheck = canTransition(current, targetEmotion)
    if (!transitionCheck.allowed) {
      // 尝试找到中间状态
      const intermediate = findIntermediateState(current, targetEmotion)
      
      if (intermediate) {
        // 先转换到中间状态
        return this.doTransition(intermediate, `通过${intermediate}过渡到${targetEmotion}`)
      }

      return {
        success: false,
        newState: current,
        reason: `禁止直接从${current}转换到${targetEmotion}: ${transitionCheck.reason}`,
        duration: this.getRemainingDuration()
      }
    }

    // 执行转换
    return this.doTransition(targetEmotion, triggerReason)
  }

  /**
   * 执行状态转换
   */
  private doTransition(newEmotion: Emotion, reason: string): EmotionTransitionResult {
    const oldState = this.state.current
    const duration = EmotionStateMachine.DEFAULT_DURATIONS[newEmotion]

    this.state = {
      current: newEmotion,
      previous: oldState,
      startTime: Date.now(),
      minDuration: duration.min,
      maxDuration: duration.max
    }

    return {
      success: true,
      newState: newEmotion,
      reason,
      duration: duration.min // 返回最短持续时间作为建议
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): Emotion {
    // 检查是否超过最大持续时间
    const elapsed = Date.now() - this.state.startTime
    if (elapsed > this.state.maxDuration && this.state.current !== 'idle') {
      // 自动回到idle状态
      this.doTransition('idle', '达到最大持续时间，自动回到空闲状态')
    }

    return this.state.current
  }

  /**
   * 获取剩余持续时间（ms）
   */
  getRemainingDuration(): number {
    const elapsed = Date.now() - this.state.startTime
    return Math.max(0, this.state.minDuration - elapsed)
  }

  /**
   * 获取状态信息
   */
  getStateInfo(): EmotionState & { elapsed: number; remaining: number } {
    const elapsed = Date.now() - this.state.startTime
    return {
      ...this.state,
      elapsed,
      remaining: Math.max(0, this.state.minDuration - elapsed)
    }
  }

  /**
   * 强制设置状态（用于初始化或特殊场景）
   */
  forceSetState(emotion: Emotion): void {
    const duration = EmotionStateMachine.DEFAULT_DURATIONS[emotion]
    this.state = {
      current: emotion,
      previous: this.state.current,
      startTime: Date.now(),
      minDuration: duration.min,
      maxDuration: duration.max
    }
  }

  /**
   * 重置到idle状态
   */
  reset(): void {
    this.forceSetState('idle')
  }
}

/**
 * 检查两个状态之间是否可以转换
 */
export function canTransition(from: Emotion, to: Emotion): {
  allowed: boolean
  reason: string
} {
  // 相同状态总是允许
  if (from === to) {
    return { allowed: true, reason: '状态相同' }
  }

  // 🔧 2026-06-18 P0修复：收紧情绪转换规则
  // 核心原则：极端情绪（cry/angry）→ 平缓情绪（sad/soft/calm）→ 普通情绪（happy/idle）
  // 禁止直接 cry→happy、happy→cry 等极端跳跃
  const allowedTransitions: Record<Emotion, Emotion[]> = {
    'idle':    ['happy', 'care', 'shy', 'sad', 'miss', 'thinking', 'sleep', 'soft', 'calm', 'angry', 'expect', 'gentle'],
    // 开心→允许变平静、关心、害羞，但禁止直接跳到哭泣/生气/难过
    'happy':   ['idle', 'care', 'shy', 'thinking', 'calm', 'expect', 'gentle', 'soft'],
    // 关心→允许向任何方向（关心是过渡情绪）
    'care':    ['idle', 'happy', 'shy', 'sad', 'cry', 'miss', 'thinking', 'soft', 'calm', 'gentle'],
    // 害羞→渐进变化
    'shy':     ['idle', 'happy', 'care', 'sad', 'thinking', 'soft', 'calm', 'gentle'],
    // 难过→可以变关心/哭泣/平静，但禁止直接跳开心
    'sad':     ['idle', 'care', 'cry', 'miss', 'thinking', 'soft', 'calm', 'angry'],
    // 哭泣→只能变难过/关心/平静/睡眠，禁止直接跳开心
    'cry':     ['sad', 'care', 'soft', 'calm', 'sleep', 'thinking'],
    // 想念→渐进变化
    'miss':    ['idle', 'care', 'sad', 'soft', 'calm', 'thinking', 'gentle'],
    'sleep':   ['idle', 'calm', 'soft', 'care'],
    'thinking': ['idle', 'care', 'calm', 'shy', 'soft', 'gentle'],
    'soft':    ['idle', 'happy', 'care', 'shy', 'sad', 'cry', 'miss', 'thinking', 'calm', 'gentle'],
    'calm':    ['idle', 'happy', 'care', 'shy', 'sad', 'thinking', 'sleep', 'soft', 'gentle', 'expect'],
    'angry':   ['idle', 'calm', 'soft', 'sad', 'thinking'],  // 生气→只能向平静方向
    'expect':  ['happy', 'idle', 'calm', 'care', 'gentle'],
    'surprised': ['happy', 'idle', 'calm', 'care', 'thinking', 'expect'],
    'whisper': ['care', 'soft', 'calm', 'shy', 'thinking', 'gentle'],
    'gentle':  ['care', 'soft', 'calm', 'happy', 'idle', 'expect'],
  }

  const allowed = allowedTransitions[from]?.includes(to) || false

  return {
    allowed,
    reason: allowed 
      ? '允许转换' 
      : `不允许从${from}直接转换到${to}`
  }
}

/**
 * 寻找两个状态之间的中间状态（最短路径）
 * P0修复：实现真正的路径查找，而非只返回 idle
 */
function findIntermediateState(from: Emotion, to: Emotion): Emotion | null {
  // 默认通过 idle 过渡（最安全的中间状态）
  if (from !== 'idle' && to !== 'idle' && canTransition(from, 'idle').allowed && canTransition('idle', to).allowed) {
    return 'idle'
  }

  // 极端情绪过渡链：
  // cry → sad → soft/calm → idle → happy
  if (from === 'cry' && canTransition(from, 'sad').allowed && canTransition('sad', to).allowed) {
    return 'sad'
  }
  if (from === 'cry' && canTransition(from, 'care').allowed && canTransition('care', to).allowed) {
    return 'care'
  }
  
  // angry → calm → idle → ...
  if (from === 'angry' && canTransition(from, 'calm').allowed && canTransition('calm', to).allowed) {
    return 'calm'
  }

  // sad → care → happy
  if (from === 'sad' && canTransition(from, 'care').allowed && canTransition('care', to).allowed) {
    return 'care'
  }

  return null
}

/**
 * 获取情绪的中文描述
 */
export function getEmotionName(emotion: Emotion): string {
  const names: Record<Emotion, string> = {
    'idle': '平静',
    'happy': '开心',
    'care': '关心',
    'shy': '害羞',
    'sad': '难过',
    'cry': '哭泣',
    'miss': '想念',
    'sleep': '睡眠',
    'thinking': '思考',
    'soft': '柔和',
    'calm': '平静',
    'angry': '生气',
    'expect': '期待',
    'surprised': '惊讶',
    'whisper': '耳语',
    'gentle': '温和',
  }
  return names[emotion] || emotion
}

/**
 * 获取情绪的表情符号
 */
export function getEmotionEmoji(emotion: Emotion): string {
  const emojis: Record<Emotion, string> = {
    'idle': '😊',
    'happy': '😄',
    'care': '🤗',
    'shy': '😳',
    'sad': '😢',
    'cry': '😭',
    'miss': '💭',
    'sleep': '😴',
    'thinking': '🤔',
    'soft': '🥰',
    'calm': '😌',
    'angry': '😤',
    'expect': '🤩',
    'surprised': '😲',
    'whisper': '🤫',
    'gentle': '🌸',
  }
  return emojis[emotion] || '😊'
}
