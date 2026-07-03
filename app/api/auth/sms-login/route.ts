import { NextRequest, NextResponse } from "next/server"
import { findOrCreateUserByPhone, verifySmsCode } from "@/lib/db"

/**
 * 短信登录/注册
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()

    console.log(`[登录] 收到请求：phone=${phone}, code=${code}`)

    // 审核专用手机号：跳过验证码（仅供小程序审核使用）
    const REVIEW_PHONE = process.env.REVIEW_PHONE || ''

    // 验证参数
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "手机号格式不正确" },
        { status: 400 }
      )
    }

    // 审核专用：跳过验证码校验
    if (phone !== REVIEW_PHONE) {
      if (!code || code.length !== 4) {
        return NextResponse.json(
          { error: "验证码格式不正确" },
          { status: 400 }
        )
      }

      // 验证验证码（从数据库验证）
      if (!verifySmsCode(phone, code)) {
        return NextResponse.json(
          { error: "验证码错误或已过期" },
          { status: 400 }
        )
      }
    }

    // 查询或创建用户
    const user = findOrCreateUserByPhone(phone)

    console.log(`✅ 用户登录成功：${phone}，user_id: ${user.user_id}`)

    // 生成token（简单方案：base64编码user_id）
    const token = Buffer.from(user.user_id).toString('base64')

    return NextResponse.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        phone: user.phone,
        created_at: user.created_at
      }
    })
  } catch (error: any) {
    console.error("❌ 登录异常：", error)
    return NextResponse.json(
      { error: "登录失败，请稍后重试：" + (error.message || "未知错误") },
      { status: 500 }
    )
  }
}
