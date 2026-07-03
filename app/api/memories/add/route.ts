import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 添加记忆
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ success: false, error: "未授权" }, { status: 401 })
    }
    let userId: string
    try {
      userId = Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json({ success: false, error: "Token无效" }, { status: 401 })
    }
    if (!userId || userId.length < 5) {
      return NextResponse.json({ success: false, error: "Token无效" }, { status: 401 })
    }

    const { content, category, icon } = await request.json()

    if (!content) {
      return NextResponse.json({ success: false, error: "缺少参数" }, { status: 400 })
    }

    const db = getDb()
    
    // 检查是否已存在相同内容的记忆
    const existing = db.prepare(`
      SELECT id FROM memories WHERE user_id = ? AND content = ?
    `).get(userId, content)

    if (existing) {
      // 已存在，更新时间
      db.prepare(`
        UPDATE memories SET updated_at = datetime('now', 'localtime') WHERE id = ?
      `).run((existing as any).id)
      return NextResponse.json({ success: true, message: "记忆已存在，已更新时间" })
    }

    // 新增记忆
    const result = db.prepare(`
      INSERT INTO memories (user_id, content, category, icon)
      VALUES (?, ?, ?, ?)
    `).run(userId, content, category || '其他', icon || '💜')

    return NextResponse.json({ success: true, memoryId: result.lastInsertRowid })
  } catch (error: any) {
    console.error('[Memories POST] 错误:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
