import { NextRequest, NextResponse } from "next/server"
import { saveSmsCode, getDb } from "@/lib/db"
import RPCClient from "@alicloud/pop-core"

/**
 * 发送短信验证码
 * ⚠️ 频率限制 + 冷启动保护（静态导入，避免首次请求409/400）
 */
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "手机号格式不正确" },
        { status: 400 }
      )
    }

    // ✅ 频率限制：检查60秒内是否发送过
    const db = getDb()
    const recentSms = db.prepare(
      `SELECT created_at FROM sms_codes WHERE phone = ? AND created_at > datetime('now', '-60 seconds')`
    ).get(phone) as any

    if (recentSms) {
      return NextResponse.json(
        { error: "发送过于频繁，请60秒后再试" },
        { status: 429 }
      )
    }

    // ✅ 每日限制：检查今天是否超过5次
    const todayCount = db.prepare(
      `SELECT COUNT(*) as cnt FROM sms_codes WHERE phone = ? AND created_at > datetime('now', 'start of day')`
    ).get(phone) as { cnt: number }

    if (todayCount.cnt >= 5) {
      return NextResponse.json(
        { error: "今日发送次数已达上限（5次），请明天再试" },
        { status: 429 }
      )
    }

    // 生成4位验证码（匹配阿里云模板）
    const code = Math.floor(1000 + Math.random() * 9000).toString()

    // 保存验证码到数据库（5分钟有效）
    saveSmsCode(phone, code)

    // 发送短信（使用 @alicloud/pop-core 的 RPCClient — 静态导入，服务器启动时加载）
    const Client = (RPCClient as any).default || (RPCClient as any).RPCClient || RPCClient
    const client = new Client({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      endpoint: "https://dysmsapi.aliyuncs.com",
      apiVersion: "2017-05-25"
    })

    const params = {
      PhoneNumbers: phone,
      SignName: process.env.SMS_SIGN_NAME!,
      TemplateCode: process.env.SMS_TEMPLATE_CODE!,
      TemplateParam: JSON.stringify({ code })
    }

    const result: any = await client.request("SendSms", params, {
      method: "POST",
      format: "JSON"
    })

    if (result.Code === "OK") {
      console.log(`✅ 短信发送成功，手机号：${phone}，验证码：${code}`)
      return NextResponse.json({ success: true, message: "验证码发送成功" })
    } else {
      const errMsg = result.Message || "短信发送失败"
      console.error(`❌ 短信发送失败：code=${result.Code} msg=${errMsg} requestId=${result.RequestId || 'N/A'}`)
      return NextResponse.json(
        { error: errMsg },
        { status: 500 }
      )
    }
  } catch (error: any) {
    // 完整记录错误信息，包括阿里云的 requestId
    const errDetail = {
      message: error.message,
      code: error.code,
      data: error.data,
      url: error.url
    }
    console.error("❌ 发送验证码异常：", JSON.stringify(errDetail, null, 2))
    return NextResponse.json(
      { error: error.message || "发送验证码失败，请稍后重试" },
      { status: 500 }
    )
  }
}
