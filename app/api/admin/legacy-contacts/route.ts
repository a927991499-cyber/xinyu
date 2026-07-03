import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 获取所有用户的数字遗产联系人 */
export async function GET() {
  const db = getDb()
  const contacts = db.prepare(`
    SELECT lc.*, u.name as user_name, u.phone as user_phone, u.user_id
    FROM legacy_contacts lc
    LEFT JOIN users u ON lc.user_id = u.user_id
    WHERE lc.is_active = 1
    ORDER BY lc.updated_at DESC
  `).all()
  const total = (db.prepare("SELECT COUNT(*) as cnt FROM legacy_contacts WHERE is_active = 1").get() as { cnt: number }).cnt

  return NextResponse.json({ contacts, total })
}
