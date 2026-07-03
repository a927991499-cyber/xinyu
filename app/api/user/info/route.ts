import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 获取用户信息（从 Authorization header 解析 userId）
export async function GET(request: NextRequest) {
  try {
    // 从 token 解析 userId（不信任前端传入的 userId）
    const authHeader = request.headers.get('Authorization')
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

    const db = getDb()
    const row = db.prepare(`
      SELECT user_id, phone, name, avatar_url FROM users WHERE user_id = ?
    `).get(userId) as any

    if (!row) {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        user_id: row.user_id,
        phone: row.phone,
        name: row.name || '小雪的朋友',
        avatar_url: row.avatar_url || null
      }
    })
  } catch (error: any) {
    console.error('[GetUserInfo] 错误:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
