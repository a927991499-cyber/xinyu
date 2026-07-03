import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 用户查看自己的礼物（未领取的）
export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "无效token" }, { status: 401 })
  }

  const db = getDb()
  const gifts = db.prepare("SELECT * FROM gifts WHERE user_id = ? ORDER BY created_at DESC").all(userId)
  return NextResponse.json({ success: true, gifts })
}

// 用户填写地址领取礼物
export async function POST(request: NextRequest) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "无效token" }, { status: 401 })
  }

  const { giftId, name, phone, address } = await request.json()
  if (!giftId || !name?.trim() || !phone?.trim() || !address?.trim()) {
    return NextResponse.json({ error: "请填写完整信息" }, { status: 400 })
  }

  const db = getDb()
  const gift = db.prepare("SELECT * FROM gifts WHERE id = ? AND user_id = ? AND status = 'pending'").get(giftId, userId) as any
  if (!gift) return NextResponse.json({ error: "礼物不存在或已领取" }, { status: 404 })

  db.prepare("UPDATE gifts SET status = 'claimed', address_name = ?, address_phone = ?, address_detail = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(name.trim(), phone.trim(), address.trim(), giftId)

  return NextResponse.json({ success: true })
}
