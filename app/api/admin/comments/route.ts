import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 获取全部评论（管理员） */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100)
  const offset = (page - 1) * limit

  const db = getDb()
  const comments = db.prepare(`
    SELECT c.*, p.content as post_content, p.name as post_author
    FROM post_comments c
    LEFT JOIN posts p ON c.post_id = p.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[]

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM post_comments").get() as { cnt: number }).cnt

  return NextResponse.json({ comments, total, page, totalPages: Math.ceil(total / limit) })
}

/** 删除评论 */
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "缺少id" }, { status: 400 })

  const db = getDb()
  db.prepare("DELETE FROM post_comments WHERE id = ?").run(id)
  return NextResponse.json({ success: true })
}
