import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getDb } from "@/lib/db"

// 上传头像
export async function POST(request: NextRequest) {
  try {
    console.log('[UploadAvatar] 收到请求')

    // 从 token 解析 userId（不信任前端传入的 userId）
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ success: false, error: '未授权，请重新登录' }, { status: 401 })
    }
    let userId: string
    try {
      userId = Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }
    if (!userId || userId.length < 5) {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    console.log('[UploadAvatar] userId:', userId, 'file:', file?.name, 'size:', file?.size)

    if (!file) {
      console.error('[UploadAvatar] 缺少参数')
      return NextResponse.json({ success: false, error: "缺少参数" }, { status: 400 })
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      console.error('[UploadAvatar] 文件类型错误:', file.type)
      return NextResponse.json({ success: false, error: "只能上传图片" }, { status: 400 })
    }

    // 生成文件名
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `avatar-${userId}-${Date.now()}.${ext}`
    const filePath = path.join(process.cwd(), 'public', 'avatars', fileName)

    console.log('[UploadAvatar] 保存路径:', filePath)

    // 确保目录存在
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // 保存文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    console.log('[UploadAvatar] 文件已保存，大小:', buffer.length, 'bytes')

    // 返回URL（直接放在 /api/images/ 下）
    const avatarUrl = `/api/images/${fileName}`

    // 更新数据库
    const db = getDb()
    db.prepare(`UPDATE users SET avatar_url = ? WHERE user_id = ?`).run(avatarUrl, userId)

    console.log('[UploadAvatar] 数据库已更新，avatarUrl:', avatarUrl)

    return NextResponse.json({
      success: true,
      avatarUrl: avatarUrl
    })
  } catch (error: any) {
    console.error('[UploadAvatar] 错误:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
