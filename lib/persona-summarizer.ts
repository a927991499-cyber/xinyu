/**
 * 人格总结器 + 洞察报告 + 时间轴
 */

import { getDb } from "@/lib/db"
import { loadPersonaProfile, calculateGrowthScore, getGrowthStage } from "@/lib/persona-extractor"

/**
 * 生成人格自然语言描述（200-300字）
 */
export async function generatePersonaSummary(userId: string): Promise<string> {
  const profile = loadPersonaProfile(userId)
  if (!profile) return ''

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return JSON.stringify(profile, null, 2)

  const prompt = `请将以下人格数据转换为一段100-200字的自然语言描述，像朋友在介绍一个人：

${JSON.stringify({
  说话风格: profile.style,
  情绪模式: profile.emotion,
  价值观: profile.values,
  决策方式: profile.decision,
  关系观: profile.relationship,
  兴趣爱好: profile.interests?.map(i => i.topic)
}, null, 2)}

要求：
1. 用"这个人…"开头
2. 只描述数据中明确的内容
3. 不要编造或过度解读`

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5, max_tokens: 300
      })
    })
    const data = await res.json()
    const summary = data.choices?.[0]?.message?.content || ''
    const db = getDb()
    db.prepare(`INSERT INTO persona_summary (user_id, summary_text, updated_at) VALUES (?, ?, datetime('now','localtime')) ON CONFLICT(user_id) DO UPDATE SET summary_text=excluded.summary_text, updated_at=excluded.updated_at`).run(userId, summary)
    return summary
  } catch (e) {
    console.error('[Summarizer] 生成失败:', e)
    return ''
  }
}

/**
 * 生成人格洞察报告
 */
export async function generateInsightReport(userId: string): Promise<string> {
  const profile = loadPersonaProfile(userId)
  if (!profile) return ''

  const snapshots = getDb().prepare('SELECT * FROM persona_snapshots WHERE user_id = ? ORDER BY created_at ASC').all(userId) as any[]
  const snapshotText = snapshots.length > 1
    ? snapshots.map((s: any) => `[${s.created_at.slice(0,7)}] 事业:${s.career} 家庭:${s.family} 自由:${s.freedom}`).join('\n')
    : '无历史快照'

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return ''

  const prompt = `根据以下用户人格数据和历史变化趋势，生成一份150字以内的洞察报告：

当前人格：
${JSON.stringify({
  价值观: profile.values,
  说话风格: profile.style,
  决策方式: profile.decision,
  情绪模式: profile.emotion,
  关系观: profile.relationship
}, null, 2)}

历史趋势：
${snapshotText}

格式：
✅ 你是XX型人格
✅ 你的核心特质是...
✅ 近期你变得更...
📈/📉 变化趋势...`

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5, max_tokens: 400
      })
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (e) { return '' }
}

/**
 * 创建月度快照
 */
export function createSnapshot(userId: string): boolean {
  const profile = loadPersonaProfile(userId)
  if (!profile) return false

  const db = getDb()
  const lastSnapshot = db.prepare('SELECT * FROM persona_snapshots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any

  let changeNote = ''
  if (lastSnapshot) {
    // 简单变化检测
    const diffs: string[] = []
    if (profile.values) {
      const v = profile.values
      if (Math.abs(v.career - lastSnapshot.career) > 10) diffs.push(`事业${v.career > lastSnapshot.career ? '+' : ''}${(v.career - lastSnapshot.career).toFixed(0)}`)
      if (Math.abs(v.family - lastSnapshot.family) > 10) diffs.push(`家庭${v.family > lastSnapshot.family ? '+' : ''}${(v.family - lastSnapshot.family).toFixed(0)}`)
    }
    if (diffs.length > 0) changeNote = diffs.join('，')
  }

  db.prepare(`INSERT INTO persona_snapshots (user_id, career, family, freedom, money, love, style_data, emotion_data, decision_data, relationship_data, interests_data, persona_score, change_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    userId,
    profile.values?.career ?? 0, profile.values?.family ?? 0, profile.values?.freedom ?? 0,
    profile.values?.money ?? 0, profile.values?.love ?? 0,
    JSON.stringify(profile.style || {}), JSON.stringify(profile.emotion || {}),
    JSON.stringify(profile.decision || {}), JSON.stringify(profile.relationship || {}),
    JSON.stringify(profile.interests || []),
    profile.personaScore, changeNote
  )
  return true
}

/**
 * 获取潜力维度（未充分聊到的维度）
 */
export function getWeakDimensions(userId: string): { name: string; score: number; hint: string }[] {
  const profile = loadPersonaProfile(userId)
  if (!profile || !profile.values) return []

  const hints: Record<string, { name: string; hint: string }> = {
    career: { name: '事业', hint: '聊聊你的工作、创业、职业规划' },
    family: { name: '家庭', hint: '聊聊你的家人，他们对你意味着什么' },
    freedom: { name: '自由', hint: '你对自由的理解是什么' },
    money: { name: '金钱', hint: '聊聊你对金钱的态度' },
    love: { name: '爱情', hint: '分享你对爱情的看法' },
    style: { name: '性格', hint: '多表达自己的想法和感受' },
    emotion: { name: '情绪', hint: '聊聊最近的心情变化' },
    decision: { name: '决策', hint: '分享你做过的重要决定' },
    relationship: { name: '关系', hint: '聊聊你和朋友、家人的相处方式' },
  }

  const result: { name: string; score: number; hint: string }[] = []
  
  const vals: Record<string, number> = {
    career: profile.values.career || 0,
    family: profile.values.family || 0,
    freedom: profile.values.freedom || 0,
    money: profile.values.money || 0,
    love: profile.values.love || 0,
    style: profile.style?.confidence ? profile.style.confidence * 100 : 0,
    emotion: profile.emotion?.confidence ? profile.emotion.confidence * 100 : 0,
    decision: profile.decision?.confidence ? profile.decision.confidence * 100 : 0,
    relationship: profile.relationship?.confidence ? profile.relationship.confidence * 100 : 0,
  }

  for (const [key, val] of Object.entries(vals)) {
    if (val < 50 && hints[key]) result.push({ ...hints[key], score: Math.round(val) })
  }

  return result.sort((a, b) => a.score - b.score).slice(0, 3)
}

/**
 * 获取时间轴
 */
export function getTimeline(userId: string) {
  const db = getDb()
  const snapshots = db.prepare('SELECT * FROM persona_snapshots WHERE user_id = ? ORDER BY created_at DESC LIMIT 12').all(userId) as any[]
  return snapshots.map(s => ({
    date: s.created_at.slice(0, 7),
    icon: getGrowthStage(s.persona_score).icon,
    stage: getGrowthStage(s.persona_score).name,
    score: s.persona_score,
    values: { career: s.career, family: s.family, freedom: s.freedom, money: s.money, love: s.love },
    changeNote: s.change_note || ''
  }))
}
