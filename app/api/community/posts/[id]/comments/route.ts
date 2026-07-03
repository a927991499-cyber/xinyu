import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 获取评论 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const comments = db.prepare(`
    SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC
  `).all(id)
  return NextResponse.json({ comments })
}

/** 发表评论 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = req.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "Token 无效" }, { status: 401 })
  }

  const { content } = await req.json()
  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: "内容不能为空" }, { status: 400 })
  }

  const db = getDb()
  const user = db.prepare("SELECT name FROM users WHERE user_id = ?").get(userId) as any
  const result = db.prepare(`
    INSERT INTO post_comments (post_id, user_id, name, content) VALUES (?, ?, ?, ?)
  `).run(id, userId, user?.name || '匿名', content.trim())

  return NextResponse.json({ success: true, commentId: result.lastInsertRowid })
}
