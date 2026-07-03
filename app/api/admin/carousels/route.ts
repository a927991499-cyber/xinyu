import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 获取轮播图列表（管理员） */
export async function GET() {
  const db = getDb()
  const carousels = db.prepare("SELECT * FROM carousels ORDER BY sort_order ASC").all()
  return NextResponse.json({ carousels })
}

/** 添加轮播图 */
export async function POST(req: NextRequest) {
  const { image_url, title, link_url, sort_order } = await req.json()
  if (!image_url) return NextResponse.json({ error: "图片不能为空" }, { status: 400 })

  const db = getDb()
  const maxSort = (db.prepare("SELECT COALESCE(MAX(sort_order),0) as m FROM carousels").get() as any).m
  db.prepare("INSERT INTO carousels (image_url, title, link_url, sort_order) VALUES (?,?,?,?)")
    .run(image_url, title || '', link_url || '', sort_order ?? maxSort + 1)

  return NextResponse.json({ success: true })
}

/** 更新轮播图 */
export async function PUT(req: NextRequest) {
  const { id, image_url, title, link_url, sort_order, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: "缺少id" }, { status: 400 })

  const db = getDb()
  db.prepare("UPDATE carousels SET image_url=?, title=?, link_url=?, sort_order=?, is_active=? WHERE id=?")
    .run(image_url, title, link_url, sort_order, is_active ?? 1, id)

  return NextResponse.json({ success: true })
}

/** 删除轮播图 */
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "缺少id" }, { status: 400 })

  const db = getDb()
  db.prepare("DELETE FROM carousels WHERE id = ?").run(id)

  return NextResponse.json({ success: true })
}
