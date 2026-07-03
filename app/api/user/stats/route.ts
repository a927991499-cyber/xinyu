import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 获取聊天统计（从 Authorization header 解析 userId）
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

    // 统计消息总数（通过user_id关联）
    const msgCount = db.prepare(`
      SELECT COUNT(*) as count FROM conversations WHERE user_id = ?
    `).get(userId) as { count: number }

    // 统计聊天天数（去重的日期）
    const dayCount = db.prepare(`
      SELECT COUNT(DISTINCT DATE(created_at)) as count FROM conversations WHERE user_id = ?
    `).get(userId) as { count: number }

    // 统计图片总数
    const imgCount = db.prepare(`
      SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND image_url IS NOT NULL
    `).get(userId) as { count: number }

    return NextResponse.json({
      success: true,
      stats: {
        totalMessages: msgCount.count,
        totalDays: dayCount.count,
        totalImages: imgCount.count
      }
    })
  } catch (error: any) {
    console.error('[GetUserStats] 错误:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
