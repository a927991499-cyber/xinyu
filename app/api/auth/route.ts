/**
 * 用户认证 API — device-id 方式
 * POST /api/auth  Body: { deviceId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { findOrCreateUser, getUser } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json()

    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 4) {
      return NextResponse.json({ error: 'deviceId 无效' }, { status: 400 })
    }

    // findOrCreateUser 内部自动判断：存在则更新活跃时间，不存在则创建
    const user = findOrCreateUser(deviceId)
    const isNew = user.created_at === user.last_active

    return NextResponse.json({ userId: user.user_id, isNew })
  } catch (error) {
    console.error('[Auth] 错误:', error)
    return NextResponse.json({ error: '认证失败' }, { status: 500 })
  }
}
