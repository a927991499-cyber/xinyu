import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 获取用户记忆列表
export async function GET(request: NextRequest) {
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
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '10')

    const db = getDb()
    const memories = db.prepare(`
      SELECT id, content, category, icon, created_at, updated_at
      FROM memories
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(userId, limit) as any[]

    return NextResponse.json({
      success: true,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        category: m.category,
        icon: m.icon,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }))
    })
  } catch (error: any) {
    console.error('[Memories GET] 错误:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
