/**
 * 人格提取引擎 V1
 * 从聊天记录中提取用户的七维人格数据
 */

import { getDb } from "@/lib/db"
import { getConfigNumber } from "@/lib/config"

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

type StyleKind = 'direct' | 'indirect' | 'mixed'
type SentenceKind = 'short' | 'medium' | 'long'
type FormalityKind = 'casual' | 'normal' | 'formal'
type ResponseKind = 'silent' | 'share' | 'vent' | 'rationalize' | 'internal' | 'seek_comfort' | 'suppress' | 'express' | 'energetic'
type DecisionKind = 'action_first' | 'plan_first' | 'risk_taker' | 'conservative'
type AttachmentKind = 'secure' | 'anxious' | 'avoidant' | 'disorganized'

interface PersonaData {
  values: {
    career: number; family: number; freedom: number; money: number; love: number
    confidence: Record<string, number>
  }
  style: { style: StyleKind; sentence_length: SentenceKind; emoji_rate: number; formality: FormalityKind; confidence: number }
  emotion: { stress_response: ResponseKind; happy_response: ResponseKind; sad_response: ResponseKind; angry_response: ResponseKind; confidence: number }
  decision: { style: DecisionKind; confidence: number }
  relationship: { attachment_style: AttachmentKind; trust_speed: string; emotional_dependency: string; confidence: number }
  interests: { topic: string; score: number; mentions: number }[]
  memoryGraph: { topic: string; importance: number; mentions: number }[]
}

// ═══════════════════════════════════════════
// 成长度计算
// ═══════════════════════════════════════════

const STAGES = [
  { max: 20, icon: '🌱', name: '初识自己' },
  { max: 40, icon: '🌿', name: '逐渐清晰' },
  { max: 60, icon: '🌳', name: '人格成型' },
  { max: 80, icon: '✨', name: '自我觉醒' },
  { max: 101, icon: '💎', name: '数字人格成熟' },
]

export function getGrowthStage(score: number) {
  for (const s of STAGES) if (score < s.max) return s
  return STAGES[STAGES.length - 1]
}

/** 木桶算法：取最低维度权重。空维度不参与计算。消息数越少，confidence打折越狠 */
export function calculateGrowthScore(p: Partial<PersonaData>, messageCount: number = 0): number {
  const scores: number[] = []
  
  // 连续权重：每条消息都贡献一点，100条达到满分
  const denom = getConfigNumber('persona_msg_weight_denom')
  const msgWeight = Math.min(messageCount / denom, 1.0)
  
  if (p.style?.confidence) scores.push(p.style.confidence * 100 * msgWeight)
  if (p.emotion?.confidence) scores.push(p.emotion.confidence * 100 * msgWeight)
  if (p.values?.confidence) {
    const v = Object.values(p.values.confidence).filter(v => v > 0)
    if (v.length > 0) scores.push(Math.min(...v) * 100 * msgWeight)
  }
  if (p.decision?.confidence) scores.push(p.decision.confidence * 100 * msgWeight)
  if (p.relationship?.confidence) scores.push(p.relationship.confidence * 100 * msgWeight)
  if (p.interests?.length) scores.push(Math.min(50, p.interests.length * 10) * msgWeight)
  if (p.memoryGraph?.length) scores.push(Math.min(40, p.memoryGraph.length * 8) * msgWeight)
  
  if (scores.length === 0) return 0
  return Math.round(Math.min(...scores))
}

// ═══════════════════════════════════════════
// 人格提取
// ═══════════════════════════════════════════

const EXTRACTION_PROMPT = `你是人格分析专家。分析以下用户的聊天记录，提取人格特征。

请输出纯JSON（不要markdown代码块）：

{
  "values": {
    "career": 0-100分,
    "family": 0-100分,
    "freedom": 0-100分,
    "money": 0-100分,
    "love": 0-100分,
    "confidence": {
      "career": 0-1置信度,
      "family": 0-1,
      "freedom": 0-1,
      "money": 0-1,
      "love": 0-1
    }
  },
  "style": {
    "style": "direct|indirect|mixed",
    "sentence_length": "short|medium|long",
    "emoji_rate": 0-1,
    "formality": "casual|normal|formal",
    "confidence": 0-1
  },
  "emotion": {
    "stress_response": "silent|share|vent|rationalize",
    "happy_response": "share|internal|energetic",
    "sad_response": "internal|seek_comfort|suppress",
    "angry_response": "rationalize|express|suppress",
    "confidence": 0-1
  },
  "decision": {
    "style": "action_first|plan_first|risk_taker|conservative",
    "confidence": 0-1
  },
  "relationship": {
    "attachment_style": "secure|anxious|avoidant|disorganized",
    "trust_speed": "slow|medium|fast",
    "emotional_dependency": "low|medium|high",
    "confidence": 0-1
  },
  "interests": [
    {"topic": "主题名", "score": 0-100, "mentions": 次数}
  ],
  "memory_graph": [
    {"topic": "主题名", "importance": 0-1, "mentions": 次数}
  ]
}

规则：
1. 只基于聊天记录，不要编造
2. 置信度 = 维度被聊到的充分程度（0=没聊过, 1=明确多次表达）
3. 兴趣图谱取出现频率高的TOP5
4. 价值观分数反映优先级，越高越重视`

/**
 * 从聊天记录提取人格（DeepSeek 分析）
 */
async function extractFromDeepSeek(messages: string[]): Promise<PersonaData | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) { console.error('[Persona] 缺少DEEPSEEK_API_KEY'); return null }

  const userText = messages.slice(0, 200).join('\n---\n') // 限制长度

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: `用户聊天记录：\n${userText}` }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!res.ok) { console.error('[Persona] DeepSeek返回错误:', res.status); return null }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const match = content.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch (e) {
    console.error('[Persona] 提取失败:', e)
    return null
  }
}

/**
 * 读取用户聊天记录
 */
function getUserMessages(userId: string, since?: string): string[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT content FROM conversations 
    WHERE user_id = ? AND role = 'user'
    ${since ? "AND created_at > ?" : ""}
    ORDER BY created_at ASC
  `).all(...(since ? [userId, since] : [userId])) as { content: string }[]
  return rows.map(r => r.content)
}

/**
 * 全量提取人格（首次运行）
 */
export async function extractPersona(userId: string): Promise<boolean> {
  console.log(`[Persona] 开始全量提取: ${userId}`)
  const messages = getUserMessages(userId)
  if (messages.length < 5) { console.log('[Persona] 消息太少，跳过'); return false }

  const data = await extractFromDeepSeek(messages)
  if (!data) return false

  savePersona(userId, data, messages.length)
  console.log(`[Persona] 全量提取完成: ${userId}`)
  return true
}

/**
 * 增量更新人格
 */
export async function updatePersonaIncremental(userId: string): Promise<boolean> {
  const db = getDb()
  const profile = db.prepare('SELECT last_updated FROM persona_profile WHERE user_id = ?').get(userId) as any
  const since = profile?.last_updated

  console.log(`[Persona] 增量更新: ${userId}, since=${since || '首次'}`)
  const messages = getUserMessages(userId, since)
  if (messages.length < 3) { console.log('[Persona] 新增消息太少，跳过'); return false }

  const data = await extractFromDeepSeek(messages)
  if (!data) return false

  // 增量合并：新数据只更新对应维度
  mergePersona(userId, data, messages.length)
  console.log(`[Persona] 增量更新完成: ${userId}`)
  return true
}

// ═══════════════════════════════════════════
// 数据库写入
// ═══════════════════════════════════════════

function savePersona(userId: string, data: PersonaData, messageCount: number = 0) {
  const db = getDb()
  const score = calculateGrowthScore(data, messageCount)
  const stage = getGrowthStage(score).name

  // upsert 各表
  const upsert = (table: string, cols: string[], vals: any[]) => {
    const placeholders = cols.map(() => '?').join(',')
    const setClause = cols.map(c => `${c}=excluded.${c}`).join(',')
    db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT(user_id) DO UPDATE SET ${setClause}`).run(...vals)
  }

  upsert('persona_profile', ['user_id', 'persona_score', 'stage', 'last_updated'],
    [userId, score, stage, new Date().toISOString().replace('T',' ').slice(0,19)])

  upsert('persona_values', ['user_id', 'career', 'family', 'freedom', 'money', 'love', 'confidence'],
    [userId, data.values.career, data.values.family, data.values.freedom, data.values.money, data.values.love, JSON.stringify(data.values.confidence)])

  upsert('persona_style', ['user_id', 'style', 'sentence_length', 'emoji_rate', 'formality', 'confidence'],
    [userId, data.style.style, data.style.sentence_length, data.style.emoji_rate, data.style.formality, data.style.confidence])

  upsert('persona_emotion', ['user_id', 'stress_response', 'happy_response', 'sad_response', 'angry_response', 'confidence'],
    [userId, data.emotion.stress_response, data.emotion.happy_response, data.emotion.sad_response, data.emotion.angry_response, data.emotion.confidence])

  upsert('persona_decision', ['user_id', 'style', 'confidence'],
    [userId, data.decision.style, data.decision.confidence])

  upsert('persona_relationship', ['user_id', 'attachment_style', 'trust_speed', 'emotional_dependency', 'confidence'],
    [userId, data.relationship.attachment_style, data.relationship.trust_speed, data.relationship.emotional_dependency, data.relationship.confidence])

  // 兴趣图谱：先删后插
  db.prepare('DELETE FROM persona_interests WHERE user_id = ?').run(userId)
  for (const i of (data.interests || []).slice(0, 10)) {
    db.prepare('INSERT INTO persona_interests (user_id, topic, score, mentions) VALUES (?,?,?,?)').run(userId, i.topic, i.score, i.mentions)
  }

  db.prepare('DELETE FROM persona_memory_graph WHERE user_id = ?').run(userId)
  for (const m of (data.memoryGraph || []).slice(0, 10)) {
    db.prepare('INSERT INTO persona_memory_graph (user_id, topic, importance, mentions) VALUES (?,?,?,?)').run(userId, m.topic, m.importance, m.mentions)
  }
}

function mergePersona(userId: string, newData: PersonaData, messageCount: number = 0) {
  savePersona(userId, newData, messageCount)
}

// ═══════════════════════════════════════════
// 人格数据加载（供 API 使用）
// ═══════════════════════════════════════════

export function loadPersonaProfile(userId: string) {
  const db = getDb()
  const profile = db.prepare('SELECT * FROM persona_profile WHERE user_id = ?').get(userId) as any
  if (!profile) return null

  const values = db.prepare('SELECT * FROM persona_values WHERE user_id = ?').get(userId) as any
  const style = db.prepare('SELECT * FROM persona_style WHERE user_id = ?').get(userId) as any
  const emotion = db.prepare('SELECT * FROM persona_emotion WHERE user_id = ?').get(userId) as any
  const decision = db.prepare('SELECT * FROM persona_decision WHERE user_id = ?').get(userId) as any
  const relationship = db.prepare('SELECT * FROM persona_relationship WHERE user_id = ?').get(userId) as any
  const interests = db.prepare('SELECT * FROM persona_interests WHERE user_id = ? ORDER BY score DESC').all(userId) as any[]
  const graph = db.prepare('SELECT * FROM persona_memory_graph WHERE user_id = ? ORDER BY importance DESC').all(userId) as any[]
  const summary = db.prepare('SELECT * FROM persona_summary WHERE user_id = ?').get(userId) as any

  return {
    userId,
    personaScore: profile.persona_score,
    stage: profile.stage,
    stageIcon: getGrowthStage(profile.persona_score).icon,
    lastUpdated: profile.last_updated,
    values: values ? {
      career: values.career, family: values.family, freedom: values.freedom,
      money: values.money, love: values.love,
      confidence: values.confidence ? JSON.parse(values.confidence) : {}
    } : null,
    style: style ? {
      style: style.style, sentence_length: style.sentence_length,
      emoji_rate: style.emoji_rate, formality: style.formality, confidence: style.confidence
    } : null,
    emotion: emotion ? {
      stress_response: emotion.stress_response, happy_response: emotion.happy_response,
      sad_response: emotion.sad_response, angry_response: emotion.angry_response, confidence: emotion.confidence
    } : null,
    decision: decision ? { style: decision.style, confidence: decision.confidence } : null,
    relationship: relationship ? {
      attachment_style: relationship.attachment_style, trust_speed: relationship.trust_speed,
      emotional_dependency: relationship.emotional_dependency, confidence: relationship.confidence
    } : null,
    interests: interests?.map(i => ({ topic: i.topic, score: i.score, mentions: i.mentions })) || [],
    memoryGraph: graph?.map(g => ({ topic: g.topic, importance: g.importance, mentions: g.mentions })) || [],
    summary: summary?.summary_text || ''
  }
}
