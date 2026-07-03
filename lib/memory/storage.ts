/**
 * 记忆存储模块 V2
 * ⚠️ 已修改为从数据库读取（不再使用文件系统）
 *   - loadMemories() 从 memories 表读取，供 recall.ts 召回使用
 *   - saveMemories / storeMemories 保留空实现（当前由 memory-extractor.ts 直接写数据库）
 */

import { UserMemory, MemoryLayer } from './types'
import { getDb } from '@/lib/db'

// ── 辅助 ───────────────────────────────────────────

function safeParseJson(s: string | null | undefined): string[] | null {
  if (!s) return null;
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : null } catch { return null }
}

// ── 辅助：将数据库的 category 映射为 MemoryLayer ─────────────

function mapCategoryToLayer(category: string): MemoryLayer {
  const cat = (category || '').trim()
  if (cat === '情绪') return 'emotion'
  if (cat === '目标') return 'growth'
  if (cat === '人际关系') return 'relationship'
  if (cat === '偏好') return 'fact'
  if (cat === '习惯') return 'fact'
  return 'fact'
}

// ── 辅助：从 content 推断 topics ─────────────────────────────

function inferTopicsFromContent(content: string): string[] {
  const text = (content || '').toLowerCase()
  const patterns: Record<string, RegExp> = {
    '创业': /创业|项目|产品|开发|上线/,
    '工作': /工作|加班|辞职|面试|入职/,
    '生活': /生活|日常|家|房子|搬家/,
    '情绪': /情绪|心情|感觉|孤独|想/,
    '学习': /学习|读书|课程|考试/,
    '健康': /健身|运动|跑步|身体/,
    '家庭': /爸|妈|父母|家人|亲戚/,
    '社交': /朋友|聊天|认识|见面/,
    '目标': /目标|计划|梦想|未来/,
    '压力': /压力|累|难|焦虑|烦/,
  }
  const topics: string[] = []
  for (const [topic, re] of Object.entries(patterns)) {
    if (re.test(text)) topics.push(topic)
  }
  return topics.length > 0 ? topics : ['生活']
}

// ── 加载（从数据库，不再使用文件系统）─────────────────────
//    此函数被 recall.ts 调用，用于召回记忆注入 AI Prompt

export async function loadMemories(userId: string): Promise<UserMemory[]> {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT id, user_id, content, category, icon, created_at, updated_at,
        importance, emotional, relationship, future_value, layer, topics
      FROM memories
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 10000
    `).all(userId) as any[]

    if (!rows || rows.length === 0) return []

    const memories: UserMemory[] = rows.map(row => {
      const layer = (row.layer as string) || mapCategoryToLayer(row.category)
      const topics = inferTopicsFromContent(row.content)
      return {
        id: String(row.id),
        userId: row.user_id,
        layer,
        type: layer === 'emotion' ? 'emotion' as const :
              layer === 'growth' ? 'goal' as const : 'profile' as const,
        key: (row.content || '').slice(0, 30),
        value: row.content || '',
        scores: {
          importance: row.importance ?? 0.5,
          emotional: row.emotional ?? 0.3,
          relationship: row.relationship ?? 0.3,
          futureValue: row.future_value ?? 0.3,
        },
        topics: safeParseJson(row.topics) || inferTopicsFromContent(row.content),
        createdAt: new Date(row.created_at || Date.now()),
        updatedAt: new Date(row.updated_at || Date.now()),
      }
    })

    console.log(`[Memory] 从数据库加载了 ${memories.length} 条记忆，userId: ${userId}`)
    return memories
  } catch (error) {
    console.error('[Memory] 从数据库加载失败:', error)
    return []
  }
}

// ── 以下函数保留空实现（当前未被调用）─────────────────────
//    memory-extractor.ts 直接操作数据库，不走 storage.ts 的写入函数
//    保留这些导出以避免 recall.ts 中出现 import 报错

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function saveMemories(_userId: string, _memories: UserMemory[]): Promise<void> {
  void _userId; void _memories
}

export async function storeMemories(_userId: string, _extractions: any[]): Promise<number> {
  void _userId; void _extractions
  return 0
}

export async function deleteMemory(_userId: string, _memoryId: string): Promise<boolean> {
  void _userId; void _memoryId
  return false
}

export async function clearMemories(_userId: string): Promise<void> {
  void _userId
}
