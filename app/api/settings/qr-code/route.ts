import { NextResponse } from "next/server"
import { getConfig } from "@/lib/config"

/** 公共接口 — 获取客服二维码 URL，无需认证 */
export async function GET() {
  const url = getConfig("contact_qr_url")
  return NextResponse.json({ success: true, url: url || null })
}
