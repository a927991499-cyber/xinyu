import { NextRequest, NextResponse } from "next/server"
import { getLogs } from "@/lib/admin-log"

function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return false
  try {
    const d = Buffer.from(token, "base64").toString("utf-8")
    return d.split(":")[1] === (process.env.ADMIN_PASSWORD || "xinyu2026admin")
  } catch { return false }
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })
  const limit = parseInt(new URL(request.url).searchParams.get("limit") || "100")
  return NextResponse.json({ success: true, logs: getLogs(limit) })
}
