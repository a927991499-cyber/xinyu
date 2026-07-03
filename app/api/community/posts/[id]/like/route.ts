import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 点赞/取消点赞 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = req.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "Token 无效" }, { status: 401 })
  }

  const db = getDb()
  const existing = db.prepare("SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?").get(id, userId)

  if (existing) {
    db.prepare("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?").run(id, userId)
    db.prepare("UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?").run(id)
    return NextResponse.json({ liked: false })
  } else {
    db.prepare("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)").run(id, userId)
    db.prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?").run(id)
    return NextResponse.json({ liked: true })
  }
}
