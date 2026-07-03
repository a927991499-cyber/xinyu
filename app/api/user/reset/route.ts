import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 重置用户数据（聊天记录 + 记忆 + 人格）
export async function POST(request: NextRequest) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "无效token" }, { status: 401 })
  }

  const db = getDb()

  // 删除该用户的所有聊天记录
  db.prepare("DELETE FROM conversations WHERE user_id = ?").run(userId)
  
  // 删除该用户的所有记忆
  db.prepare("DELETE FROM memories WHERE user_id = ?").run(userId)
  
  // 删除该用户的人格数据
  db.prepare("DELETE FROM persona_profile WHERE user_id = ?").run(userId)
  
  // 重置用户 profile（保留账号信息）
  db.prepare("UPDATE users SET profile = '{}', name = NULL WHERE user_id = ?").run(userId)

  return NextResponse.json({ success: true })
}
