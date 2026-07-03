import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 读取用户档案
export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch { return NextResponse.json({ error: "无效token" }, { status: 401 }) }

  const db = getDb()
  const user = db.prepare("SELECT profile FROM users WHERE user_id = ?").get(userId) as any
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

  let profile: Record<string, any> = {}
  try { profile = JSON.parse(user.profile || "{}") } catch {}
  return NextResponse.json({ success: true, profile })
}

// 更新单个字段
export async function POST(request: NextRequest) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch { return NextResponse.json({ error: "无效token" }, { status: 401 }) }

  const { field, value } = await request.json()
  if (!field) return NextResponse.json({ error: "缺少字段名" }, { status: 400 })

  const db = getDb()
  const user = db.prepare("SELECT profile FROM users WHERE user_id = ?").get(userId) as any
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

  let profile: Record<string, any> = {}
  try { profile = JSON.parse(user.profile || "{}") } catch {}
  profile[field] = value

  db.prepare("UPDATE users SET profile = ? WHERE user_id = ?").run(JSON.stringify(profile), userId)
  return NextResponse.json({ success: true, profile })
}
