import { NextRequest, NextResponse } from "next/server"
import { getDb, banUser, unbanUser } from "@/lib/db"
import { logAction } from "@/lib/admin-log"

/** 验证管理员身份 */
function verifyAdmin(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!token || !adminPassword) return false
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const parts = decoded.split(":")
    return parts.length === 3 && parts[1] === adminPassword
  } catch {
    return false
  }
}

/** 用户列表：统计每个用户的对话数据 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: "未授权" }, { status: 401 })

  const db = getDb()
  const url = new URL(request.url)

  // 运营统计概览
  if (url.searchParams.get("action") === "stats") {
    const total = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE phone IS NOT NULL AND phone != ''").get() as any
    const active = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE phone IS NOT NULL AND phone != '' AND last_active > datetime('now', 'localtime', '-7 days')").get() as any
    const today = db.prepare("SELECT COUNT(*) as cnt FROM conversations WHERE created_at > date('now')").get() as any
    const totalMsgs = db.prepare("SELECT COUNT(*) as cnt FROM conversations").get() as any
    const personaCount = db.prepare("SELECT COUNT(*) as cnt FROM persona_profile WHERE persona_score > 0").get() as any
    const shareCount = db.prepare("SELECT COUNT(*) as cnt FROM persona_shares WHERE is_active = 1").get() as any
    const memoriesCount = db.prepare("SELECT COUNT(*) as cnt FROM memories").get() as any
    return NextResponse.json({
      totalUsers: total.cnt, activeUsers: active.cnt, todayMessages: today.cnt,
      totalMessages: totalMsgs.cnt, personaUsers: personaCount.cnt, activeShares: shareCount.cnt,
      memoryCount: memoriesCount.cnt
    })
  }

  // 用户列表（分页，仅手机号用户，按注册时间倒序）
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100)
  const offset = (page - 1) * limit

  const users = db.prepare(`
    SELECT 
      u.user_id, u.phone, u.name, u.status, u.banned_reason, u.banned_at, u.created_at, u.last_active,
      COUNT(c.id) as message_count,
      CASE WHEN u.last_active > datetime('now','localtime','-5 minutes') THEN 1 ELSE 0 END as is_online
    FROM users u
    LEFT JOIN conversations c ON u.user_id = c.user_id
    WHERE u.phone IS NOT NULL AND u.phone != ''
    GROUP BY u.user_id
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[]
  const total = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE phone IS NOT NULL AND phone != ''").get() as any

  const usersWithInfo = (users || []).map(u => ({
    ...u,
    isOnline: u.is_online === 1,
    displayName: u.name || ''
  }))

  return NextResponse.json({ users: usersWithInfo, total: total.cnt }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  })
}

/** 封禁/解封用户 */
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId, action, reason } = body

    if (!userId || !action) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 })
    }

    if (action === 'ban') {
      if (!reason || reason.trim() === '') {
        return NextResponse.json({ error: "请填写封禁原因" }, { status: 400 })
      }
      banUser(userId, reason.trim())
      logAction("封禁用户", userId, reason.trim())
      return NextResponse.json({ success: true, status: 'banned' })
    }

    if (action === 'unban') {
      unbanUser(userId)
      return NextResponse.json({ success: true, status: 'active' })
    }

    return NextResponse.json({ error: "无效操作" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
