import { NextRequest, NextResponse } from "next/server"
import { saveConversation } from "@/lib/db"
import fs from "fs"
import path from "path"
import https from "https"
import http from "http"

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ""

const KLING_API_URL = "https://api.vectorengine.ai/kling/v1/images/generations"
const KLING_API_KEY = process.env.KLING_API_KEY || ""
const KLING_TASK_URL = "https://api.vectorengine.ai/kling/v1/images/tasks"

// 调用 DeepSeek 根据对话生成图片提示词
async function generateImagePrompt(messages: {role: string, content: string}[]): Promise<string> {
  const conversationText = messages.map(m => `${m.role === "user" ? "用户" : "小雪"}：${m.content}`).join("\n")

  const prompt = `你负责根据用户和小雪的最新对话，写出一段用于AI绘画的提示词。

【小雪形象要求】
1. 固定特征：粉色长发、有蝙蝠翅膀、可爱的亚洲女孩
2. 服装：根据对话内容动态判断 — 用户提到逛街就穿日常私服，提到做饭就穿围裙，提到约会就穿连衣裙，提到睡觉就穿睡衣，没有特别提到就穿日常休闲服
3. 表情/动作/场景：根据最近对话判断

【要求】
1. 仔细阅读最近对话，理解当前场景
2. 写出一段提示词，描述小雪当前的状态或场景
3. 角度自然，可以是自拍视角，也可以是第三人称视角，看场景决定
4. 二次元风格，动漫风格，插画风格
5. 服装必须根据对话内容选择，不要用默认服装
6. 光线自然
7. 只输出提示词本身，不要加任何解释

【最近对话】
${conversationText}

提示词：`

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    })
  })

  const data = await response.json()
  const generatedPrompt = data.choices?.[0]?.message?.content?.trim() || ""

  console.log(`[ImageGen] DeepSeek生成提示词: ${generatedPrompt}`)
  return generatedPrompt || "粉色长发女孩，穿着白色护士服，有蝙蝠翅膀，微笑，二次元风格，动漫风格，自然光线"
}

// 下载图片并返回 buffer
function downloadImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http
    
    protocol.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const location = response.headers.location
        if (location) {
          downloadImageBuffer(location).then(resolve).catch(reject)
          return
        }
      }
      
      const chunks: Buffer[] = []
      response.on("data", (chunk) => chunks.push(chunk))
      response.on("end", () => resolve(Buffer.concat(chunks)))
      response.on("error", reject)
    }).on("error", reject)
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt = body.prompt
    const messages = body.messages || []  // 最近对话
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

    let finalPrompt = prompt

    // 如果有对话记录，用 DeepSeek 生成提示词
    if (messages.length > 0) {
      console.log(`[ImageGen] 根据 ${messages.length} 条对话生成提示词...`)
      finalPrompt = await generateImagePrompt(messages)
    }

    if (!finalPrompt || typeof finalPrompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    console.log(`[ImageGen] 用户 ${userId} 请求生成图片: ${finalPrompt}`)

    // 1. 读取参考图
    const refImagePath = path.join(process.cwd(), "public", "ref", "xiaoxue-reference.png")

    let imageBase64 = ""
    try {
      const imageBuffer = fs.readFileSync(refImagePath)
      imageBase64 = imageBuffer.toString("base64")
    } catch (e: any) {
      console.error("[ImageGen] 参考图读取失败:", e.message)
      return NextResponse.json({ error: "参考图不存在，请联系管理员" }, { status: 500 })
    }

    // 2. 调用可灵 API
    const requestBody = {
      model_name: "kling-v1-5",
      prompt: finalPrompt,
      negative_prompt: "模糊、低质量、变形、丑陋、多余手指、文字、水印、过于艺术化、真人照片风格、写实风格、3D渲染",
      image: imageBase64,
      image_reference: "subject",
      human_fidelity: 0.6,
      resolution: "1k",
      n: 1,
      aspect_ratio: "9:16"
    }
    
    console.log(`[ImageGen] 调用可灵 API...`)
    
    const klingResponse = await fetch(KLING_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KLING_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })
    
    const klingData = await klingResponse.json()
    
    if (klingData.code !== 0) {
      console.error("[ImageGen] 可灵 API 提交失败:", klingData)
      return NextResponse.json({ error: "图片生成提交失败", detail: klingData.message }, { status: 500 })
    }
    
    const taskId = klingData.data.task_id
    console.log(`[ImageGen] 任务已提交: ${taskId}`)
    
    // 3. 轮询等待生成完成（最多 90 秒）
    let klingImageUrl = ""
    for (let i = 0; i < 12; i++) {
      await new Promise(resolve => setTimeout(resolve, 7500))
      
      const taskResponse = await fetch(`${KLING_TASK_URL}/${taskId}`, {
        headers: { "Authorization": `Bearer ${KLING_API_KEY}` }
      })
      const taskData = await taskResponse.json()
      
      const status = taskData.data?.task_status
      console.log(`[ImageGen] 轮询 ${i+1}/12: ${status}`)
      
      if (status === "succeed") {
        klingImageUrl = taskData.data?.task_result?.images?.[0]?.url
        if (klingImageUrl) {
          console.log(`[ImageGen] ✅ 可灵生成成功!`)
          break
        }
      }
      
      if (status === "failed") {
        console.error("[ImageGen] 生成失败:", taskData.data?.error)
        return NextResponse.json({ error: "图片生成失败", detail: taskData.data?.error }, { status: 500 })
      }
    }
    
    if (!klingImageUrl) {
      return NextResponse.json({ error: "图片生成超时，请稍后重试" }, { status: 504 })
    }
    
    // 4. 下载图片并保存到文件
    console.log(`[ImageGen] 下载可灵图片...`)
    const imageBuffer = await downloadImageBuffer(klingImageUrl)
    
    // 保存到 /public/generated-images/
    const imagesDir = path.join(process.cwd(), "public", "generated-images")
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
    const imageFileName = `${userId}-${Date.now()}.png`
    const imagePath = path.join(imagesDir, imageFileName)
    fs.writeFileSync(imagePath, imageBuffer)
    const imageUrl = `/api/images/${imageFileName}`
    
    console.log(`[ImageGen] ✅ 图片已保存: ${imageUrl} (${(imageBuffer.length / 1024).toFixed(1)} KB)`)
    
    // 5. 保存图片消息到数据库
    try {
      saveConversation(userId, "assistant", "（发送一张照片）", null, null, imageUrl)
      console.log(`[ImageGen] ✅ 已保存图片消息到DB: ${imageUrl}`)
    } catch(e: any) {
      console.error('[ImageGen] 保存DB失败:', e.message)
    }
    
    // 6. 返回图片URL（前端直接用）
    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,  // URL 格式，前端 <img src={imageUrl} />
      prompt: prompt
    })
    
  } catch (error: any) {
    console.error("[ImageGen] 错误:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
