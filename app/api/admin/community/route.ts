import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 隐藏/删除帖子 */
export async function POST(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id || !['hidden', 'deleted'].includes(status)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 })
  }
  const db = getDb()
  db.prepare("UPDATE posts SET status = ? WHERE id = ?").run(status, id)
  return NextResponse.json({ success: true })
}
