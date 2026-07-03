import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 帖子列表（分页） */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50)
  const offset = (page - 1) * limit
  const db = getDb()

  const posts = db.prepare(`
    SELECT p.*, 
      CASE WHEN pl.id IS NOT NULL THEN 1 ELSE 0 END as liked,
      (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
    FROM posts p
    LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = ?
    WHERE p.status = 'active'
    ORDER BY p.is_pinned DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all('', limit, offset) as any[]

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status='active'").get() as { cnt: number }).cnt

  return NextResponse.json({ posts, total, page, totalPages: Math.ceil(total / limit) })
}

/** 发帖 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") || ""
    const token = auth.replace("Bearer ", "")
    let userId = ""
    try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
      return NextResponse.json({ error: "Token 无效" }, { status: 401 })
    }

    const { content, images } = await req.json()
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 })
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "内容过长" }, { status: 400 })
    }

    const db = getDb()
    const user = db.prepare("SELECT name, avatar_url FROM users WHERE user_id = ?").get(userId) as any
    const result = db.prepare(`
      INSERT INTO posts (user_id, name, avatar, content, images) VALUES (?, ?, ?, ?, ?)
    `).run(userId, user?.name || '小雪的朋友', user?.avatar_url || '', content.trim(), JSON.stringify(images || []))

    return NextResponse.json({ success: true, postId: result.lastInsertRowid })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
