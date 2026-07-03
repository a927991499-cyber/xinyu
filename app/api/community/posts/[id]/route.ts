import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 帖子详情 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const post = db.prepare("SELECT * FROM posts WHERE id = ? AND status = 'active'").get(id) as any
  if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 })
  post.images = JSON.parse(post.images || '[]')
  return NextResponse.json({ post })
}

/** 删除帖子 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = req.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "Token 无效" }, { status: 401 })
  }

  const db = getDb()
  const post = db.prepare("SELECT user_id FROM posts WHERE id = ?").get(id) as any
  if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 })
  if (post.user_id !== userId) return NextResponse.json({ error: "无权删除" }, { status: 403 })

  db.prepare("UPDATE posts SET status = 'deleted' WHERE id = ?").run(id)
  return NextResponse.json({ success: true })
}
