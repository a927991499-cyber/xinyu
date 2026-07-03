import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 了解深度定义
const REL_LEVELS = [
  { level: 1, name: '初识·陌生',  icon: '🌱', threshold: 0 },
  { level: 2, name: '熟悉·了解',  icon: '🔍', threshold: 120 },
  { level: 3, name: '深知·懂得',  icon: '🧠', threshold: 500 },
  { level: 4, name: '透彻·看穿',  icon: '👁️', threshold: 1500 },
  { level: 5, name: '共鸣·一体',  icon: '✨', threshold: 4000 },
]

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "无效token" }, { status: 401 })
  }

  const db = getDb()

  try {
    // 总消息数（简化查询，避免复杂WHERE）
    const row = db.prepare("SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ?").get(userId) as any
    const totalMessages = row?.cnt || 0

    // 连续天数（从 last_active）
    const userRow = db.prepare("SELECT last_active FROM users WHERE user_id = ?").get(userId) as any
    let consecutiveDays = 1
    if (userRow?.last_active) {
      const lastDate = new Date(userRow.last_active)
      const today = new Date()
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000)
      if (diffDays <= 1) consecutiveDays = 7
      else if (diffDays <= 3) consecutiveDays = 3
      else consecutiveDays = 1
    }

    const score = totalMessages + consecutiveDays * 5

    let currentLevel = REL_LEVELS[0]
    let nextLevel: any = REL_LEVELS[1]
    for (let i = 0; i < REL_LEVELS.length; i++) {
      if (score >= REL_LEVELS[i].threshold) {
        currentLevel = REL_LEVELS[i]
        nextLevel = REL_LEVELS[i + 1] || null
      }
    }

    const currentThreshold = currentLevel.threshold
    const nextThreshold = nextLevel?.threshold || currentThreshold + 1
    const progress = Math.min(100, Math.round(((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100))

    return NextResponse.json({
      success: true, score, totalMessages, consecutiveDays,
      currentLevel: { level: currentLevel.level, name: currentLevel.name, icon: currentLevel.icon },
      nextLevel: nextLevel ? { level: nextLevel.level, name: nextLevel.name, icon: nextLevel.icon, threshold: nextLevel.threshold } : null,
      progress, needScore: nextLevel ? nextLevel.threshold - score : 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
