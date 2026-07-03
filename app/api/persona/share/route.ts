import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { loadPersonaProfile, getGrowthStage } from "@/lib/persona-extractor"

// 创建/删除分享
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    let userId: string
    try { userId = Buffer.from(token, 'base64').toString('utf-8') }
    catch { return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 }) }
    if (!userId || userId.length < 5) return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 })

    const { action } = await request.json()
    const db = getDb()

    if (action === 'create') {
      const profile = loadPersonaProfile(userId)
      if (!profile || profile.personaScore < 80) {
        return NextResponse.json({ success: false, error: '人格成长度不足（需≥80%，达到✨自我觉醒阶段）' }, { status: 400 })
      }

      // 检查是否已有分享
      const existing = db.prepare('SELECT share_token FROM persona_shares WHERE user_id = ? AND is_active = 1').get(userId) as any
      if (existing) {
        return NextResponse.json({ success: true, shareToken: existing.share_token, shareUrl: `/persona/${existing.share_token}` })
      }

      const shareToken = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      db.prepare('INSERT INTO persona_shares (user_id, share_token) VALUES (?, ?)').run(userId, shareToken)

      return NextResponse.json({ success: true, shareToken, shareUrl: `/persona/${shareToken}` })

    } else if (action === 'delete') {
      db.prepare('UPDATE persona_shares SET is_active = 0 WHERE user_id = ?').run(userId)
      return NextResponse.json({ success: true })

    } else {
      // 查询分享状态
      const share = db.prepare('SELECT share_token, is_active, created_at FROM persona_shares WHERE user_id = ? AND is_active = 1').get(userId) as any
      return NextResponse.json({
        success: true,
        hasShare: !!share,
        shareToken: share?.share_token || null,
        shareUrl: share ? `/persona/${share.share_token}` : null
      })
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// 查询分享信息（供分享页使用，无需登录）
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) return NextResponse.json({ success: false, error: '缺少token参数' }, { status: 400 })

    const db = getDb()
    const share = db.prepare('SELECT * FROM persona_shares WHERE share_token = ? AND is_active = 1').get(token) as any
    if (!share) return NextResponse.json({ success: false, error: '分享已失效' }, { status: 404 })

    const profile = loadPersonaProfile(share.user_id)
    if (!profile) return NextResponse.json({ success: false, error: '人格数据不存在' }, { status: 404 })

    // 加载用户名
    const user = db.prepare('SELECT name, phone FROM users WHERE user_id = ?').get(share.user_id) as any
    const displayName = user?.name || '匿名用户'

    return NextResponse.json({
      success: true,
      personaId: share.user_id,
      displayName,
      personaScore: profile.personaScore,
      stage: profile.stage,
      stageIcon: profile.stageIcon,
      summary: profile.summary,
      interests: profile.interests?.slice(0, 5).map((i: any) => i.topic) || [],
      style: profile.style,
      values: profile.values,
      decision: profile.decision,
      relationship: profile.relationship
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
