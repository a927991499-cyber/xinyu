/**
 * 记忆总结器 — 定期将对话历史压缩为用户状态摘要
 * 
 * 触发条件：每 50 条消息总结一次
 * 使用 DeepSeek 分析对话，输出用户画像 JSON
 */

import { getRecentConversations, getMessageCount, getMemorySummary, saveMemorySummary } from './db'

interface UserProfile {
  userState: string
  topics: string[]
  relationshipLevel: number
}

/**
 * 判断是否需要触发总结（每 50 条消息）
 */
export function shouldSummarize(userId: string): boolean {
  const count = getMessageCount(userId)
  const current = getMemorySummary(userId)
  const lastCount = current?.messageCount || 0
  return count - lastCount >= 50
}

/**
 * 调用 DeepSeek 生成用户画像总结
 */
export async function summarizeUser(userId: string): Promise<UserProfile | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    console.error('[Summarizer] DEEPSEEK_API_KEY not set')
    return null
  }

  const recent = getRecentConversations(userId, 50)
  if (recent.length < 10) {
    console.log('[Summarizer] 对话太少，跳过总结')
    return null
  }

  const current = getMemorySummary(userId)
  const msgCount = getMessageCount(userId)

  // 构建对话摘要文本
  const dialogueText = recent.reverse().map(m =>
    `${m.role === 'user' ? '用户' : '小雪'}：${m.content}`
  ).join('\n')

  const prompt = `你是一个对话分析专家。请分析以下用户与AI伴侣的对话记录，输出用户画像JSON。

已有记忆：${current ? `用户状态="${current.userState}" 话题=${current.topics.join(',')} 关系等级=${current.relationshipLevel}` : '无'}

对话记录：
${dialogueText}

请输出纯JSON（不要markdown代码块）：
{
  "userState": "一句话描述用户当前状态（如'最近有点累但心态积极'）",
  "topics": ["话题1", "话题2"],
  "relationshipLevel": 0.0-1.0（关系亲密度评估）
}`

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      }),
    })

    if (!res.ok) {
      console.error('[Summarizer] API error:', res.status)
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Summarizer] 无法解析JSON:', content.slice(0, 200))
      return null
    }

    const profile: UserProfile = JSON.parse(jsonMatch[0])

    // 保存到数据库
    saveMemorySummary(userId, {
      userState: profile.userState || '',
      topics: Array.isArray(profile.topics) ? profile.topics : [],
      relationshipLevel: typeof profile.relationshipLevel === 'number' ? profile.relationshipLevel : 0.3,
      messageCount: msgCount,
    })

    console.log(`[Summarizer] 用户=${userId} 状态="${profile.userState}" 话题=${profile.topics} 关系=${profile.relationshipLevel}`)
    return profile
  } catch (error) {
    console.error('[Summarizer] 失败:', error)
    return null
  }
}
