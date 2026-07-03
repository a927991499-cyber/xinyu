import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 获取用户的数字遗产联系人 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "Token 无效" }, { status: 401 })
  }

  const db = getDb()
  const contact = db.prepare("SELECT * FROM legacy_contacts WHERE user_id = ?").get(userId) as any

  return NextResponse.json({ contact: contact || null })
}

/** 保存/更新数字遗产联系人 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") || ""
    const token = auth.replace("Bearer ", "")
    let userId = ""
    try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
      return NextResponse.json({ error: "Token 无效" }, { status: 401 })
    }

    const { name, phone, email, message } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "联系人姓名不能为空" }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare("SELECT id FROM legacy_contacts WHERE user_id = ?").get(userId)

    if (existing) {
      db.prepare(`
        UPDATE legacy_contacts SET name = ?, phone = ?, email = ?, message = ?, updated_at = datetime('now') WHERE user_id = ?
      `).run(name.trim(), phone || '', email || '', message || '', userId)
    } else {
      db.prepare(`
        INSERT INTO legacy_contacts (user_id, name, phone, email, message) VALUES (?, ?, ?, ?, ?)
      `).run(userId, name.trim(), phone || '', email || '', message || '')
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
