/**
 * Layer 2: 数字生命大脑（State Engine）
 *
 * 小雪的数字大脑核心 —— 维护持续的内部状态，
 * 决定每轮回复的语气、风格和行为。
 *
 * 架构位置：全链路第2层
 * ① 情绪识别 → ② 本层 → ③ 文本导演 → ④ TTS
 *
 * 核心机制：
 * - 状态机：active / calm / quiet / distracted / reflective
 * - 注意力衰减：时间越长 → 回答越短
 * - 情绪残留：上一条情绪 → 影响下一条语气
 * - 关系等级：互动次数 ↑ → 更自然、更随意
 */

import { Emotion, EmotionStateMachine } from '@/lib/emotion/state-machine'
import type { Layer1Output } from '@/lib/layer1-classify'

// ═══════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════

/** 数字大脑的内部状态模式 */
export type BrainMode = 'active' | 'calm' | 'quiet' | 'distracted' | 'reflective'

/** 大脑内部状态（持久化数据） */
export interface BrainState {
  /** 当前状态模式 */
  mode: BrainMode
  /** 注意力等级 0~1（时间越久越低） */
  attention: number
  /** 情绪残留：上次输出情绪的余波 */
  emotionalResidue: string
  /** 情绪残留强度 0~1 */
  residueIntensity: number
  /** 关系等级 1~10 */
  relationshipLevel: number
  /** 关系信任度 0~1 */
  trust: number
  /** 关系熟悉度 0~1 */
  familiarity: number
  /** 上次交互时间戳 */
  lastInteractionAt: number
  /** 总交互次数 */
  interactionCount: number
}

/** 大脑输出 —— 传给 Layer 3（文本导演）的指令 */
export interface BrainOutput {
  /** 目标情绪（CosyVoice emotion 参数） */
  targetEmotion: string
  /** 回复风格 */
  responseStyle: 'very_short' | 'short_fragment' | 'normal' | 'warm'
  /** 注意力状态描述 */
  attentionState: 'focused' | 'normal' | 'slightly_distracted' | 'distracted'
  /** 记忆提示 */
  memoryHint: string
  /** 关系模式 */
  relationshipMode: 'distant' | 'medium' | 'close'
  /** 是否允许跳话题 */
  allowTopicJump: boolean
  /** 建议回复长度（字数） */
  suggestedLength: number
}

// ═══════════════════════════════════════════════════════
// 状态机
// ═══════════════════════════════════════════════════════

export class DigitalBrain {
  private state: BrainState
  private userId: string
  /** P0修复：情绪状态机实例（真正检查 minDuration + canTransition） */
  public emotionState: EmotionStateMachine

  /** 模式转换概率表 */
  private static readonly MODE_TRANSITIONS: Record<BrainMode, Partial<Record<BrainMode, number>>> = {
    active:      { active: 0.4, calm: 0.4, quiet: 0.1, reflective: 0.1 },
    calm:        { active: 0.2, calm: 0.5, quiet: 0.2, reflective: 0.1 },
    quiet:       { calm: 0.4, quiet: 0.4, distracted: 0.1, reflective: 0.1 },
    distracted:  { calm: 0.3, quiet: 0.3, distracted: 0.3, active: 0.1 },
    reflective:  { calm: 0.4, quiet: 0.3, reflective: 0.2, active: 0.1 },
  }

  constructor(userId: string) {
    this.userId = userId
    this.emotionState = new EmotionStateMachine(userId)  // P0修复：创建情绪状态机实例
    this.state = {
      mode: 'calm',
      attention: 0.7,
      emotionalResidue: 'soft',
      residueIntensity: 0.3,
      relationshipLevel: 1,
      trust: 0.1,
      familiarity: 0.1,
      lastInteractionAt: Date.now(),
      interactionCount: 0,
    }
  }

  /** 获取当前状态快照 */
  getState(): Readonly<BrainState> {
    return { ...this.state }
  }

  /**
   * 处理一轮用户输入，更新大脑状态并返回输出指令
   * 这是 Layer 2 的主入口
   */
  process(layer1: Layer1Output): BrainOutput {
    // 1. 注意力衰减
    this.decayAttention()

    // 2. 状态模式转换
    this.transitionMode(layer1)

    // 3. 情绪残留更新
    this.updateResidue(layer1.emotion)

    // 4. 关系更新
    this.updateRelationship(layer1)

    // 5. 记录交互
    this.state.lastInteractionAt = Date.now()
    this.state.interactionCount++

    // 6. 生成输出指令
    return this.generateOutput(layer1)
  }

  // ═══════════════════════════════════════════
  // 内部机制
  // ═══════════════════════════════════════════

  /**
   * 注意力衰减：距上次交互越久，注意力越低
   */
  private decayAttention(): void {
    const elapsed = Date.now() - this.state.lastInteractionAt
    const hoursSinceLast = elapsed / (1000 * 60 * 60)

    // 每小时衰减 0.05，下限 0.3
    const decay = Math.min(hoursSinceLast * 0.05, 0.5)
    this.state.attention = Math.max(0.3, this.state.attention - decay)
  }

  /**
   * 状态模式转换：根据用户情绪和当前注意力决定新模式
   */
  private transitionMode(layer1: Layer1Output): void {
    const table = DigitalBrain.MODE_TRANSITIONS[this.state.mode]
    if (!table) { this.state.mode = 'calm'; return }

    // 用户情绪对模式的修正
    const modifier: Partial<Record<BrainMode, number>> = { ...table }

    // 用户情绪强烈 → 偏向 active
    if (layer1.urgency === 'high' || layer1.confidence > 0.8) {
      modifier.active = (modifier.active || 0) + 0.3
      modifier.quiet = (modifier.quiet || 0) - 0.1
      modifier.distracted = (modifier.distracted || 0) - 0.1
    }

    // 用户说累/不开心 → 偏向 calm/quiet（不喧宾夺主）
    if (layer1.emotion === 'sad' || layer1.emotion === 'care') {
      modifier.calm = (modifier.calm || 0) + 0.2
      modifier.active = (modifier.active || 0) - 0.15
    }

    // 用户开心 → 偏向 active
    if (layer1.emotion === 'happy') {
      modifier.active = (modifier.active || 0) + 0.2
      modifier.reflective = (modifier.reflective || 0) - 0.05
    }

    // 注意力很低 → 偏向 distracted
    if (this.state.attention < 0.4) {
      modifier.distracted = (modifier.distracted || 0) + 0.25
    }

    // 加权随机选择
    const entries = Object.entries(modifier)
      .filter(([, p]) => (p ?? 0) > 0)
      .map(([mode, prob]) => ({ mode: mode as BrainMode, prob: prob ?? 0 }))

    const total = entries.reduce((sum, e) => sum + e.prob, 0)
    let r = Math.random() * total
    for (const entry of entries) {
      r -= entry.prob
      if (r <= 0) {
        this.state.mode = entry.mode
        return
      }
    }
  }

  /**
   * 情绪残留：上一条情绪衰减后混入当前
   */
  private updateResidue(emotion: Emotion): void {
    // 衰减当前残留强度
    this.state.residueIntensity *= 0.6

    // 30% 概率更新为新情绪的残留
    if (Math.random() < 0.3) {
      const residueMap: Record<string, string> = {
        happy: 'warm', sad: 'soft', care: 'gentle',
        miss: 'soft', shy: 'soft', cry: 'soft',
        thinking: 'calm', idle: 'calm', sleep: 'calm',
      }
      this.state.emotionalResidue = residueMap[emotion] || 'calm'
      this.state.residueIntensity = Math.min(1, this.state.residueIntensity + 0.3)
    }
  }

  /**
   * 关系更新：互动次数增加，关系自然增长
   */
  private updateRelationship(layer1: Layer1Output): void {
    // 基础增长：每次互动 +0.02
    this.state.familiarity = Math.min(1, this.state.familiarity + 0.02)
    this.state.trust = Math.min(1, this.state.trust + 0.01)

    // 情绪共鸣加速信任
    if (layer1.emotion === 'sad' || layer1.emotion === 'care') {
      this.state.trust += 0.01
    }

    // 计算关系等级 1-10
    const raw = (this.state.familiarity * 0.4 + this.state.trust * 0.4 +
                 Math.min(this.state.interactionCount / 200, 1) * 0.2) * 10
    this.state.relationshipLevel = Math.round(Math.max(1, Math.min(10, raw)))
  }

  /**
   * 生成输出指令（传给 Layer 3）
   */
  private generateOutput(layer1: Layer1Output): BrainOutput {
    const mode = this.state.mode

    // ── 目标情绪映射（P0修复：补全所有缺失的情绪）──
    const emotionMap: Record<string, string> = {
      happy: 'happy', sad: 'sad', care: 'care',
      miss: 'miss', shy: 'shy', cry: 'cry',
      thinking: 'thinking', idle: 'calm', sleep: 'sleep',
      angry: 'angry', expect: 'expect', surprised: 'surprised',
      whisper: 'whisper', soft: 'soft', gentle: 'gentle',
    }
    const baseEmotion = emotionMap[layer1.emotion] || 'calm'
    
    // P0修复：调用情绪状态机的 transition() 方法
    // 检查 minDuration + canTransition，确保情绪不会瞬间跳变
    const transitionResult = this.emotionState.transition(
      baseEmotion as Emotion, 
      `用户情绪: ${layer1.emotion}`
    )
    const targetEmotion = transitionResult.success 
      ? transitionResult.newState 
      : this.emotionState.getCurrentState()
    
    if (transitionResult.success) {
      console.log(`[StateMachine] ✅ 情绪切换: ${layer1.emotion} → ${targetEmotion} (${transitionResult.reason})`)
    } else {
      console.log(`[StateMachine] ⏳ 保持情绪: ${targetEmotion} (拒绝: ${transitionResult.reason})`)
    }

    // ── 回复风格 ──
    const styleByMode: Record<BrainMode, BrainOutput['responseStyle']> = {
      active: 'normal',
      calm: 'short_fragment',
      quiet: 'very_short',
      distracted: 'very_short',
      reflective: 'warm',
    }

    // ── 注意力状态 ──
    const attentionByLevel = (): BrainOutput['attentionState'] => {
      if (this.state.attention > 0.7) return 'focused'
      if (this.state.attention > 0.5) return 'normal'
      if (this.state.attention > 0.3) return 'slightly_distracted'
      return 'distracted'
    }

    // ── 关系模式 ──
    const relationshipByLevel = (): BrainOutput['relationshipMode'] => {
      if (this.state.relationshipLevel >= 7) return 'close'
      if (this.state.relationshipLevel >= 4) return 'medium'
      return 'distant'
    }

    // ── 建议回复长度（字数上限，非硬限制）──
    const lengthByMode: Record<BrainMode, number> = {
      active: 120,
      calm: 80,
      quiet: 50,
      distracted: 30,
      reflective: 100,
    }

    // ── 记忆提示 ──
    const hints: string[] = []
    if (this.state.interactionCount < 5) hints.push('user_new')
    if (this.state.attention < 0.4) hints.push('attention_low')
    if (this.state.residueIntensity > 0.6) hints.push(`emotional_${this.state.emotionalResidue}`)

    return {
      targetEmotion,
      responseStyle: styleByMode[mode],
      attentionState: attentionByLevel(),
      memoryHint: hints.join(',') || 'none',
      relationshipMode: relationshipByLevel(),
      allowTopicJump: mode === 'distracted' || this.state.relationshipLevel >= 7,
      suggestedLength: lengthByMode[mode],
    }
  }

  // ═══════════════════════════════════════════
  // 公开方法
  // ═══════════════════════════════════════════

  /** 恢复已保存的状态（从内存/数据库加载） */
  restore(saved: Partial<BrainState>): void {
    Object.assign(this.state, saved)
  }

  /** 导出当前状态（用于持久化） */
  export(): BrainState {
    return { ...this.state }
  }

  /** 手动设置关系等级（用于调试或特殊场景） */
  setRelationshipLevel(level: number): void {
    this.state.relationshipLevel = Math.max(1, Math.min(10, Math.round(level)))
    this.state.familiarity = level / 10
    this.state.trust = level / 10
  }
}

// ═══════════════════════════════════════════════════════
// 用户大脑实例管理
// ═══════════════════════════════════════════════════════

const brainInstances = new Map<string, DigitalBrain>()

/**
 * 获取或创建用户的大脑实例
 */
export function getBrain(userId: string): DigitalBrain {
  if (!brainInstances.has(userId)) {
    brainInstances.set(userId, new DigitalBrain(userId))
  }
  return brainInstances.get(userId)!
}

/**
 * 处理一轮消息（Layer 1 输出 → Layer 2 输出）
 * 便捷函数，串联 classify + process
 */
export function processBrain(
  userId: string,
  layer1: Layer1Output
): { brain: DigitalBrain; output: BrainOutput } {
  const brain = getBrain(userId)
  const output = brain.process(layer1)
  return { brain, output }
}
