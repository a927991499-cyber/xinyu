import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

function verifyAdmin(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value
  const pwd = process.env.ADMIN_PASSWORD || "xinyu2026admin"
  if (!token || !pwd) return false
  try {
    const d = Buffer.from(token, "base64").toString("utf-8")
    return d.split(":")[1] === pwd
  } catch { return false }
}

/** 对话管理：按用户查询 / 全文搜索 / 统计 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const keyword = searchParams.get("keyword")
  const action = searchParams.get("action")
  const limit = parseInt(searchParams.get("limit") || "200", 10)

  const db = getDb()

  // 每日消息量统计
  if (action === "daily-stats") {
    const days = parseInt(searchParams.get("days") || "7")
    const rows = db.prepare(`SELECT date(created_at) as day, COUNT(*) as cnt FROM conversations WHERE created_at > datetime('now', '-${days} days') GROUP BY day ORDER BY day`).all() as any[]
    return NextResponse.json({ success: true, stats: rows })
  }

  // 全文搜索对话
  if (keyword) {
    const rows = db.prepare("SELECT c.*, u.phone FROM conversations c LEFT JOIN users u ON c.user_id = u.user_id WHERE c.content LIKE ? ORDER BY c.created_at DESC LIMIT ?").all(`%${keyword}%`, limit) as any[]
    return NextResponse.json({ success: true, keyword, results: rows, total: rows.length })
  }

  // 按用户查看
  if (userId) {
    const conversations = db.prepare("SELECT id, role, content, created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").all(userId, limit) as any[]
    const user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId) as any
    const summary = db.prepare("SELECT * FROM memory_summaries WHERE user_id = ?").get(userId) as any
    return NextResponse.json({
      user: user ? { user_id: user.user_id, phone: user.phone, name: user.name, created_at: user.created_at, last_active: user.last_active } : null,
      conversations: conversations.reverse(),
      total: conversations.length,
      summary: summary ? { user_state: summary.user_state, topics: JSON.parse(summary.topics || "[]"), relationship_level: summary.relationship_level, message_count: summary.message_count } : null,
    })
  }

  return NextResponse.json({ error: "请提供 userId 或 keyword 参数" }, { status: 400 })
}
