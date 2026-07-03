/**
 * 记忆提取器 V2
 * 从对话中识别并提取4层记忆
 * 支持事实层 / 关系层 / 情绪层 / 成长层
 */

import { MemoryExtraction, MemoryLayer, EmotionLabel, MemoryType } from './types'

/**
 * 调用 DeepSeek API 提取记忆
 * @param userMessage 用户消息
 * @param apiKey DeepSeek API 密钥
 * @returns 提取的记忆列表
 */
export async function extractMemories(
  userMessage: string,
  apiKey: string
): Promise<MemoryExtraction[]> {
  try {
    const prompt = `你是一个长期数字伴侣的记忆提取助手。请从以下用户消息中提取重要信息。

规则：
1. 只提取真正重要的信息，不是闲聊内容
2. 需要判断信息属于哪个记忆层级（layer）
3. 需要推断主题标签（topics）
4. 需要给出4维评分（importance / emotional / relationship / futureValue）
5. 如果没有重要信息，返回空数组 []

记忆层级说明：
- fact: 客观信息（个人资料、偏好）
- relationship: 关系事件（第一次、里程碑、重要互动时刻）
- emotion: 情绪状态（需要记录原因和情境）
- growth: 成长轨迹（目标进度、变化）

4维评分（0-1）：
- importance: 信息本身的重要性
- emotional: 情绪深度/强烈程度
- relationship: 对关系的价值（拉近距离、增进理解）
- futureValue: 未来的参考价值（以后是否会用到）

用户消息：${userMessage}

只返回JSON，不要有其他内容。格式：
[
  {
    "key": "unique_key",
    "value": "记忆内容",
    "type": "profile|preference|event|emotion|goal",
    "layer": "fact|relationship|emotion|growth",
    "importance": 0.8,
    "emotion": "happy|sad|excited|worried|hopeful|tired|motivated 等",
    "scores": {
      "importance": 0.8,
      "emotional": 0.6,
      "relationship": 0.5,
      "futureValue": 0.7
    },
    "topics": ["创业", "压力"]
  }
]`

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个JSON格式的记忆提取器。只返回合法的JSON数组。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      console.error('DeepSeek API error in memory extraction:', await response.text())
      return []
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return []
    }

    // 解析 JSON 响应
    try {
      const extractions: MemoryExtraction[] = JSON.parse(content)

      if (!Array.isArray(extractions)) {
        return []
      }

      // 验证和补全字段
      return extractions
        .filter(item => item && typeof item.key === 'string' && typeof item.value === 'string')
        .map(item => ({
          key: item.key,
          value: item.value,
          type: item.type || 'event',
          layer: item.layer || 'relationship',
          importance: item.importance ?? item.scores?.importance ?? 0.5,
          emotion: item.emotion as EmotionLabel | undefined,
          scores: item.scores || {
            importance: item.importance ?? 0.5,
            emotional: 0.3,
            relationship: 0.3,
            futureValue: 0.2,
          },
          topics: item.topics || [],
        }))
        .filter(item => item.importance >= 0 && item.importance <= 1)
    } catch (parseError) {
      console.error('Failed to parse memory extraction result:', parseError)
      return []
    }
  } catch (error) {
    console.error('Memory extraction error:', error)
    return []
  }
}

/**
 * 本地规则辅助提取（API失败时的后备方案）
 * 使用关键词匹配进行基础提取
 */
export function extractMemoriesLocal(userMessage: string): MemoryExtraction[] {
  const extractions: MemoryExtraction[] = []
  const lowerMessage = userMessage.toLowerCase()

  // ── 事实层：姓名检测 ──
  const nameMatch = userMessage.match(/(?:我叫|我是|我叫就是)\s*([^\s，。]+)/)
  if (nameMatch) {
    extractions.push({
      key: 'user_name',
      value: nameMatch[1],
      type: 'profile',
      layer: 'fact',
      importance: 0.9,
      topics: ['个人'],
      scores: { importance: 0.9, emotional: 0.1, relationship: 0.2, futureValue: 0.8 },
    })
  }

  // ── 事实层：职业/身份检测 ──
  const occupationMatch = userMessage.match(/(?:我是|我在)做?\s*(创业|程序员|工程师|学生|设计师|老板|自由职业)/)
  if (occupationMatch) {
    extractions.push({
      key: 'user_occupation',
      value: occupationMatch[1],
      type: 'profile',
      layer: 'fact',
      importance: 0.7,
      topics: ['工作', '创业'],
      scores: { importance: 0.7, emotional: 0.1, relationship: 0.3, futureValue: 0.6 },
    })
  }

  // ── 情绪层：情绪检测（带原因）──
  const emotionPatterns: { pattern: RegExp; emotion: EmotionLabel; value: string }[] = [
    { pattern: /开心|高兴|快乐|兴奋/, emotion: 'happy', value: '用户感到开心' },
    { pattern: /难过|伤心|想哭|失落/, emotion: 'sad', value: '用户感到难过' },
    { pattern: /担心|焦虑|紧张|不安/, emotion: 'worried', value: '用户感到焦虑' },
    { pattern: /累|疲惫|累死|没精神/, emotion: 'tired', value: '用户感到疲惫' },
    { pattern: /希望|期待|盼望/, emotion: 'hopeful', value: '用户充满期待' },
    { pattern: /感动|感谢|感恩/, emotion: 'grateful', value: '用户感到感动' },
    { pattern: /孤独|寂寞|一个人/, emotion: 'lonely', value: '用户感到孤独' },
    { pattern: /骄傲|自豪|厉害/, emotion: 'proud', value: '用户感到骄傲' },
    { pattern: /惊讶|震惊|没想到/, emotion: 'surprised', value: '用户感到惊讶' },
  ]

  for (const { pattern, emotion, value } of emotionPatterns) {
    if (pattern.test(lowerMessage)) {
      const topics = detectLocalTopics(userMessage)
      extractions.push({
        key: `emotion_${emotion}_${Date.now()}`,
        value,
        type: 'emotion',
        layer: 'emotion',
        importance: 0.7,
        emotion,
        topics,
        scores: { importance: 0.6, emotional: 0.8, relationship: 0.4, futureValue: 0.3 },
      })
      break
    }
  }

  // ── 关系层：关系事件检测 ──
  if (/第一次|初次|刚认识|之前没聊过/.test(lowerMessage)) {
    extractions.push({
      key: `relationship_first_${Date.now()}`,
      value: extractRelationshipEvent(userMessage),
      type: 'event',
      layer: 'relationship',
      importance: 0.8,
      topics: ['关系'],
      scores: { importance: 0.7, emotional: 0.6, relationship: 0.9, futureValue: 0.8 },
    })
  }

  // ── 成长层：目标检测 ──
  const goalMatch = userMessage.match(/(?:我打算|我想|我在做|我要)(.{2,20})/)
  if (goalMatch) {
    extractions.push({
      key: `goal_${goalMatch[1].replace(/\s/g, '_')}`,
      value: goalMatch[1],
      type: 'goal',
      layer: 'growth',
      importance: 0.7,
      topics: detectLocalTopics(userMessage),
      scores: { importance: 0.6, emotional: 0.3, relationship: 0.3, futureValue: 0.8 },
    })
  }

  return extractions
}

/**
 * 从消息中提取关系事件描述
 */
function extractRelationshipEvent(message: string): string {
  if (/创业|项目|产品|开发/.test(message)) return '第一次深入聊事业和项目'
  if (/晚安|早安/.test(message)) return '日常问候习惯形成'
  if (/想你|在乎|重要/.test(message)) return '情感表达的重要时刻'
  if (/买房|搬家|规划/.test(message)) return '第一次讨论未来生活规划'
  return '重要的关系互动时刻'
}

/**
 * 本地主题检测
 */
function detectLocalTopics(message: string): string[] {
  const text = message.toLowerCase()
  const topics: string[] = []

  const patterns: Record<string, RegExp> = {
    '创业': /创业|项目|产品|开发|上线|投资人/,
    '工作': /工作|加班|辞职|面试|入职|老板/,
    '生活': /生活|日常|家|房子|搬家|做饭/,
    '情感': /情感|心情|感觉|孤独|想|在乎/,
    '压力': /压力|累|难|焦虑|烦|忙/,
    '健康': /健身|运动|跑步|身体|生病/,
    '家庭': /爸|妈|父母|家人|亲戚|回家/,
    '社交': /朋友|聊天|认识|见面|聚会/,
    '目标': /目标|计划|梦想|未来|打算/,
  }

  for (const [topic, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      topics.push(topic)
    }
  }

  return topics.length > 0 ? topics : ['生活']
}
