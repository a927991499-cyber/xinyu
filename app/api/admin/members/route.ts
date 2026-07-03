import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/** 验证管理员身份 */
function verifyAdmin(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value
  const adminPassword = process.env.ADMIN_PASSWORD || "xinyu2026admin"
  if (!token || !adminPassword) return false
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const parts = decoded.split(":")
    return parts.length === 3 && parts[1] === adminPassword
  } catch {
    return false
  }
}

/** 获取会员用户列表和统计数据 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  const db = getDb()
  const { searchParams } = new URL(request.url)
  const statsOnly = searchParams.get("stats") === "true"

  // 如果只要统计数据
  if (statsOnly) {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalMembers,
        SUM(CASE WHEN member_type = 'monthly' THEN 1 ELSE 0 END) as monthlyCount,
        SUM(CASE WHEN member_type = 'quarterly' THEN 1 ELSE 0 END) as quarterlyCount,
        SUM(CASE WHEN member_type = 'yearly' THEN 1 ELSE 0 END) as yearlyCount,
        SUM(CASE WHEN member_expire < datetime('now') AND member_type != 'free' THEN 1 ELSE 0 END) as expiredCount
      FROM users
      WHERE member_type != 'free'
    `).get()

    return NextResponse.json({ stats })
  }

  // 获取会员用户列表
  const members = db.prepare(`
    SELECT 
      u.user_id,
      u.phone,
      u.name,
      u.member_type,
      u.member_expire,
      u.created_at,
      u.last_active,
      CASE 
        WHEN u.member_expire < datetime('now') AND u.member_type != 'free' THEN 1 
        ELSE 0 
      END as is_expired
    FROM users u
    WHERE u.member_type != 'free'
    ORDER BY u.member_expire DESC
  `).all()

  return NextResponse.json({ members })
}

/** 延长会员期限 */
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId, days } = body

    if (!userId || !days || days <= 0) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 })
    }

    const db = getDb()

    // 获取当前用户信息
    const user = db.prepare("SELECT member_type, member_expire FROM users WHERE user_id = ?").get(userId)

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    if (user.member_type === 'free') {
      return NextResponse.json({ error: "该用户不是会员" }, { status: 400 })
    }

    // 计算新的到期时间
    let newExpireDate
    const currentExpire = user.member_expire ? new Date(user.member_expire) : new Date()
    const now = new Date()

    // 如果已过期，从当前时间开始计算
    const baseDate = currentExpire > now ? currentExpire : now
    newExpireDate = new Date(baseDate)
    newExpireDate.setDate(newExpireDate.getDate() + parseInt(days))

    // 更新数据库
    db.prepare("UPDATE users SET member_expire = ? WHERE user_id = ?").run(
      newExpireDate.toISOString(),
      userId
    )

    return NextResponse.json({
      success: true,
      newExpire: newExpireDate.toISOString()
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
