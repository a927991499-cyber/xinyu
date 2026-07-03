import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 修改用户名（从 Authorization header 解析 userId）
export async function POST(req: NextRequest) {
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

    // 从 request body 获取新名字（不再需要 userId）
    const { name } = await req.json()

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: "名字不能为空" }, { status: 400 })
    }

    const db = getDb()

    // 检查用户是否存在
    const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId)
    if (!existing) {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 })
    }

    // 更新名字
    db.prepare('UPDATE users SET name = ? WHERE user_id = ?').run(name.trim(), userId)

    console.log(`[UpdateName] 用户 ${userId} 改名：${name.trim()}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[UpdateName] 错误:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
