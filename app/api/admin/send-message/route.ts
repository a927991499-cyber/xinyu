import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 管理员验证
function verifyAdmin(request: NextRequest): boolean {
  const token = request.headers.get("Authorization") || ""
  return token === "Bearer xinyu2026admin"
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })

  const { userId, message } = await request.json()
  if (!userId || !message?.trim()) return NextResponse.json({ error: "参数缺失" }, { status: 400 })

  const db = getDb()

  // 确保用户存在
  const user = db.prepare("SELECT user_id FROM users WHERE user_id = ?").get(userId) as any
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

  // 插入消息（作为小雪发送）
  db.prepare(`INSERT INTO conversations (user_id, role, content, audio_url, audio_duration, image_url, user_audio_url, user_audio_duration, created_at) VALUES (?, 'assistant', ?, NULL, NULL, NULL, NULL, NULL, datetime('now','localtime'))`).run(userId, message.trim())

  return NextResponse.json({ success: true })
}
