import { NextRequest, NextResponse } from "next/server"
import { getTimeline } from "@/lib/persona-summarizer"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    let userId: string
    try { userId = Buffer.from(token, 'base64').toString('utf-8') }
    catch { return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 }) }
    if (!userId || userId.length < 5) return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 })

    const timeline = getTimeline(userId)
    return NextResponse.json({ success: true, timeline })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
