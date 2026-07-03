/**
 * 统一记忆提取器
 * 调用 DeepSeek 分析对话，按4层分类提取，存入数据库
 * 确保AI能区分用户 + 记住重点信息
 */

import { getDb } from "@/lib/db"
import { getConfigNumber } from "@/lib/config"

const EXTRACT_PROMPT = `你是记忆提取助手。分析以下对话，提取用户的关键信息。

规则：
1. 只提取客观事实和重要信息，不要临时闲聊内容
2. 每条记忆10-30字，简洁精准
3. 需要给每条记忆打上4维评分（0-1）

记忆层级：
- fact: 客观事实（个人资料、偏好、习惯）
- relationship: 关系事件（第一次、重要互动、情感表达）
- emotion: 情绪状态（记录感受和触发情境）
- growth: 成长轨迹（目标、变化、计划）

4维评分（0-1）：
- importance: 这条信息本身多重要
- emotional: 情绪深度
- relationship: 对AI-用户关系的价值
- futureValue: 未来参考价值

分类选项：偏好、工作、情绪、习惯、人际关系、目标、兴趣、生活、其他
图标选项：🧋(偏好) 💼(工作) 😊(情绪) 🧘(习惯) 👥(关系) 🎯(目标) ⭐(兴趣) 🏠(生活) 💜(其他)

返回纯JSON（不要markdown）：
{
  "memories": [
    {
      "content": "用户喜欢喝拿铁，不加糖",
      "category": "偏好",
      "icon": "🧋",
      "layer": "fact",
      "importance": 0.6,
      "emotional": 0.2,
      "relationship": 0.3,
      "futureValue": 0.5,
      "topics": ["饮食", "习惯"]
    }
  ]
}
如果没有重要信息，返回 {"memories": []}`

export async function extractMemories(userId: string, userMessage: string, aiReply: string) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) { console.error('[Memory] 缺少DEEPSEEK_API_KEY'); return }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: EXTRACT_PROMPT },
          { role: 'user', content: `用户消息：${userMessage}\n\nAI回复：${aiReply}` }
        ],
        temperature: 0.3,
        max_tokens: 600
      })
    })

    if (!response.ok) { console.error('[Memory] API错误:', response.status); return }
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    
    let result: any
    try {
      const match = content.match(/\{[\s\S]*\}/)
      result = JSON.parse(match?.[0] || '{}')
    } catch { console.error('[Memory] JSON解析失败'); return }

    if (!result.memories?.length) return

    const db = getDb()
    let saved = 0
    for (const m of result.memories) {
      if (!m.content) continue
      // 用4维评分计算综合重要度（越高越可能持久存储）
      const composite = (m.importance || 0.5) * 0.35 + (m.futureValue || 0.3) * 0.35 + (m.relationship || 0.3) * 0.2 + (m.emotional || 0.3) * 0.1
      const minScore = getConfigNumber('memory_min_score')
      if (composite < minScore) continue // 过滤低价值记忆

      // 检查去重
      const existing = db.prepare('SELECT id FROM memories WHERE user_id = ? AND content = ?').get(userId, m.content) as any
      if (existing) {
        db.prepare(`UPDATE memories SET updated_at = datetime('now','localtime'), 
          importance = ?, emotional = ?, relationship = ?, future_value = ?, layer = ?, topics = ?
          WHERE id = ?`).run(
          m.importance || 0.5, m.emotional || 0.3, m.relationship || 0.3, m.futureValue || 0.3,
          m.layer || 'fact', JSON.stringify(m.topics || []), existing.id
        )
      } else {
        db.prepare(`INSERT INTO memories (user_id, content, category, icon, 
          importance, emotional, relationship, future_value, layer, topics)
          VALUES (?,?,?,?, ?,?,?,?, ?,?)`).run(
          userId, m.content, m.category || '其他', m.icon || '💜',
          m.importance || 0.5, m.emotional || 0.3, m.relationship || 0.3, m.futureValue || 0.3,
          m.layer || 'fact', JSON.stringify(m.topics || [])
        )
        saved++
      }
    }
    if (saved > 0) console.log(`[Memory] 用户${userId.slice(-8)} 提取了${saved}条新记忆`)
  } catch (e) { console.error('[Memory] 提取失败:', e) }
}

/**
 * 本地规则辅助提取（API失败时后备，确保基本信息不丢失）
 */
export function extractMemoriesLocal(userId: string, userMessage: string) {
  const db = getDb()
  const lower = userMessage.toLowerCase()

  const rules: { pattern: RegExp; category: string; icon: string; extract: (m: string) => string }[] = [
    { pattern: /我叫|我是|我叫就是/, category: '偏好', icon: '🧋', extract: m => (m.match(/(?:我是|我叫)\s*([^\s，。]+)/)?.[1] || '') },
    { pattern: /我是.*创业|我是.*程序员|我是.*工程师|我是.*学生|我是.*设计师|我是.*老板/, category: '工作', icon: '💼', extract: m => m.slice(0, 30) },
    { pattern: /开心|高兴|快乐|兴奋|激动/, category: '情绪', icon: '😊', extract: () => '用户表达开心的情绪' },
    { pattern: /难过|伤心|想哭|失落|郁闷/, category: '情绪', icon: '😊', extract: () => '用户表达难过的情绪' },
    { pattern: /压力|焦虑|紧张|不安|担心/, category: '情绪', icon: '😊', extract: () => '用户感到有压力/焦虑' },
    { pattern: /喜欢|爱好|兴趣/, category: '兴趣', icon: '⭐', extract: m => m.slice(0, 30) },
    { pattern: /打算|目标|计划|想做|要做/, category: '目标', icon: '🎯', extract: m => m.slice(0, 30) },
  ]

  for (const rule of rules) {
    if (rule.pattern.test(lower)) {
      const content = rule.extract(userMessage)
      if (!content || content.length < 2) continue
      const existing = db.prepare('SELECT id FROM memories WHERE user_id = ? AND content = ?').get(userId, content)
      if (!existing) {
        db.prepare('INSERT INTO memories (user_id, content, category, icon) VALUES (?,?,?,?)').run(userId, content, rule.category, rule.icon)
        console.log(`[Memory] 本地规则提取: ${content}`)
      }
      break
    }
  }
}
