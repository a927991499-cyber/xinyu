/**
 * SQLite 数据库层 — 用户系统 + 会话历史 + 记忆总结
 * 
 * 表结构:
 *   users           — 用户基础信息
 *   conversations   — 对话历史（最近20轮）
 *   memory_summaries — AI总结的用户状态
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// ─── 数据库初始化 ──────────────────────────────────────────

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'xinyu.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // 建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id       TEXT PRIMARY KEY,
      device_id     TEXT NOT NULL UNIQUE,
      phone         TEXT UNIQUE DEFAULT NULL,
      status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','banned')),
      banned_reason TEXT DEFAULT NULL,
      banned_at     TEXT DEFAULT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      last_active   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             TEXT NOT NULL REFERENCES users(user_id),
      role                TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content             TEXT NOT NULL,
      audio_url           TEXT DEFAULT NULL,
      audio_duration      INTEGER DEFAULT NULL,
      image_url           TEXT DEFAULT NULL,
      user_audio_url      TEXT DEFAULT NULL,
      user_audio_duration INTEGER DEFAULT NULL,
      created_at          TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, created_at);

    CREATE TABLE IF NOT EXISTS memory_summaries (
      user_id            TEXT PRIMARY KEY REFERENCES users(user_id),
      user_state         TEXT DEFAULT '',
      topics             TEXT DEFAULT '[]',
      relationship_level REAL DEFAULT 0.0,
      message_count      INTEGER DEFAULT 0,
      updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memories (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      TEXT NOT NULL REFERENCES users(user_id),
      content      TEXT NOT NULL,
      category     TEXT NOT NULL DEFAULT '其他',
      icon         TEXT NOT NULL DEFAULT '💜',
      created_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, created_at DESC);

    -- ===== 数字分身系统 V1 新增 =====
      user_id      TEXT PRIMARY KEY REFERENCES users(user_id),
      persona_score REAL DEFAULT 0.0,
      stage        TEXT DEFAULT '初识自己',
      is_active    INTEGER DEFAULT 1,
      last_updated TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS persona_values (
      user_id      TEXT PRIMARY KEY REFERENCES users(user_id),
      career       REAL DEFAULT 0.0,
      family       REAL DEFAULT 0.0,
      freedom      REAL DEFAULT 0.0,
      money        REAL DEFAULT 0.0,
      love         REAL DEFAULT 0.0,
      confidence   TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS persona_style (
      user_id         TEXT PRIMARY KEY REFERENCES users(user_id),
      style           TEXT DEFAULT '',
      sentence_length TEXT DEFAULT '',
      emoji_rate      REAL DEFAULT 0.0,
      formality       TEXT DEFAULT '',
      confidence      REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS persona_emotion (
      user_id          TEXT PRIMARY KEY REFERENCES users(user_id),
      stress_response  TEXT DEFAULT '',
      happy_response   TEXT DEFAULT '',
      sad_response     TEXT DEFAULT '',
      angry_response   TEXT DEFAULT '',
      confidence       REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS persona_decision (
      user_id    TEXT PRIMARY KEY REFERENCES users(user_id),
      style      TEXT DEFAULT '',
      confidence REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS persona_relationship (
      user_id              TEXT PRIMARY KEY REFERENCES users(user_id),
      attachment_style     TEXT DEFAULT '',
      trust_speed          TEXT DEFAULT '',
      emotional_dependency TEXT DEFAULT '',
      confidence           REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS persona_interests (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   TEXT NOT NULL REFERENCES users(user_id),
      topic     TEXT NOT NULL,
      score     REAL DEFAULT 0.0,
      mentions  INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_persona_interests_user ON persona_interests(user_id);

    CREATE TABLE IF NOT EXISTS persona_memory_graph (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT NOT NULL REFERENCES users(user_id),
      topic      TEXT NOT NULL,
      importance REAL DEFAULT 0.0,
      mentions   INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_persona_graph_user ON persona_memory_graph(user_id);

    CREATE TABLE IF NOT EXISTS persona_summary (
      user_id      TEXT PRIMARY KEY REFERENCES users(user_id),
      summary_text TEXT DEFAULT '',
      updated_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS persona_snapshots (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        TEXT NOT NULL REFERENCES users(user_id),
      created_at     TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      career         REAL DEFAULT 0.0,
      family         REAL DEFAULT 0.0,
      freedom        REAL DEFAULT 0.0,
      money          REAL DEFAULT 0.0,
      love           REAL DEFAULT 0.0,
      style_data     TEXT DEFAULT '{}',
      emotion_data   TEXT DEFAULT '{}',
      decision_data  TEXT DEFAULT '{}',
      relationship_data TEXT DEFAULT '{}',
      interests_data TEXT DEFAULT '[]',
      persona_score  REAL DEFAULT 0.0,
      change_note    TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_persona_snapshots_user ON persona_snapshots(user_id, created_at);

    CREATE TABLE IF NOT EXISTS persona_shares (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL REFERENCES users(user_id),
      share_token TEXT NOT NULL UNIQUE,
      is_active   INTEGER DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_persona_shares_token ON persona_shares(share_token);
    CREATE INDEX IF NOT EXISTS idx_persona_shares_user ON persona_shares(user_id);

    -- ===== 社区系统 =====
    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL REFERENCES users(user_id),
      name        TEXT DEFAULT '',
      avatar      TEXT DEFAULT '',
      content     TEXT NOT NULL,
      images      TEXT DEFAULT '[]',
      likes       INTEGER DEFAULT 0,
      is_pinned   INTEGER DEFAULT 0,
      status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden','deleted')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

    CREATE TABLE IF NOT EXISTS post_likes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id   INTEGER NOT NULL REFERENCES posts(id),
      user_id   TEXT NOT NULL REFERENCES users(user_id),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id    INTEGER NOT NULL REFERENCES posts(id),
      user_id    TEXT NOT NULL REFERENCES users(user_id),
      name       TEXT DEFAULT '',
      avatar     TEXT DEFAULT '',
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id, created_at);

    CREATE TABLE IF NOT EXISTS carousels (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url  TEXT NOT NULL,
      title      TEXT DEFAULT '',
      link_url   TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_active  INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS legacy_contacts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT NOT NULL REFERENCES users(user_id),
      name       TEXT NOT NULL,
      phone      TEXT DEFAULT '',
      email      TEXT DEFAULT '',
      message    TEXT DEFAULT '',
      is_active  INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(user_id)
    );
  `)

  // 迁移：添加新字段
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[]

    // phone 字段
    if (!columns.find(c => c.name === 'phone')) {
      db.exec('ALTER TABLE users ADD COLUMN phone TEXT DEFAULT NULL')
      console.log('[DB] 已添加 phone 字段到 users 表')
      try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone)') } catch(_) {}
    }

    // name 字段
    if (!columns.find(c => c.name === 'name')) {
      db.exec('ALTER TABLE users ADD COLUMN name TEXT DEFAULT NULL')
      console.log('[DB] 已添加 name 字段到 users 表')
    }

    // avatar_url 字段
    if (!columns.find(c => c.name === 'avatar_url')) {
      db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL')
      console.log('[DB] 已添加 avatar_url 字段到 users 表')
    }

    // member_type 字段（会员类型：free/monthly/quarterly/yearly）
    if (!columns.find(c => c.name === 'member_type')) {
      db.exec("ALTER TABLE users ADD COLUMN member_type TEXT DEFAULT 'free' CHECK(member_type IN ('free','monthly','quarterly','yearly'))")
      console.log('[DB] 已添加 member_type 字段到 users 表')
    }

    // member_expire 字段（会员到期时间）
    if (!columns.find(c => c.name === 'member_expire')) {
      db.exec('ALTER TABLE users ADD COLUMN member_expire TEXT DEFAULT NULL')
      console.log('[DB] 已添加 member_expire 字段到 users 表')
    }
  } catch (e) {
    console.error('[DB] 迁移失败:', e)
  }

  // 迁移：为 conversations 表添加新字段（语音、图片）
  try {
    const columns = db.prepare("PRAGMA table_info(conversations)").all() as { name: string }[]
    const newColumns = [
      { name: 'audio_url', type: 'TEXT DEFAULT NULL' },
      { name: 'audio_duration', type: 'INTEGER DEFAULT NULL' },
      { name: 'image_url', type: 'TEXT DEFAULT NULL' },
      { name: 'user_audio_url', type: 'TEXT DEFAULT NULL' },
      { name: 'user_audio_duration', type: 'INTEGER DEFAULT NULL' },
    ]
    for (const col of newColumns) {
      if (!columns.find(c => c.name === col.name)) {
        db.exec(`ALTER TABLE conversations ADD COLUMN ${col.name} ${col.type}`)
        console.log(`[DB] 已添加 ${col.name} 字段到 conversations 表`)
      }
    }
  } catch (e) {
    console.error('[DB] 迁移失败 (conversations):', e)
  }

  // 迁移：为 memories 表添加4维评分列
  try {
    const memCols = db.prepare("PRAGMA table_info(memories)").all() as { name: string }[]
    const needed = [
      ['layer', "TEXT NOT NULL DEFAULT ''"],
      ['importance', "REAL NOT NULL DEFAULT 0.5"],
      ['emotional', "REAL NOT NULL DEFAULT 0.3"],
      ['relationship', "REAL NOT NULL DEFAULT 0.3"],
      ['future_value', "REAL NOT NULL DEFAULT 0.3"],
      ['topics', "TEXT NOT NULL DEFAULT '[]'"],
    ]
    for (const [name, type] of needed) {
      if (!memCols.find(c => c.name === name)) {
        db.exec(`ALTER TABLE memories ADD COLUMN ${name} ${type}`)
        console.log(`[DB] 已添加 ${name} 字段到 memories 表`)
      }
    }
  } catch (e) {
    console.error('[DB] 迁移失败 (memories):', e)
  }

  // 迁移：为 users 表添加 name + profile 字段
  try {
    const usrCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[]
    if (!usrCols.find(c => c.name === 'profile')) {
      db.exec("ALTER TABLE users ADD COLUMN profile TEXT DEFAULT '{}'")
      console.log('[DB] 已添加 profile 字段到 users 表')
    }
  } catch (e) {
    console.error('[DB] 迁移失败 (users profile):', e)
  }

  // 创建 settings 表（系统设置）
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      description TEXT DEFAULT '',
      updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  // 初始化默认设置
  const defaultSettings = [
    { key: 'ali_access_key_id', value: '', description: '阿里云 AccessKey ID' },
    { key: 'ali_access_key_secret', value: '', description: '阿里云 AccessKey Secret' },
    { key: 'system_prompt', value: '你是小雪，26岁女性，心理学+文学背景...', description: '系统提示词（小雪的人设）' },
    { key: 'volcano_app_id', value: '', description: '火山引擎 App ID' },
    { key: 'volcano_access_token', value: '', description: '火山引擎 Access Token' },
  ]

  for (const setting of defaultSettings) {
    const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get(setting.key)
    if (!existing) {
      db.prepare('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)').run(
        setting.key,
        setting.value,
        setting.description
      )
      console.log(`[DB] 已初始化设置: ${setting.key}`)
    }
  }

  console.log('[DB] SQLite 初始化完成:', DB_PATH)
  return db
}

// ─── 类型 ──────────────────────────────────────────────────

export interface UserRow {
  user_id: string
  device_id: string
  phone: string | null
  status: string
  banned_reason: string | null
  banned_at: string | null
  member_type: string  // free/monthly/quarterly/yearly
  member_expire: string | null  // 会员到期时间
  created_at: string
  last_active: string
}

export interface ConversationRow {
  id: number
  user_id: string
  role: 'user' | 'assistant'
  content: string
  audio_url?: string | null
  audio_duration?: number | null
  image_url?: string | null
  user_audio_url?: string | null
  user_audio_duration?: number | null
  created_at: string
}

export interface MemorySummaryRow {
  user_id: string
  user_state: string
  topics: string
  relationship_level: number
  message_count: number
  updated_at: string
}

export interface MemorySummary {
  userState: string
  topics: string[]
  relationshipLevel: number
  messageCount: number
}

// ─── 用户操作 ──────────────────────────────────────────────

/** 根据 device_id 查找或创建用户 */
export function findOrCreateUser(deviceId: string): UserRow {
  const d = getDb()

  const existing = d.prepare('SELECT * FROM users WHERE device_id = ?').get(deviceId) as UserRow | undefined
  if (existing) {
    d.prepare("UPDATE users SET last_active = datetime('now','localtime') WHERE user_id = ?").run(existing.user_id)
    return existing
  }

  const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  d.prepare('INSERT INTO users (user_id, device_id) VALUES (?, ?)').run(userId, deviceId)

  return d.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as UserRow
}

/** 根据 phone 查找或创建用户（短信登录） */
export function findOrCreateUserByPhone(phone: string): UserRow {
  const d = getDb()

  const existing = d.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as UserRow | undefined
  if (existing) {
    d.prepare("UPDATE users SET last_active = datetime('now','localtime') WHERE user_id = ?").run(existing.user_id)
    return existing
  }

  const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  d.prepare('INSERT INTO users (user_id, device_id, phone) VALUES (?, ?, ?)').run(userId, `phone_${phone}`, phone)

  return d.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as UserRow
}

/** 根据 user_id 获取用户 */
export function getUser(userId: string): UserRow | null {
  const d = getDb()
  return (d.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as UserRow) || null
}

/** 封禁用户 */
export function banUser(userId: string, reason: string): void {
  const d = getDb()
  d.prepare(
    `UPDATE users SET status = 'banned', banned_reason = ?, banned_at = datetime('now') WHERE user_id = ?`
  ).run(reason, userId)
}

/** 解封用户 */
export function unbanUser(userId: string): void {
  const d = getDb()
  d.prepare(
    `UPDATE users SET status = 'active', banned_reason = NULL, banned_at = NULL WHERE user_id = ?`
  ).run(userId)
}

// ─── 对话历史操作 ──────────────────────────────────────────

/** 保存一条对话（完整版，支持语音、图片、角色ID） */
export function saveConversation(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  audioUrl?: string | null,
  audioDuration?: number | null,
  imageUrl?: string | null,
  userAudioUrl?: string | null,
  userAudioDuration?: number | null,
  characterId?: string | null
): number {
  const d = getDb()
  // 确保用户存在（兼容旧 userId）
  const existing = d.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId)
  if (!existing) {
    d.prepare('INSERT INTO users (user_id, device_id) VALUES (?, ?)').run(userId, `auto_${userId}`)
  }
  const info = d.prepare(`INSERT INTO conversations (user_id, role, content, audio_url, audio_duration, image_url, user_audio_url, user_audio_duration, character_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`)
    .run(userId, role, content, audioUrl || null, audioDuration || null, imageUrl || null, userAudioUrl || null, userAudioDuration || null, characterId || null)
  return info.lastInsertRowid as number
}

/** 更新对话的媒体字段（语音、图片） */
export function updateConversationMedia(
  id: number,
  audioUrl?: string | null,
  audioDuration?: number | null,
  imageUrl?: string | null,
  userAudioUrl?: string | null,
  userAudioDuration?: number | null
): void {
  const d = getDb()
  console.log(`[DB] 更新对话媒体: id=${id}, audioUrl=${audioUrl}, duration=${audioDuration}`)
  const result = d.prepare(`UPDATE conversations SET audio_url = ?, audio_duration = ?, image_url = ?, user_audio_url = ?, user_audio_duration = ? WHERE id = ?`)
    .run(audioUrl || null, audioDuration || null, imageUrl || null, userAudioUrl || null, userAudioDuration || null, id)
  console.log(`[DB] 更新结果: changes=${result.changes}`)
}

/** 保存一条对话（简化版，只保存文字，兼容旧代码） */
export function saveConversationSimple(userId: string, role: 'user' | 'assistant', content: string): void {
  saveConversation(userId, role, content)
}

/** 获取最近 N 轮对话（完整版，包含语音、图片） */
export function getRecentConversations(userId: string, limit: number = 20): ConversationRow[] {
  const d = getDb()
  return d.prepare(
    `SELECT id, user_id, role, content, audio_url, audio_duration, image_url, user_audio_url, user_audio_duration, created_at
     FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  ).all(userId, limit) as ConversationRow[]
}

/** 获取用户总消息数 */
export function getMessageCount(userId: string): number {
  const d = getDb()
  const row = d.prepare('SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ?').get(userId) as { cnt: number }
  return row?.cnt || 0
}

/**
 * 分页获取对话历史（按时间倒序，用于"加载更多"）
 * @param userId 用户ID
 * @param beforeId 可选，只取 id < beforeId 的消息（用于分页）
 * @param limit 每页条数
 */
export function getConversationHistory(userId: string, beforeId?: number, limit: number = 10): ConversationRow[] {
  const d = getDb()
  const fields = 'id, user_id, role, content, audio_url, audio_duration, image_url, user_audio_url, user_audio_duration, created_at'
  if (beforeId) {
    // 分页查询：取 beforeId 之前的消息（older messages）
    return d.prepare(
      `SELECT ${fields} FROM conversations WHERE user_id = ? AND id < ? ORDER BY created_at DESC LIMIT ?`
    ).all(userId, beforeId, limit) as ConversationRow[]
  } else {
    // 首次查询：取最近的消息
    return d.prepare(
      `SELECT ${fields} FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(userId, limit) as ConversationRow[]
  }
}

/** 清理旧对话（保留最近 N 条） */
export function trimConversations(userId: string, keep: number = 50): void {
  const d = getDb()
  d.prepare(`
    DELETE FROM conversations 
    WHERE user_id = ? AND id NOT IN (
      SELECT id FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
    )
  `).run(userId, userId, keep)
}

// ─── 记忆总结操作 ──────────────────────────────────────────

/** 获取用户记忆总结 */
export function getMemorySummary(userId: string): MemorySummary | null {
  const d = getDb()
  const row = d.prepare('SELECT * FROM memory_summaries WHERE user_id = ?').get(userId) as MemorySummaryRow | undefined
  if (!row) return null

  return {
    userState: row.user_state,
    topics: JSON.parse(row.topics || '[]'),
    relationshipLevel: row.relationship_level,
    messageCount: row.message_count,
  }
}

/** 保存/更新记忆总结 */
export function saveMemorySummary(
  userId: string,
  summary: { userState: string; topics: string[]; relationshipLevel: number; messageCount: number }
): void {
  const d = getDb()
  // 确保用户存在（兼容旧 userId，防止外键约束失败）
  const existing = d.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId)
  if (!existing) {
    d.prepare('INSERT INTO users (user_id, device_id) VALUES (?, ?)').run(userId, `auto_${userId}`)
  }
  d.prepare(`
    INSERT INTO memory_summaries (user_id, user_state, topics, relationship_level, message_count, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      user_state = excluded.user_state,
      topics = excluded.topics,
      relationship_level = excluded.relationship_level,
      message_count = excluded.message_count,
      updated_at = datetime('now')
  `).run(userId, summary.userState, JSON.stringify(summary.topics), summary.relationshipLevel, summary.messageCount)
}

/** 构建注入 Prompt 的记忆上下文 */
export function buildMemoryContext(userId: string): string {
  const summary = getMemorySummary(userId)
  const recent = getRecentConversations(userId, 10)

  const parts: string[] = []

  if (summary && summary.userState) {
    parts.push(`用户最近状态：${summary.userState}`)
    if (summary.topics.length > 0) {
      parts.push(`常聊话题：${summary.topics.join('、')}`)
    }
  }

  if (recent.length > 0) {
    const lines = recent.reverse().map(m =>
      `${m.role === 'user' ? '用户' : '小雪'}：${m.content}`
    )
    parts.push(`近期对话：\n${lines.join('\n')}`)
  }

  return parts.length > 0 ? `# 🧠 用户记忆\n${parts.join('\n')}` : ''
}

// ─── 短信验证码操作 ──────────────────────────────────────

/** 短信验证码表 */
function ensureSmsCodesTable(): void {
  const d = getDb()
  d.exec(`
    CREATE TABLE IF NOT EXISTS sms_codes (
      phone       TEXT PRIMARY KEY,
      code        TEXT NOT NULL,
      expire_at   TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

/** 保存短信验证码到数据库 */
export function saveSmsCode(phone: string, code: string, ttlSeconds: number = 300): void {
  const d = getDb()
  ensureSmsCodesTable()
  // 用SQLite的datetime函数计算过期时间，避免JS时区问题
  // 注意：SQLite的datetime函数第二个参数需要完整的字符串，如 '+300 seconds'
  // 不能用 || 拼接，因为?是参数占位符，不能在字符串拼接中使用
  // 正确做法：在JavaScript中拼接好字符串，然后作为参数传入
  const expireStr = `+${ttlSeconds} seconds`
  d.prepare(`
    INSERT INTO sms_codes (phone, code, expire_at) VALUES (?, ?, datetime('now', ?))
    ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expire_at = excluded.expire_at, created_at = datetime('now')
  `).run(phone, code, expireStr)
  console.log(`[SMS] 验证码已保存：${phone} -> ${code}，有效期${ttlSeconds}秒`)
}

/** 验证短信验证码 */
export function verifySmsCode(phone: string, code: string): boolean {
  const d = getDb()
  ensureSmsCodesTable()

  // 用SQL查询同时检查：记录存在 + 未过期 + 验证码匹配
  const row = d.prepare(`
    SELECT * FROM sms_codes WHERE phone = ? AND code = ? AND expire_at > datetime('now')
  `).get(phone, code) as { phone: string; code: string } | undefined

  if (!row) {
    // 查找原因用于日志
    const existing = d.prepare('SELECT * FROM sms_codes WHERE phone = ?').get(phone) as any
    if (!existing) {
      console.log(`[SMS] 验证失败：${phone} 未找到验证码记录`)
    } else if (existing.code !== code) {
      console.log(`[SMS] 验证失败：${phone} 验证码不匹配（期望：${existing.code}，输入：${code}）`)
    } else {
      console.log(`[SMS] 验证失败：${phone} 验证码已过期（expire_at: ${existing.expire_at}, now: ${new Date().toISOString()}）`)
    }
    return false
  }

  // 验证成功，删除记录
  d.prepare('DELETE FROM sms_codes WHERE phone = ?').run(phone)
  console.log(`[SMS] 验证成功：${phone}`)
  return true
}

/** 清理过期的验证码 */
export function cleanExpiredSmsCodes(): void {
  const d = getDb()
  ensureSmsCodesTable()
  const result = d.prepare("DELETE FROM sms_codes WHERE expire_at <= datetime('now')").run()
  if (result.changes > 0) {
    console.log(`[SMS] 清理了 ${result.changes} 条过期验证码`)
  }
}

// ─── 关闭数据库 ────────────────────────────────────────────

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
