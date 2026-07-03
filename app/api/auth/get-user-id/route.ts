import { NextRequest, NextResponse } from "next/server"

/**
 * 根据 phone 获取 userId
 * ⚠️ 此API仅用于登录后获取userId，需要验证token
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ 验证 token
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ success: false, error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json({ success: false, error: "缺少 phone" }, { status: 400 })
    }

    // ✅ 验证 token 对应的用户只能查询自己的 userId
    let tokenUserId: string
    try {
      tokenUserId = Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json({ success: false, error: "Token无效" }, { status: 401 })
    }

    // 查询用户信息
    const { getDb } = require('@/lib/db')
    const db = getDb()
    const row = db.prepare('SELECT user_id, phone FROM users WHERE phone = ?').get(phone) as any

    if (row) {
      // ✅ 只能查询自己的信息
      if (row.user_id !== tokenUserId) {
        return NextResponse.json({ success: false, error: "无权访问" }, { status: 403 })
      }
      return NextResponse.json({
        success: true,
        userId: row.user_id
      })
    } else {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 })
    }
  } catch (error: any) {
    console.error('[GetUserId] 错误:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
