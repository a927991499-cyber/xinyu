import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 获取轮播图 */
export async function GET() {
  const db = getDb()
  const carousels = db.prepare(`
    SELECT * FROM carousels WHERE is_active = 1 ORDER BY sort_order ASC
  `).all()
  return NextResponse.json({ carousels })
}
