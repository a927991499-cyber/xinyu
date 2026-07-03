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

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })

  const url = new URL(request.url)
  const userId = url.searchParams.get("userId")
  const action = url.searchParams.get("action")

  const db = getDb()

  // 按用户查看记忆
  if (action === "user" && userId) {
    const memories = db.prepare("SELECT id, content, category, icon, created_at FROM memories WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").all(userId) as any[]
    const user = db.prepare("SELECT phone, name FROM users WHERE user_id = ?").get(userId) as any
    return NextResponse.json({ success: true, memories, user })
  }

  // 记忆统计概览
  if (action === "stats") {
    const total = db.prepare("SELECT COUNT(*) as cnt FROM memories").get() as any
    const byCategory = db.prepare("SELECT category, COUNT(*) as cnt FROM memories GROUP BY category ORDER BY cnt DESC").all()
    const recent = db.prepare("SELECT m.*, u.phone FROM memories m LEFT JOIN users u ON m.user_id = u.user_id ORDER BY m.created_at DESC LIMIT 20").all() as any[]
    return NextResponse.json({ success: true, total: total.cnt, byCategory, recent })
  }

  // 默认：记忆列表（最近）
  const memories = db.prepare("SELECT m.*, u.phone FROM memories m LEFT JOIN users u ON m.user_id = u.user_id ORDER BY m.created_at DESC LIMIT 50").all() as any[]
  return NextResponse.json({ success: true, memories })
}

// 删除记忆
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "缺少id" }, { status: 400 })
  getDb().prepare("DELETE FROM memories WHERE id = ?").run(id)
  return NextResponse.json({ success: true })
}
