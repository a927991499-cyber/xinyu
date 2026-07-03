import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

function verifyAdmin(request: NextRequest): boolean {
  const token = request.headers.get("Authorization") || ""
  return token === "Bearer xinyu2026admin"
}

// 管理员送礼物 / 标记完成
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })

  const body = await request.json()
  const db = getDb()

  // 标记已完成
  if (body.action === "complete" && body.id) {
    db.prepare("UPDATE gifts SET status = 'completed', updated_at = datetime('now','localtime') WHERE id = ?").run(body.id)
    return NextResponse.json({ success: true })
  }

  // 送礼物
  const { userId, content } = body
  if (!userId || !content?.trim()) return NextResponse.json({ error: "参数缺失" }, { status: 400 })

  const user = db.prepare("SELECT user_id FROM users WHERE user_id = ?").get(userId) as any
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

  db.prepare("INSERT INTO gifts (user_id, content, status) VALUES (?, ?, 'pending')").run(userId, content.trim())
  return NextResponse.json({ success: true })
}

// 管理员查看所有礼物（含地址）
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })

  const db = getDb()
  const gifts = db.prepare("SELECT g.*, u.phone FROM gifts g LEFT JOIN users u ON g.user_id = u.user_id ORDER BY g.created_at DESC LIMIT 100").all()
  return NextResponse.json({ success: true, gifts })
}
