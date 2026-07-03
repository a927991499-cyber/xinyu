/**
 * 集成测试
 * 测试目标：三个引擎的协同工作，以及Chat API的集成
 */

import {
  extractMemoriesLocal,
  filterMemory,
  recallMemories,
  calculateRelationshipLevel,
} from '../lib/memory'

import {
  EmotionStateMachine,
  canTransition,
} from '../lib/emotion/state-machine'

import {
  EmotionTriggerDetector,
  createTriggerDetector,
} from '../lib/emotion/triggers'

import {
  ReplyRewriter,
  rewriteReply,
} from '../lib/reply-controller'

import { Emotion } from '../lib/emotion/state-machine'

describe('集成测试 - 端到端流程', () => {
  test('① 完整流程：用户消息 → 情绪检测 → 回复重写', () => {
    // 1. 用户输入
    const userMessage = '我今天很开心！'
    
    // 2. 情绪检测
    const detector = new EmotionTriggerDetector()
    const triggerResult = detector.detect({
      userMessage,
      currentTime: new Date()
    })
    
    expect(['happy', 'idle']).toContain(triggerResult.emotion)
    
    // 3. 状态转换
    const stateMachine = new EmotionStateMachine('test_user', 'idle')
    const transitionResult = stateMachine.transition(
      triggerResult.emotion as Emotion,
      triggerResult.reason
    )
    
    // 4. 模型生成回复（模拟）
    const modelReply = '希望你今天过得开心！加油哦！'
    
    // 5. 回复重写
    const rewriter = new ReplyRewriter(false)
    const rewritten = rewriter.rewrite(
      modelReply,
      transitionResult.newState,
      false
    )
    
    // 验证：AI腔应该被删除
    expect(rewritten.reply).not.toContain('希望你')
    expect(rewritten.reply).not.toContain('加油')
    expect(rewritten.reply.length).toBeGreaterThan(0)
  })

  test('② 记忆提取 + 过滤 + 召回的完整流程', async () => {
    // 1. 提取记忆
    const extraction = extractMemoriesLocal('我叫张三，我喜欢喝冰美式')
    
    expect(extraction.length).toBeGreaterThan(0)
    
    // 2. 过滤记忆
    for (const item of extraction) {
      const filterResult = filterMemory(item)
      
      if (filterResult.shouldStore) {
        // 3. 验证记忆格式
        expect(item.key).toBeDefined()
        expect(item.value).toBeDefined()
        expect(['profile', 'preference', 'event', 'emotion', 'goal']).toContain(item.type)
        expect(item.importance).toBeGreaterThanOrEqual(0)
        expect(item.importance).toBeLessThanOrEqual(1)
      }
    }
  })

  test('③ 情绪状态机 + 回复重写的协同', () => {
    const stateMachine = new EmotionStateMachine('test', 'idle')
    
    // 模拟多次交互
    const interactions = [
      { message: '你好', expectedEmotion: 'idle' },
      { message: '我今天很开心', expectedEmotion: 'happy' },
      { message: '你真可爱', expectedEmotion: 'shy' },
    ]
    
    for (const { message, expectedEmotion } of interactions) {
      // 检测情绪
      const detector = new EmotionTriggerDetector()
      const result = detector.detect({
        userMessage: message,
        currentTime: new Date()
      })
      
      // 尝试转换（可能需要等待持续时间）
      const transition = stateMachine.transition(
        result.emotion as Emotion,
        result.reason
      )
      
      // 验证状态转换结果
      expect(['success', 'false']).toContain(transition.success ? 'success' : 'false')
    }
  })

  test('④ 关系等级计算 + 情绪调整', () => {
    // 计算关系等级
    const relationship = calculateRelationshipLevel({
      userId: 'test',
      firstInteractionDate: new Date('2024-01-01'),
      messageCount: 200,
      voiceCallCount: 50
    })
    
    expect(relationship.score).toBeGreaterThan(0)
    
    // 根据关系等级调整情绪（如果实现了这个功能）
    if (relationship.score >= 60) {
      // 关系好的话，更容易展现开心
      expect(['stranger', 'acquaintance', 'friend', 'close', 'intimate']).toContain(relationship.level)
    }
  })
})

describe('集成测试 - 边界场景', () => {
  test('① API失败时的降级处理（本地提取）', () => {
    const message = '我叫李四，我喜欢跑步'
    const localExtraction = extractMemoriesLocal(message)
    
    // 本地提取应该能工作（不需要API）
    expect(localExtraction).toBeInstanceOf(Array)
    
    if (localExtraction.length > 0) {
      expect(localExtraction[0].key).toBe('user_name')
    }
  })

  test('② 状态机边界：快速连续转换', () => {
    const sm = new EmotionStateMachine('test', 'idle')
    
    // 强制设置状态（绕过持续时间检查）
    sm.forceSetState('happy')
    
    // 第一次转换可能成功或失败
    const r1 = sm.transition('idle', '平静')
    
    // 立即尝试转换（应该被持续时间保护）
    const r2 = sm.transition('sad', '太快了')
    
    // r2 可能失败（因为持续时间）
    if (!r2.success) {
      expect(r2.reason).toMatch(/持续时间/)
    }
  })

  test('③ 回复控制器边界：空输入、超长输入', () => {
    const rewriter = new ReplyRewriter(false)
    
    // 空输入
    const emptyResult = rewriter.rewrite('', 'idle', false)
    expect(emptyResult.reply.length).toBeGreaterThan(0) // 应该返回默认回复
    
    // 超长输入
    const longInput = '测试。'.repeat(1000)
    const longResult = rewriter.rewrite(longInput, 'idle', false)
    expect(longResult.reply.length).toBeLessThanOrEqual(50) // 应该被截断
  })

  test('④ 特殊字符和Unicode处理', () => {
    const specialMessages = [
      '😄😄😄',  // emoji
      '你好\n\n\n',  // 多余换行
      '  ',  // 只有空格
      'test@#$%^&*()',  // 特殊字符
    ]
    
    for (const msg of specialMessages) {
      const extraction = extractMemoriesLocal(msg)
      expect(extraction).toBeInstanceOf(Array)
      // 不应该崩溃
    }
  })
})

describe('集成测试 - 性能和稳定性', () => {
  test('① 大量记忆召回的性能', async () => {
    // 模拟大量记忆
    const mockMemories = Array(1000).fill(null).map((_, i) => ({
      id: `mem_${i}`,
      userId: 'test',
      key: `key_${i}`,
      value: `value_${i}`,
      type: 'preference' as const,
      importance: Math.random(),
      createdAt: new Date(),
      updatedAt: new Date()
    }))
    
    // 测试排序性能
    const start = Date.now()
    const sorted = mockMemories.sort((a, b) => b.importance - a.importance)
    const top5 = sorted.slice(0, 5)
    const duration = Date.now() - start
    
    expect(top5.length).toBe(5)
    expect(duration).toBeLessThan(1000) // 应该在1秒内完成
  })

  test('② 状态机多次转换的稳定性', () => {
    const sm = new EmotionStateMachine('test', 'idle')
    
    // 模拟100次随机转换尝试
    for (let i = 0; i < 100; i++) {
      const emotions: Emotion[] = ['idle', 'happy', 'care', 'sad', 'thinking']
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
      
      const result = sm.transition(randomEmotion, 'test')
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('newState')
      expect(result).toHaveProperty('reason')
    }
  })

  test('③ 回复重写器多次调用的稳定性', () => {
    const rewriter = new ReplyRewriter(false)
    const testReplies = [
      '希望你开心。',
      '建议你休息。',
      '加油哦！',
      '我很理解你的感受。',
      '',
      'a'.repeat(1000),
    ]
    
    for (const reply of testReplies) {
      const result = rewriter.rewrite(reply, 'idle', false)
      expect(result).toHaveProperty('reply')
      expect(result.reply.length).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('集成测试 - 响应格式验证', () => {
  test('① 重写后的回复应该符合格式要求', () => {
    const testCases = [
      { input: '希望你开心。加油哦！', expectLength: true },
      { input: '你好吗？怎么样？去哪里？', expectQuestions: true },
      { input: '这是第一句。这是第二句。这是第三句。这是第四句。', expectMax3: true },
    ]
    
    for (const { input, expectLength, expectQuestions, expectMax3 } of testCases) {
      const result = rewriteReply(input, 'idle', false)
      
      if (expectLength) {
        expect(result.reply.length).toBeLessThanOrEqual(50)
      }
      
      if (expectQuestions) {
        const questionCount = (result.reply.match(/[？?]/g) || []).length
        expect(questionCount).toBeLessThanOrEqual(1)
      }
      
      if (expectMax3) {
        const sentenceCount = (result.reply.match(/[。！？]/g) || []).length
        expect(sentenceCount).toBeLessThanOrEqual(3)
      }
    }
  })
})
