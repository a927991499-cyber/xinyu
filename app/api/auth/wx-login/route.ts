/**
 * 微信小程序登录接口
 * 路径：/api/auth/wx-login
 * 方法：POST
 * 请求体：{ code: string }
 * 响应：{ code, openid, nickname?, avatar? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const WECHAT_APPID = process.env['WECHAT' + '_APPID'] || ''
const WECHAT_APPSECRET = process.env['WECHAT' + '_APPSECRET'] || ''

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { code: 400, content: '缺少 code 参数' },
        { status: 400 }
      )
    }

    if (!WECHAT_APPSECRET) {
      console.error('[微信登录] 未配置 WECHAT_APPSECRET')
      return NextResponse.json(
        { code: 500, content: '服务器配置错误' },
        { status: 500 }
      )
    }

    // 调用微信接口，用 code 换 openid
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}&js_code=${code}&grant_type=authorization_code`

    const wxRes = await fetch(wxUrl)
    const wxData = await wxRes.json()

    if (wxData.errcode) {
      console.error('[微信登录] 微信接口错误：', wxData)
      return NextResponse.json(
        { code: 500, content: `微信登录失败：${wxData.errmsg}` },
        { status: 500 }
      )
    }

    const { openid, session_key } = wxData

    // 写入/更新用户表
    const db = getDb()

    // 检查用户是否存在
    const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(openid)
    if (!existing) {
      db.prepare(`INSERT INTO users (user_id, device_id) VALUES (?, ?)`).run(openid, `wx_${openid}`)
    }
    db.prepare(`UPDATE users SET last_active = datetime('now','localtime') WHERE user_id = ?`).run(openid)

    console.log(`[微信登录] 成功：${openid}`)

    return NextResponse.json({
      code: 200,
      openid,
      // 前端存到本地，后续每次请求带 openid
    })

  } catch (error: any) {
    console.error('[微信登录] 错误：', error.message)
    return NextResponse.json(
      { code: 500, content: '登录失败，请重试' },
      { status: 500 }
    )
  }
}
