import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// 支持多个图片目录（白名单）
const IMAGE_DIRS = [
  path.join(process.cwd(), "public", "generated-images"),
  path.join(process.cwd(), "public", "avatars"),
]

// 动态提供图片文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: filePath } = await params
    const fileName = filePath[filePath.length - 1]  // 只取文件名，忽略路径

    // ✅ 严格检查：只允许文件名，不允许路径
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    // ✅ 验证文件扩展名（只允许图片）
    const ext = path.extname(fileName).toLowerCase()
    if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // 在多个目录中查找文件
    let fullPath: string | null = null
    for (const dir of IMAGE_DIRS) {
      const testPath = path.join(dir, fileName)  // ✅ 只用文件名，不用完整路径
      if (fs.existsSync(testPath)) {
        fullPath = testPath
        break
      }
    }

    // 检查文件是否存在
    if (!fullPath) {
      console.error(`[ImagesAPI] 文件不存在: ${fileName}`)
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // 读取文件
    const imageBuffer = fs.readFileSync(fullPath)

    // 根据扩展名设置 Content-Type
    const contentTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
    }
    const contentType = contentTypes[ext] || "application/octet-stream"

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 缓存1天
      },
    })
  } catch (error: any) {
    console.error("[ImagesAPI] 错误:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
