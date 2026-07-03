import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import fs from "fs"

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
  const db = getDb()
  const action = new URL(request.url).searchParams.get("action") || "system"

  if (action === "trend") {
    const days = 14
    const msgs = db.prepare(`SELECT date(created_at) as day, COUNT(*) as cnt FROM conversations WHERE created_at > datetime('now', '-${days} days') GROUP BY day ORDER BY day`).all()
    const users = db.prepare(`SELECT date(created_at) as day, COUNT(*) as cnt FROM users WHERE created_at > datetime('now', '-${days} days') AND phone IS NOT NULL AND phone != '' GROUP BY day ORDER BY day`).all()
    return NextResponse.json({ success: true, messages: msgs, newUsers: users })
  }

  // system status
  const totalUsers = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE phone IS NOT NULL AND phone != ''").get() as any).cnt
  const totalMsgs = (db.prepare("SELECT COUNT(*) as cnt FROM conversations").get() as any).cnt
  const personaUsers = (db.prepare("SELECT COUNT(*) as cnt FROM persona_profile WHERE persona_score > 0").get() as any).cnt

  // 服务器状态
  let uptime = "", disk = "", mem = ""
  try { uptime = require("child_process").execSync("uptime").toString().trim() } catch {}
  try { disk = require("child_process").execSync("df -h / | tail -1 | awk '{print $5}'").toString().trim() } catch {}
  try { mem = require("child_process").execSync("free -h | grep Mem | awk '{print $3\"/\"$2}'").toString().trim() } catch {}

  return NextResponse.json({ success: true, totalUsers, totalMsgs, personaUsers, uptime, disk, mem })
}
