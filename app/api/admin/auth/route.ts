import { NextRequest, NextResponse } from "next/server"

/** 管理员登录：验证密码，设置 Cookie */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return NextResponse.json({ error: "管理员密码未配置" }, { status: 500 })
    }

    if (password !== adminPassword) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 })
    }

    // 设置加密 Cookie（Base64 + 简单混淆），30天有效
    const token = Buffer.from(`xinyu:${password}:${Date.now()}`).toString("base64")
    const response = NextResponse.json({ success: true })
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: false, // Nginx 处理 HTTPS，内部走 HTTP
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30天
      path: "/",
    })

    return response
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
}

/** 验证当前登录状态 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!token || !adminPassword) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const parts = decoded.split(":")
    if (parts.length === 3 && parts[1] === adminPassword) {
      return NextResponse.json({ authenticated: true })
    }
  } catch {
    // token 解析失败
  }

  return NextResponse.json({ authenticated: false }, { status: 401 })
}
