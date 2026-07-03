/**
 * 用户档案轻量提取器
 * 从对话中正则提取：名字、年龄、性别、兴趣
 * 不调 AI，零成本，写入 users 表
 */
import { getDb } from "@/lib/db"

export interface UserProfile {
  name?: string
  age?: number
  gender?: string
  interests?: string[]
}

// 提取名字（用户说"我叫XX"/"你可以叫我XX"/"我是XX"）
const NAME_PATTERNS = [
  /(?:我的名字|我名字)(?:叫|是)([\u4e00-\u9fa5]{2,6})/,
  /我叫([\u4e00-\u9fa5]{2,6})(?:[，,。.!！]|$|\s| )/,
  /可以叫我([\u4e00-\u9fa5]{2,6})/,
  /我是([\u4e00-\u9fa5]{2,6})(?:[，,。.。!！]|$|\s| )/,
  /称呼我([\u4e00-\u9fa5]{2,6})/,
  /叫我([\u4e00-\u9fa5]{2,6})(?:[，,。.!！]|$|\s| )/,
  /名字是([\u4e00-\u9fa5]{2,6})/,
]

// 提取年龄
const AGE_PATTERNS = [
  /(?:今年|我)(\d{1,2})(?:岁|了)/,
  /(\d{1,2})后(?:的)?/,
]

// 提取性别
const GENDER_PATTERNS = [
  { pattern: /我是(?:个)?(男|女|男生|女生|男孩|女孩)(?:的|生|孩)?/, map: ['男','男','男生','男生','男孩','男孩','女','女生','女生','女孩','女孩'] },
]

// 提取兴趣（用户说"我喜欢XX"/"我喜欢XX和XX"）
const INTEREST_PATTERNS = [
  /(?:我|平时|最近)(?:喜欢|爱|爱好|喜欢看|爱看|喜欢玩)([\u4e00-\u9fa5]{2,6})/g,
  /兴趣(?:是|爱好是|是)([\u4e00-\u9fa5]{2,6})/g,
]

function extractName(text: string): string | null {
  for (const p of NAME_PATTERNS) {
    const m = text.match(p)
    if (m) return m[1]
  }
  return null
}

function extractAge(text: string): number | null {
  for (const p of AGE_PATTERNS) {
    const m = text.match(p)
    if (m) {
      const age = parseInt(m[1])
      if (age >= 10 && age <= 99) return age
    }
  }
  return null
}

function extractGender(text: string): string | null {
  if (/(?:我是)?(?:个)?男的/.test(text) || /我是(?:个)?(?:男)/.test(text)) return '男'
  if (/(?:我是)?(?:个)?女的/.test(text) || /我是(?:个)?(?:女)/.test(text)) return '女'
  return null
}

function extractInterests(text: string): string[] {
  const found: string[] = []
  for (const p of INTEREST_PATTERNS) {
    let m: RegExpExecArray | null
    const regex = new RegExp(p.source, 'g')
    while ((m = regex.exec(text)) !== null) {
      const interest = m[1].replace(/[的之]/g, '').trim()
      if (interest.length >= 2 && !found.includes(interest)) {
        found.push(interest)
      }
    }
  }
  return found
}

/**
 * 从用户消息中提取档案信息并更新 users 表
 * 只更新，不覆盖已有信息（除非有冲突）
 */
export function extractUserProfile(userId: string, userMessage: string, aiReply: string) {
  const text = userMessage
  const db = getDb()

  // 读取现有档案
  const row = db.prepare("SELECT name, profile FROM users WHERE user_id = ?").get(userId) as any
  if (!row) return

  let profile: UserProfile = {}
  try { profile = JSON.parse(row.profile || '{}') } catch {}
  let updated = false

  // 提取名字（永不覆盖）
  if (!profile.name && !row.name) {
    const name = extractName(text)
    if (name) {
      db.prepare("UPDATE users SET name = ? WHERE user_id = ?").run(name, userId)
      profile.name = name
      updated = true
      console.log(`[Profile] 提取名字: ${name} → ${userId.slice(-8)}`)
    }
  }

  // 提取年龄（可覆盖，取最新）
  const age = extractAge(text)
  if (age && age !== profile.age) {
    profile.age = age
    updated = true
    console.log(`[Profile] 提取年龄: ${age} → ${userId.slice(-8)}`)
  }

  // 提取性别（永不覆盖）
  if (!profile.gender) {
    const gender = extractGender(text)
    if (gender) {
      profile.gender = gender
      updated = true
      console.log(`[Profile] 提取性别: ${gender} → ${userId.slice(-8)}`)
    }
  }

  // 提取兴趣（追加不重复）
  const interests = extractInterests(text)
  if (interests.length > 0) {
    const current = profile.interests || []
    let added = false
    for (const i of interests) {
      if (!current.includes(i)) {
        current.push(i)
        added = true
      }
    }
    if (added) {
      profile.interests = current
      updated = true
      console.log(`[Profile] 提取兴趣: [${interests.join(',')}] → ${userId.slice(-8)}`)
    }
  }

  if (updated) {
    // 限制兴趣数量
    if (profile.interests && profile.interests.length > 10) {
      profile.interests = profile.interests.slice(-10)
    }
    db.prepare("UPDATE users SET profile = ? WHERE user_id = ?").run(JSON.stringify(profile), userId)
  }
}

/**
 * 构建用户档案上下文，注入 AI prompt
 */
export function buildProfileContext(userId: string): string {
  const db = getDb()
  const row = db.prepare("SELECT name, profile FROM users WHERE user_id = ?").get(userId) as any
  if (!row) return ''

  let profile: UserProfile = {}
  try { profile = JSON.parse(row.profile || '{}') } catch {}

  const parts: string[] = []
  if (row.name) parts.push(`名叫${row.name}`)
  if (profile.age) parts.push(`${profile.age}岁`)
  if (profile.gender) parts.push(profile.gender)
  if (profile.interests?.length) parts.push(`喜欢${profile.interests.join('、')}`)

  if (parts.length === 0) return ''

  return `\n用户档案：${parts.join('，')}。\n`
}
