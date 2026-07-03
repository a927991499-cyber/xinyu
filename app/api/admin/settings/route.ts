import { NextRequest, NextResponse } from "next/server"
import { getAllConfig, setConfig, setConfigBatch, clearConfigCache } from "@/lib/config"

function verifyAdmin(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value
  const adminPassword = process.env.ADMIN_PASSWORD || "xinyu2026admin"
  if (!token || !adminPassword) return false
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    return decoded.split(":")[1] === adminPassword
  } catch { return false }
}

/** 获取所有系统设置（含默认值） */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })
  return NextResponse.json({ success: true, settings: getAllConfig() })
}

/** 更新单个或批量系统设置 */
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })
  try {
    const body = await request.json()
    // 批量更新
    if (body.items && Array.isArray(body.items)) {
      setConfigBatch(body.items)
      clearConfigCache()
      return NextResponse.json({ success: true, message: `已更新 ${body.items.length} 项` })
    }
    // 单个更新
    const { key, value } = body
    if (!key || value === undefined) return NextResponse.json({ error: "参数缺失" }, { status: 400 })
    setConfig(key, String(value))
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
