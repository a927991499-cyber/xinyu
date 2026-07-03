/**
 * 回复重写核心模块
 * 将模型的AI腔回复重写为更自然的人话
 */

import { Emotion } from '../emotion/state-machine'
import {
  applyLengthControl,
  applyDeletionRules,
  applyReplacementRules,
  applyQuestionControl,
  applyToneWordRules,
  applyPunctuationControl
} from './rules'
import { applyReplacements } from './replacer'

/**
 * 重写后的回复
 */
export interface RewrittenReply {
  reply: string
  emotion: Emotion
  memoryHit: boolean
  originalReply: string // 保留原始回复用于调试
  appliedRules: string[] // 应用了的规则
}

/**
 * 回复重写器类
 */
export class ReplyRewriter {
  private enableLogs: boolean

  constructor(enableLogs: boolean = false) {
    this.enableLogs = enableLogs
  }

  /**
   * 重写回复
   * @param originalReply 原始模型回复
   * @param currentEmotion 当前情绪状态
   * @param memoryHit 是否命中记忆
   * @returns 重写后的回复
   */
  rewrite(
    originalReply: string,
    currentEmotion: Emotion,
    memoryHit: boolean = false
  ): RewrittenReply {
    let reply = originalReply
    const appliedRules: string[] = []

    // 1. 删除AI腔表达
    const afterDeletion = applyDeletionRules(reply)
    if (afterDeletion !== reply) {
      appliedRules.push('deletion')
      reply = afterDeletion
    }

    // 2. 应用替换规则
    const afterReplacement = applyReplacementRules(reply)
    if (afterReplacement !== reply) {
      appliedRules.push('replacement')
      reply = afterReplacement
    }

    // 3. 应用自定义替换
    const afterCustomReplacement = applyReplacements(reply)
    if (afterCustomReplacement !== reply) {
      appliedRules.push('customReplacement')
      reply = afterCustomReplacement
    }

    // 4. 长度控制
    const afterLengthControl = applyLengthControl(reply)
    if (afterLengthControl !== reply) {
      appliedRules.push('lengthControl')
      reply = afterLengthControl
    }

    // 5. 提问控制
    const afterQuestionControl = applyQuestionControl(reply)
    if (afterQuestionControl !== reply) {
      appliedRules.push('questionControl')
      reply = afterQuestionControl
    }

    // 6. 语气词调整
    const afterToneAdjustment = applyToneWordRules(reply)
    if (afterToneAdjustment !== reply) {
      appliedRules.push('toneAdjustment')
      reply = afterToneAdjustment
    }

    // 7. 标点控制
    const afterPunctuationControl = applyPunctuationControl(reply)
    if (afterPunctuationControl !== reply) {
      appliedRules.push('punctuationControl')
      reply = afterPunctuationControl
    }

    // 8. 根据情绪状态做最后调整
    reply = this.adjustByEmotion(reply, currentEmotion)

    // 如果回复为空，返回默认值
    if (!reply || reply.trim().length === 0) {
      reply = this.getDefaultReply(currentEmotion)
      appliedRules.push('defaultReply')
    }

    if (this.enableLogs) {
      console.log('Reply rewriting:', {
        original: originalReply,
        rewritten: reply,
        appliedRules
      })
    }

    return {
      reply,
      emotion: currentEmotion,
      memoryHit,
      originalReply,
      appliedRules
    }
  }

  /**
   * 根据情绪状态调整回复
   */
  private adjustByEmotion(reply: string, emotion: Emotion): string {
    switch (emotion) {
      case 'shy':
        // 害羞时：更短、更含蓄
        if (reply.length > 30) {
          reply = reply.substring(0, 30) + '……'
        }
        break

      case 'sad':
        // 难过时：更温柔、更短
        reply = reply.replace(/！/g, '。')
        break

      case 'care':
        // 关心时：温柔但不过度
        break

      case 'sleep':
        // 睡眠时：简短
        reply = reply.split('。')[0] + '。'
        break

      default:
        break
    }

    return reply
  }

  /**
   * 获取默认回复（当重写后为空时）
   */
  private getDefaultReply(emotion: Emotion): string {
    const defaults: Partial<Record<Emotion, string>> = {
      'idle': '嗯。',
      'happy': '嗯嗯。',
      'care': '怎么了？',
      'shy': '……',
      'sad': '嗯……',
      'miss': '在想你。',
      'thinking': '让我想想。'
    }

    return defaults[emotion] || '嗯。'
  }
}

/**
 * 创建默认重写器实例
 */
export function createRewriter(enableLogs: boolean = false): ReplyRewriter {
  return new ReplyRewriter(enableLogs)
}

/**
 * 快速重写回复（函数式接口）
 */
export function rewriteReply(
  originalReply: string,
  currentEmotion: Emotion,
  memoryHit: boolean = false
): RewrittenReply {
  const rewriter = createRewriter()
  return rewriter.rewrite(originalReply, currentEmotion, memoryHit)
}

/**
 * 验证回复质量
 * @returns 质量评分 0-1
 */
export function validateReplyQuality(reply: string): number {
  let score = 1.0

  // 长度检查（超过50字扣分）
  if (reply.length > 50) {
    score -= 0.2
  }

  // 句子数量检查（超过3句扣分）
  const sentenceCount = (reply.match(/[。！？\.\!\?]/g) || []).length
  if (sentenceCount > 3) {
    score -= 0.2
  }

  // 提问数量检查（超过1个扣分）
  const questionCount = (reply.match(/[？?]/g) || []).length
  if (questionCount > 1) {
    score -= 0.2
  }

  // AI腔检测（包含禁止词扣分）
  const forbiddenPatterns = [
    /希望你/g,
    /建议你/g,
    /作为AI/g,
    /加油/g
  ]

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(reply)) {
      score -= 0.15
    }
  }

  return Math.max(0, score)
}
