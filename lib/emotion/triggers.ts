/**
 * 情绪触发规则
 * 根据用户消息和上下文判断应该触发哪种情绪
 */

import { Emotion } from './state-machine'

export interface TriggerContext {
  userMessage: string
  currentTime: Date
  lastInteractionTime?: Date
  relationshipLevel?: number // 0-100
  recentEmotions?: Emotion[] // 最近的情绪历史
}

export interface TriggerResult {
  emotion: Emotion
  confidence: number // 0-1，触发置信度
  reason: string
}

/**
 * 情绪触发检测器
 */
export class EmotionTriggerDetector {
  /**
   * 检测应该触发的情绪
   * @param context 触发上下文
   * @returns 触发结果
   */
  detect(context: TriggerContext): TriggerResult {
    const { userMessage, currentTime, lastInteractionTime } = context
    const lowerMessage = userMessage.toLowerCase()

    // 1. 检查时间触发（深夜 → sleep）
    const hour = currentTime.getHours()
    if (hour >= 23 || hour < 6) {
      return {
        emotion: 'sleep',
        confidence: 0.8,
        reason: '深夜时间，建议睡眠状态'
      }
    }

    // 2. 检查长时间未上线（→ miss）
    if (lastInteractionTime) {
      const hoursSinceLastInteraction = 
        (currentTime.getTime() - lastInteractionTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastInteraction > 24) {
        return {
          emotion: 'miss',
          confidence: 0.7,
          reason: `用户${Math.floor(hoursSinceLastInteraction)}小时未上线`
        }
      }
    }

    // 3. 检测用户情绪关键词
    const emotionTriggers = this.detectEmotionFromMessage(lowerMessage)
    if (emotionTriggers) {
      return emotionTriggers
    }

    // 4. 默认：保持idle或根据关系等级调整
    return {
      emotion: 'idle',
      confidence: 0.5,
      reason: '默认空闲状态'
    }
  }

  /**
   * 从用户消息中检测情绪触发
   */
  private detectEmotionFromMessage(message: string): TriggerResult | null {
    // 开心相关（开心必须在不开心之前检查，或使用否定感知）
    const happyKeywords = ['开心', '高兴', '快乐', '哈哈', '嘻嘻', '喜欢', '爱', '棒', '好']
    for (const keyword of happyKeywords) {
      // 简单否定感知：如果消息包含"不开心"，不匹配"开心"
      if (message.includes('不' + keyword) || message.includes('没' + keyword)) {
        continue
      }
      if (message.includes(keyword)) {
        return {
          emotion: 'happy',
          confidence: 0.7,
          reason: `检测到开心关键词：${keyword}`
        }
      }
    }

    // 哭泣相关（哭关键词优先 → cry）
    const cryKeywords = ['哭', '哭泣', '流泪', '哭出来', '呜呜']
    for (const keyword of cryKeywords) {
      if (message.includes(keyword)) {
        return {
          emotion: 'cry',
          confidence: 0.85,
          reason: `检测到哭泣关键词：${keyword}`
        }
      }
    }

    // 生气相关 → idle（因系统无 angry，用 生气图/idle 展示）
    const angryKeywords = ['生气', '愤怒', '发火', '气死', '发怒', '气', '讨厌', '烦死了']
    for (const keyword of angryKeywords) {
      if (message.includes(keyword)) {
        return {
          emotion: 'idle',
          confidence: 0.75,
          reason: `检测到生气关键词：${keyword}`
        }
      }
    }

    // 委屈/难过相关 → sad（显示委屈图）
    const sadKeywords = ['委屈', '难过', '伤心', '不开心', '不高兴', '失落', '沮丧']
    for (const keyword of sadKeywords) {
      if (message.includes(keyword)) {
        return {
          emotion: 'sad',
          confidence: 0.8,
          reason: `检测到难过关键词：${keyword}`
        }
      }
    }

    // 累/疲惫相关 → care
    const tiredKeywords = ['累', '疲惫', '困', '乏', '辛苦']
    for (const keyword of tiredKeywords) {
      if (message.includes(keyword)) {
        return {
          emotion: 'care',
          confidence: 0.7,
          reason: `检测到疲惫关键词：${keyword}`
        }
      }
    }

    // 想念相关
    const missKeywords = ['想你', '想念', '不在', '离开']
    for (const keyword of missKeywords) {
      if (message.includes(keyword)) {
        return {
          emotion: 'miss',
          confidence: 0.8,
          reason: `检测到想念关键词：${keyword}`
        }
      }
    }

    // 撒娇/害羞相关
    const shyKeywords = ['撒娇', '可爱', '漂亮', '美', '乖', '懂事', '抱抱', '贴贴']
    for (const keyword of shyKeywords) {
      if (message.includes(keyword)) {
        return {
          emotion: 'shy',
          confidence: 0.7,
          reason: `检测到撒娇/夸奖关键词：${keyword}`
        }
      }
    }

    return null
  }

  /**
   * 根据关系等级调整情绪
   */
  adjustByRelationship(emotion: Emotion, relationshipLevel: number): Emotion {
    // 关系越好，越容易展现开心和关心
    if (relationshipLevel >= 60) {
      if (emotion === 'idle') {
        // 有一定概率切换到happy
        if (Math.random() < 0.3) {
          return 'happy'
        }
      }
    }

    return emotion
  }
}

/**
 * 创建默认触发器检测器实例
 */
export function createTriggerDetector(): EmotionTriggerDetector {
  return new EmotionTriggerDetector()
}

/**
 * 快速检测情绪（函数式接口）
 */
export function detectEmotion(context: TriggerContext): TriggerResult {
  const detector = createTriggerDetector()
  return detector.detect(context)
}

/**
 * 🔥 从 AI 的回复文字中检测 AI 当前的心情
 * 这才是头像切换的正确依据——AI 说了什么→AI 什么心情
 *
 * @param aiReply - AI 的原始回复文字
 * @param currentEmotion - 当前情绪状态，检测不明确时保持上一个状态
 * @param conversationHistory - 最近3-5轮对话历史，用于上下文情绪判断
 */
export function detectAIEmotion(
  aiReply: string, 
  currentEmotion?: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>
): TriggerResult {
  const msg = aiReply.toLowerCase()

  // ========= 辅助：否定感知，防止"不开心"误匹配"开心" =========
  function hasKeyword(keyword: string): boolean {
    if (!msg.includes(keyword)) return false
    const negations = ['不', '没', '别', '非', '别']
    for (const neg of negations) {
      if (msg.includes(neg + keyword)) return false
    }
    return true
  }

  // ========= 第0步：根据对话上下文判断情绪稳定性 =========
  let contextEmotion: Emotion | null = null
  let contextConfidence = 0.5
  
  if (conversationHistory && conversationHistory.length > 0) {
    // 分析最近3轮对话，判断情绪是否应该保持稳定
    const recentMessages = conversationHistory.slice(-3) // 最近3轮
    const userMessages = recentMessages.filter(m => m.role === 'user').map(m => m.content.toLowerCase())
    
    // 如果用户在连续讨论伤心话题，AI应该保持温柔/关心的情绪
    const sadTopicCount = userMessages.filter(m => 
      m.includes('伤心') || m.includes('难过') || m.includes('委屈') || m.includes('哭')
    ).length
    
    const happyTopicCount = userMessages.filter(m => 
      m.includes('开心') || m.includes('高兴') || m.includes('快乐') || m.includes('哈哈')
    ).length
    
    // 如果最近用户一直在说伤心话题，AI情绪应该偏向sad/care
    if (sadTopicCount >= 2) {
      contextEmotion = 'care' // 关心/温柔，而不是sad
      contextConfidence = 0.7
    } else if (happyTopicCount >= 2) {
      contextEmotion = 'happy'
      contextConfidence = 0.7
    }
    
    console.log(`[Emotion] 上下文分析: sadTopic=${sadTopicCount}, happyTopic=${happyTopicCount} → contextEmotion=${contextEmotion}`)
  }

  // ========= 第1步：强信号优先（哭泣、委屈—— unambiguous） =========
  const cryPatterns = ['呜呜', '哭了', '哭出来', '流泪', '泪水', '眼泪', '擦掉眼泪', '擦去泪水']
  for (const p of cryPatterns) {
    if (msg.includes(p)) {
      return { emotion: 'cry', confidence: 0.9, reason: `AI回复检测到哭泣：${p}` }
    }
  }

  const sadPatterns = ['委屈', '难过', '伤心', '对不起', '抱歉', '不是故意']
  for (const p of sadPatterns) {
    if (hasKeyword(p)) {
      // 如果有上下文情绪，且当前检测到sad，但上下文是happy，需要更高置信度
      if (contextEmotion === 'happy') {
        return { emotion: 'sad', confidence: 0.6, reason: `AI回复检测到委屈：${p}（但上下文是开心，降低置信度）` }
      }
      return { emotion: 'sad', confidence: 0.85, reason: `AI回复检测到委屈：${p}` }
    }
  }
  if (hasKeyword('不开心') || hasKeyword('不高兴') || hasKeyword('失落') || hasKeyword('沮丧')) {
    return { emotion: 'sad', confidence: 0.85, reason: 'AI回复检测到难过' }
  }

  // ========= 第2步：笑意/开心（最常见，放在生气检测之前） =========
  // 笑——最基础也最容易漏掉的关键词！
  const smilePatterns = ['笑了', '笑笑', '笑意', '笑容', '微笑', '欢笑', '忍俊不禁', '嘴角', '抿嘴']
  for (const p of smilePatterns) {
    if (msg.includes(p)) {
      return { emotion: 'happy', confidence: 0.9, reason: `AI回复检测到笑意：${p}` }
    }
  }

  const happyPatterns = [
    '嘿嘿', '哈哈', '嘻嘻', '呵呵',
    '开心', '高兴', '好开心', '好高兴', '真开心', '真高兴',
    '太好了', '太棒了', '真棒', '好棒',
    '喜欢', '喜爱',
  ]
  for (const p of happyPatterns) {
    if (hasKeyword(p)) {
      // 如果上下文是sad/care，开心需要有更强信号
      if (contextEmotion === 'care' || contextEmotion === 'sad') {
        return { emotion: 'happy', confidence: 0.6, reason: `AI回复检测到开心：${p}（但上下文是关心/伤心，降低置信度）` }
      }
      return { emotion: 'happy', confidence: 0.85, reason: `AI回复检测到开心：${p}` }
    }
  }

  // ========= 第3步：撒娇/害羞 =========
  const shyPatterns = [
    '撒娇', '害羞', '脸红', '不好意思', '讨厌啦', '你讨厌',
    '抱抱', '贴贴', '亲亲',
    '才不', '就不', '偏不',  // 撒娇式拒绝
  ]
  for (const p of shyPatterns) {
    if (msg.includes(p)) {
      return { emotion: 'shy', confidence: 0.8, reason: `AI回复检测到撒娇：${p}` }
    }
  }

  // ========= 第4步：关心/温柔 =========
  const carePatterns = [
    '担心', '关心', '没事吧', '还好吗', '不要紧吧',
    '休息', '照顾', '陪你', '陪着你',
    '累了吧', '辛苦了', '注意身体',
  ]
  for (const p of carePatterns) {
    if (msg.includes(p)) {
      return { emotion: 'care', confidence: 0.8, reason: `AI回复检测到关心：${p}` }
    }
  }

  // ========= 第5步：想念 =========
  const missPatterns = ['想你了', '想我', '想念', '好久不见', '好久没']
  for (const p of missPatterns) {
    if (msg.includes(p)) {
      return { emotion: 'miss', confidence: 0.85, reason: `AI回复检测到想念：${p}` }
    }
  }

  // ========= 第6步：思考 ==========
  const thinkPatterns = ['嗯…', '让我想想', 'emmm', '唔…', '考虑一下']
  for (const p of thinkPatterns) {
    if (msg.includes(p)) {
      return { emotion: 'thinking', confidence: 0.75, reason: `AI回复检测到思考：${p}` }
    }
  }

  // ========= 第7步：生气（放在后面，避免误判撒娇式的"哼"） ==========
  const angryPatterns = ['生气', '发火', '气死', '发怒', '过分', '很过分', '不理你了', '不理你']
  for (const p of angryPatterns) {
    if (msg.includes(p)) {
      return { emotion: 'angry', confidence: 0.85, reason: `AI回复检测到生气：${p}` }
    }
  }

  // ========= 第8步：语气词兜底（中性偏开心） ==========
  if (msg.includes('~') || msg.includes('～') || msg.includes('呀') || msg.includes('啦') || msg.includes('嘛')) {
    return { emotion: 'happy', confidence: 0.65, reason: 'AI回复语气轻松，判定为开心' }
  }

  // ========= 第9步：夜间→睡眠 ==========
  const sleepPatterns = ['困', '晚安', '睡觉', '先睡', '去睡']
  for (const p of sleepPatterns) {
    if (msg.includes(p)) {
      return { emotion: 'sleep', confidence: 0.8, reason: `AI回复检测到睡眠：${p}` }
    }
  }

  // ========= 兜底：根据上下文决定情绪，而不是简单地保持上一个状态 ==========
  // 优先使用上下文情绪（如果有的话）
  if (contextEmotion && contextConfidence > 0.5) {
    return {
      emotion: contextEmotion,
      confidence: contextConfidence,
      reason: `根据对话上下文判断，保持情绪：${contextEmotion}`,
    }
  }
  
  // 否则保持上一个情绪状态
  const fallback: Emotion = (currentEmotion as Emotion) || 'happy'
  return {
    emotion: fallback,
    confidence: 0.4,
    reason: `情绪不明确，保持上一状态：${fallback}`,
  }
}
