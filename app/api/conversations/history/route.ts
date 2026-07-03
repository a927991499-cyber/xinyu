import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * 获取对话历史（分页）
 * 查询参数：
 *   - userId: 用户ID（从 token 解析，不信任前端传入）
 *   - beforeId: 可选，只取 id < beforeId 的消息（用于分页）
 *   - limit: 每页条数（默认10）
 */
export async function GET(req: NextRequest) {
  try {
    // 从 token 解析 userId（不信任前端传入的 userId）
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ success: false, error: '未授权，请重新登录' }, { status: 401 })
    }
    let userId: string
    try {
      userId = Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }
    if (!userId || userId.length < 5) {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const beforeId = searchParams.get('beforeId')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // 查询数据库
    const db = getDb()

    let rows
    if (beforeId) {
      // 分页查询：取 beforeId 之前的消息（older messages）
      rows = db.prepare(
        'SELECT * FROM conversations WHERE user_id = ? AND id < ? ORDER BY created_at DESC LIMIT ?'
      ).all(userId, parseInt(beforeId, 10), limit) as any[]
    } else {
      // 首次查询：取最近的消息
      rows = db.prepare(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
      ).all(userId, limit) as any[]
    }

    // 反转顺序（数据库是倒序，前端需要正序显示）
    // 返回所有字段（包括 audio_url, image_url 等）
    const messages = (rows || []).reverse().map(row => ({
      id: row.id,
      role: row.role,
      content: row.content,
      created_at: row.created_at,
      audio_url: row.audio_url || null,
      audio_duration: row.audio_duration || null,
      image_url: row.image_url || null,
      user_audio_url: row.user_audio_url || null,
      user_audio_duration: row.user_audio_duration || null,
    }))

    return NextResponse.json({ success: true, messages })
  } catch (error: any) {
    console.error("❌ 获取对话历史失败：", error)
    return NextResponse.json(
      { error: error.message || "获取失败" },
      { status: 500 }
    )
  }
}
