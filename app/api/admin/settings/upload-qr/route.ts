import { NextRequest, NextResponse } from "next/server"
import { setConfig, clearConfigCache } from "@/lib/config"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export const runtime = 'nodejs'

function verifyAdmin(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value
  const adminPassword = process.env.ADMIN_PASSWORD || "xinyu2026admin"
  if (!token || !adminPassword) return false
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    return decoded.split(":")[1] === adminPassword
  } catch { return false }
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "请选择图片文件" }, { status: 400 })
    }

    // 只允许图片
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "只支持图片文件" }, { status: 400 })
    }

    // 生成唯一文件名
    const ext = file.name.split(".").pop() || "jpg"
    const filename = `qr_${Date.now()}.${ext}`
    
    // 确保 uploads 目录存在
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    // 保存文件
    const buffer = Buffer.from(await file.arrayBuffer())
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // 存储 URL 到设置
    const url = `/uploads/${filename}`
    setConfig("contact_qr_url", url)
    clearConfigCache()

    return NextResponse.json({ success: true, url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
