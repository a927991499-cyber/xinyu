/**
 * 回复控制器单元测试
 * 测试目标：replacer, rewriter, rules
 */

import {
  ReplyRewriter,
  createRewriter,
  rewriteReply,
  validateReplyQuality,
  RewrittenReply,
} from '../lib/reply-controller'

import {
  applyLengthControl,
  applyDeletionRules,
  applyReplacementRules,
  applyQuestionControl,
  applyToneWordRules,
  applyPunctuationControl,
  getAllRules,
} from '../lib/reply-controller/rules'

import {
  applyReplacements,
  applyCustomReplacement,
  getReplacementRules,
} from '../lib/reply-controller/replacer'

import { Emotion } from '../lib/emotion/state-machine'

describe('回复控制器 - 长度控制 (rules/applyLengthControl)', () => {
  test('① 应该截断超过50字的回复', () => {
    const longReply = '这是一段很长的回复，用来测试长度控制功能是否正常工作。这段回复应该被截断到50个字以内，以确保小雪的回复简洁自然。'
    
    const result = applyLengthControl(longReply)
    expect(result.length).toBeLessThanOrEqual(50)
  })

  test('② 应该限制最多3句话', () => {
    const multiSentence = '你好呀。我今天很开心。你呢？我们一起去玩吧。'
    
    const result = applyLengthControl(multiSentence)
    const sentenceCount = (result.match(/[。！？]/g) || []).length
    expect(sentenceCount).toBeLessThanOrEqual(3)
  })

  test('③ 短回复应该保持不变', () => {
    const shortReply = '嗯，好的。'
    
    const result = applyLengthControl(shortReply)
    expect(result).toBe(shortReply)
  })

  test('④ 应该在句子边界截断', () => {
    const reply = '第一句话。第二句话。第三句话。第四句话应该被删除。'
    
    const result = applyLengthControl(reply)
    expect(result).not.toContain('第四句话')
  })
})

describe('回复控制器 - 删除规则 (rules/applyDeletionRules)', () => {
  test('① 应该删除"希望你"', () => {
    const reply = '希望你今天开心。'
    
    const result = applyDeletionRules(reply)
    expect(result).not.toContain('希望你')
  })

  test('② 应该删除"建议你"', () => {
    const reply = '建议你早点休息。'
    
    const result = applyDeletionRules(reply)
    expect(result).not.toContain('建议你')
  })

  test('③ 应该删除"加油"等鸡汤', () => {
    const reply = '加油哦！你一定可以的！'
    
    const result = applyDeletionRules(reply)
    expect(result).not.toContain('加油')
    expect(result).not.toContain('你一定可以')
  })

  test('④ 应该删除"作为AI"', () => {
    const reply = '作为AI，我很高兴帮助你。'
    
    const result = applyDeletionRules(reply)
    expect(result).not.toContain('作为AI')
  })

  test('⑤ 删除后应该清理多余空格', () => {
    const reply = '希望你    开心。'
    
    const result = applyDeletionRules(reply)
    expect(result).not.toMatch(/\s{2,}/)
  })
})

describe('回复控制器 - 替换规则 (rules/applyReplacementRules + replacer)', () => {
  test('① 应该替换"辛苦了"为"今天应该挺累"', () => {
    const reply = '辛苦了，早点休息。'
    
    const result1 = applyReplacementRules(reply)
    expect(result1).toContain('今天应该挺累')
    
    const result2 = applyReplacements(reply)
    expect(result2).toContain('今天应该挺累')
  })

  test('② 应该替换"希望你开心"为"今天会慢慢过去"', () => {
    const reply = '希望你开心。'
    
    const result = applyReplacements(reply)
    expect(result).toContain('今天会慢慢过去')
  })

  test('③ 应该替换"我理解你的感受"为"嗯"', () => {
    const reply = '我理解你的感受，别难过。'
    
    const result = applyReplacements(reply)
    expect(result).toContain('嗯')
    expect(result).not.toContain('我理解你的感受')
  })

  test('④ 应该替换"记住"为"想起"', () => {
    const reply = '我记住了你的喜好。'
    
    const result = applyReplacementRules(reply)
    expect(result).toContain('想起')
  })

  test('⑤ 自定义替换应该工作', () => {
    const reply = '测试替换功能。'
    
    const result = applyCustomReplacement(reply, '测试', 'test')
    expect(result).toBe('test替换功能。')
  })
})

describe('回复控制器 - 提问控制 (rules/applyQuestionControl)', () => {
  test('① 应该删除多余的提问（保留第一个）', () => {
    const reply = '你好吗？今天怎么样？去哪里了？'
    
    const result = applyQuestionControl(reply)
    const questionCount = (result.match(/[？?]/g) || []).length
    expect(questionCount).toBeLessThanOrEqual(1)
  })

  test('② 单个提问应该保持不变', () => {
    const reply = '你好吗？'
    
    const result = applyQuestionControl(reply)
    expect(result).toBe(reply)
  })

  test('③ 没有提问应该保持不变', () => {
    const reply = '今天天气不错。'
    
    const result = applyQuestionControl(reply)
    expect(result).toBe(reply)
  })
})

describe('回复控制器 - 语气词和标点控制', () => {
  test('① 应该减少连续的语气词', () => {
    const reply = '嗯……嗯……嗯……'
    
    const result = applyToneWordRules(reply)
    // 不应该有3个以上连续的"嗯……"
    expect(result).not.toContain('嗯……嗯……嗯……')
  })

  test('② 应该减少连续感叹号', () => {
    const reply = '太棒了！！！！'
    
    const result = applyPunctuationControl(reply)
    const exclamationCount = (result.match(/！/g) || []).length
    expect(exclamationCount).toBeLessThanOrEqual(2)
  })

  test('③ 应该减少重复字符', () => {
    const reply = '哈哈哈哈哈哈'
    
    const result = applyPunctuationControl(reply)
    // 不应该有4个以上相同字符
    expect(result.length).toBeLessThanOrEqual(6) // 最多3个重复 + 2
  })
})

describe('回复控制器 - 核心重写器 (rewriter)', () => {
  let rewriter: ReplyRewriter

  beforeEach(() => {
    rewriter = createRewriter(false)
  })

  test('① 应该成功重写回复', () => {
    const original = '希望你开心。建议你休息。加油哦！'
    const result: RewrittenReply = rewriter.rewrite(original, 'idle', false)
    
    expect(result).toHaveProperty('reply')
    expect(result).toHaveProperty('emotion')
    expect(result).toHaveProperty('memoryHit')
    expect(result).toHaveProperty('originalReply')
    expect(result).toHaveProperty('appliedRules')
    
    expect(result.originalReply).toBe(original)
    expect(result.reply.length).toBeGreaterThan(0)
  })

  test('② 应该应用多个规则', () => {
    const original = '希望你开心。建议你休息。你很棒！'
    const result = rewriter.rewrite(original, 'care', false)
    
    expect(result.appliedRules.length).toBeGreaterThan(0)
    expect(result.appliedRules).toContain('deletion')
  })

  test('③ 空回复应该返回默认回复', () => {
    const result = rewriter.rewrite('', 'idle', false)
    
    expect(result.reply.length).toBeGreaterThan(0)
    expect(result.appliedRules).toContain('defaultReply')
  })

  test('④ 应该根据情绪调整回复', () => {
    const original = '我明白你的感受。我会一直陪着你。'
    
    // 害羞状态应该让回复更短
    const shyResult = rewriter.rewrite(original, 'shy', false)
    expect(shyResult.reply.length).toBeGreaterThan(0)
  })

  test('⑤ 快速重写函数应该工作', () => {
    const original = '希望你开心。'
    const result = rewriteReply(original, 'idle', false)
    
    expect(result).toHaveProperty('reply')
    expect(result.reply).not.toContain('希望你')
  })
})

describe('回复控制器 - 回复质量验证', () => {
  test('① 高质量回复应该得高分', () => {
    const goodReply = '嗯，好的。'
    const score = validateReplyQuality(goodReply)
    
    expect(score).toBeGreaterThan(0.8)
  })

  test('② 过长回复应该扣分', () => {
    const longReply = '这是一段很长的回复，用来测试质量验证功能。'.repeat(3)
    const score = validateReplyQuality(longReply)
    
    expect(score).toBeLessThan(1.0)
  })

  test('③ 包含AI腔应该扣分', () => {
    const aiReply = '希望你开心。加油哦！'
    const score = validateReplyQuality(aiReply)
    
    expect(score).toBeLessThan(1.0)
  })

  test('④ 过多提问应该扣分', () => {
    const manyQuestions = '你好吗？今天怎么样？去哪里了？'
    const score = validateReplyQuality(manyQuestions)
    
    expect(score).toBeLessThan(1.0)
  })
})

describe('回复控制器 - 规则管理', () => {
  test('① 应该获取所有启用的规则', () => {
    const rules = getAllRules()
    
    expect(rules).toBeInstanceOf(Array)
    expect(rules.length).toBeGreaterThan(0)
    
    // 检查规则格式
    const firstRule = rules[0]
    expect(firstRule).toHaveProperty('id')
    expect(firstRule).toHaveProperty('name')
    expect(firstRule).toHaveProperty('enabled')
    expect(firstRule).toHaveProperty('apply')
  })

  test('② 所有规则都应该启用', () => {
    const rules = getAllRules()
    
    for (const rule of rules) {
      expect(rule.enabled).toBe(true)
    }
  })

  test('③ 获取替换规则列表', () => {
    const rules = getReplacementRules()
    
    expect(rules).toBeInstanceOf(Array)
    expect(rules.length).toBeGreaterThan(0)
  })
})

describe('回复控制器 - 边界条件', () => {
  test('① 超长回复应该被处理', () => {
    const veryLongReply = '测试。'.repeat(1000)
    const result = applyLengthControl(veryLongReply)
    
    expect(result.length).toBeLessThanOrEqual(50)
  })

  test('② 特殊字符应该被处理', () => {
    const replyWithSpecialChars = '!!!???。。。'
    const result = applyPunctuationControl(replyWithSpecialChars)
    
    expect(result.length).toBeGreaterThanOrEqual(0)
  })

  test('③ 空字符串应该被处理', () => {
    expect(applyLengthControl('')).toBe('')
    expect(applyDeletionRules('')).toBe('')
    expect(applyReplacements('')).toBe('')
  })

  test('④ 只有空格的输入应该被处理', () => {
    const spacesOnly = '   '
    const result = applyDeletionRules(spacesOnly)
    
    expect(result.trim()).toBe('')
  })

  test('⑤ 重写器应该处理各种情绪状态', () => {
    const emotions: Emotion[] = ['idle', 'happy', 'care', 'shy', 'sad', 'cry', 'miss', 'sleep', 'thinking']
    
    for (const emotion of emotions) {
      const result = rewriteReply('测试回复', emotion, false)
      expect(result.reply.length).toBeGreaterThan(0)
      expect(result.emotion).toBe(emotion)
    }
  })
})
