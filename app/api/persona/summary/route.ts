import { NextRequest, NextResponse } from "next/server"
import { generatePersonaSummary } from "@/lib/persona-summarizer"
import { getDb } from "@/lib/db"

// 获取人格总结
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    let userId: string
    try { userId = Buffer.from(token, 'base64').toString('utf-8') }
    catch { return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 }) }
    if (!userId || userId.length < 5) return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 })

    const db = getDb()
    const row = db.prepare('SELECT summary_text FROM persona_summary WHERE user_id = ?').get(userId) as any
    let summary = row?.summary_text || ''

    // 如果没生成过，自动生成
    if (!summary) {
      summary = await generatePersonaSummary(userId)
    }

    return NextResponse.json({ success: true, summary })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
