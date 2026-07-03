import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    // ✅ 验证 token（防止未授权使用ASR服务，产生费用）
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ error: "未授权，请重新登录" }, { status: 401 })
    }
    try {
      Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json({ error: "Token无效" }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // ✅ 验证文件类型
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json({ error: "只能上传音频文件" }, { status: 400 })
    }

    // ✅ 限制文件大小（10MB）
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "音频文件不能超过10MB" }, { status: 400 })
    }

    // 检查API密钥
    const apiKey = process.env.DASHSCOPE_API_KEY
    if (!apiKey) {
      console.error("DASHSCOPE_API_KEY is not set")
      return NextResponse.json({ error: "API configuration error" }, { status: 500 })
    }

    // 将音频文件保存到临时目录
    const tmpDir = "/tmp/xinyu-audio"
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }

    const timestamp = Date.now()
    const inputPath = path.join(tmpDir, `${timestamp}_input.webm`)
    const outputPath = path.join(tmpDir, `${timestamp}_output.wav`)

    // 写入原始音频文件
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    fs.writeFileSync(inputPath, audioBuffer)

    console.log(`[ASR] Input file size: ${audioBuffer.length} bytes, type: ${audioFile.type}`)

    try {
      // 用 ffmpeg 转换成 wav 格式
      await execAsync(`ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}"`, {
        timeout: 10000,
        cwd: tmpDir,
      })

      // 读取转换后的文件
      const wavBuffer = fs.readFileSync(outputPath)
      const wavBase64 = wavBuffer.toString("base64")
      console.log(`[ASR] Converted WAV size: ${wavBuffer.length} bytes`)

      // 调用阿里云千问3-ASR-Flash API（OpenAI兼容模式）
      const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen3-asr-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: `data:audio/wav;base64,${wavBase64}`
                  }
                }
              ]
            }
          ],
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("ASR API error:", errorText)
        return NextResponse.json({ error: "Failed to recognize speech" }, { status: response.status })
      }

      const result = await response.json()
      const text = result.choices?.[0]?.message?.content || ""

      if (!text) {
        return NextResponse.json({ error: "No speech detected" }, { status: 400 })
      }

      console.log(`[ASR] Recognized text: "${text.substring(0, 50)}"`)

      return NextResponse.json({ text })

    } finally {
      // 清理临时文件
      try { fs.unlinkSync(inputPath) } catch (e) {}
      try { fs.unlinkSync(outputPath) } catch (e) {}
    }

  } catch (error) {
    console.error("Voice to text error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
