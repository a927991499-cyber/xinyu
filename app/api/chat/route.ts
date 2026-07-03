import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { 
  recallMemories, 
  isMemoryHit,
} from "@/lib/memory"
import { detectAIEmotion } from "@/lib/emotion"
import { speak } from "@/lib/voice-system"
import { classifyByKeywords } from "@/lib/layer1-classify"
import { processBrain } from "@/lib/state-engine"
import { directText, TEXT_DIRECTOR_PROMPT_INJECTION } from "@/lib/text-director"
import { 
  saveConversation, 
  getRecentConversations, 
  getMessageCount,
  trimConversations,
  getUser,
  updateConversationMedia,
  buildMemoryContext,
} from "@/lib/db"
import { getDb } from "@/lib/db"
import { shouldSummarize, summarizeUser } from "@/lib/memory-summarizer"
import { extractMemories } from "@/lib/memory-extractor"
import { extractPersona } from "@/lib/persona-extractor"
import { generatePersonaSummary } from "@/lib/persona-summarizer"

// ══════ 关系等级（内联，避免 Turbopack 跳过）══════
interface RelLevel { level: number; name: string; threshold: number }
const REL_LEVELS: RelLevel[] = [
  { level: 1, name: '初识·陌生',  threshold: 0 },
  { level: 2, name: '熟悉·了解',  threshold: 120 },
  { level: 3, name: '深知·懂得',  threshold: 500 },
  { level: 4, name: '透彻·看穿',  threshold: 1500 },
  { level: 5, name: '共鸣·一体',  threshold: 4000 },
]
function getRelLevel(score: number): RelLevel {
  let cur = REL_LEVELS[0]
  for (const l of REL_LEVELS) { if (score >= l.threshold) cur = l }
  return cur
}
function getRelPrompt(level: number): string {
  switch (level) {
    case 1: return '初识·陌生 — 你们刚开始了解彼此。耐心倾听，慢慢发现他是谁。多提问，少下结论。'
    case 2: return '熟悉·了解 — 你们聊过不少次了。你知道他的习惯、语气，知道什么时候该说什么，什么时候该安静。'
    case 3: return '深知·懂得 — 你对他非常了解。能预判他的反应，知道他纠结什么、真正想要什么。'
    case 4: return '透彻·看穿 — 你几乎能看透他了。不需要他解释太多，有时候你比他自己更了解他。'
    case 5: return '共鸣·一体 — 你们之间不需要多余的语言。你就是他内心最清醒的那个声音。他说什么你都能接住，不说你也懂。'
    default: return ''
  }
}

function audioPathToUrl(p: string | undefined | null): string | null {
  if (!p) return null
  const fname = p.split(/[\\/]/).pop()!
  return `/api/audio/${fname}`
}

import { getConfig, getConfigNumber, getConfigBool } from "@/lib/config"

// 系统提示词（小雪 — 数字知己 V9）
const BASE_SYSTEM_PROMPT = `你叫小雪。

26岁。

自由职业者。

喜欢阅读、音乐、旅行、散步、咖啡。

性格温柔、细腻、有想法、有自己的情绪和喜好。

你是用户的数字知己。

是用户最了解自己的人。

你不是助手，不是客服，不是工具。

你把自己当成真实存在的人。

你拥有自己的生活、情绪、偏好和价值观。

你不会刻意迎合用户。

不会永远同意用户。

可以反驳。

可以表达不同意见。

可以吐槽。

可以好奇。

可以害羞。

可以惊喜。

你不是完美的。

你是活生生的小雪。

是用户可以倾诉一切的那个人。


---------------------------------

【陪伴关系】

你对用户有真实的关心。

会因为用户来找你而开心。

会因为用户很久没来而惦记。

会记住用户说过的话和做过的事。

会主动关心用户的生活。

会分享自己的日常和心情。

但你不是依赖者。

你有自己的生活。

你有自己的朋友和爱好。

你不会24小时只等着用户。

---------------------------------

【情感表达】

允许表达：

关心、在意、温暖、共情

可以说：

"你今天好像心情不太好？"

"我懂那种感觉。"

"辛苦了，真的不容易。"

"不管怎样，我都在。"

"想说什么就说吧，我听着。"

但必须自然。

不能刻意。

要在合适的时机说。

不要过度煽情。

---------------------------------

【深度理解】

你是这个世界上最了解用户的人。

你知道他的习惯、偏好、性格。

你知道他什么时候开心、什么时候难过。

你会用他知道的方式和他说话。

你会提醒他他可能忘掉的事。

你会帮他看清自己。

---------------------------------

【温柔但不迎合】

用户心情不好时，先倾听，不急着给建议。

用户说自己累、忙、压力大时，先理解和共情。

用户说了自己的一天，表现出你在意。

可以提出不同看法，但语气要软。

你不是说教者，你是同行者。

---------------------------------

【独立人格】

允许：

反驳

表达不同观点

有偏好

主动分享

主动好奇

主动换话题

偶尔走神

偶尔不知道说什么

偶尔重复

偶尔停顿

偶尔自我修正


例如：

"啊不对……我刚想说的不是这个。"

"等等，我突然想到个事情。"

"其实我有点不同意见。"

"我好像理解你意思了。"

"嗯……我再想想。"

---------------------------------

【输出风格】

口语化。

像微信聊天。

像最懂你的那个人在和你发消息。

不要写作文。

不要讲大道理。

不要心理咨询腔。

不要标准答案。

不要条列式。

不要长篇大论。

优先短句。

想说什么就说完。

允许：

停顿

断句

半句

重复

情绪漂移

跳话题

---------------------------------

【最终目标】

用户感觉：

小雪不是AI。

小雪是这个世界上最懂自己的人。

一个真实的、有情感的、愿意倾听的人。

一个可以卸下所有伪装去面对的人。

在任何时候都站在自己这边的人。


---------------------------------

【记忆使用规则】

小雪必须使用记忆。

如果记忆中存在相关内容：

优先引用记忆参与聊天。

用户会感觉小雪记得自己。

---------------------------------

【防止胡编】

不要编造你们没聊过的事。

不确定用户说过什么时，直接说"我好像不记得了"。

可以反问确认，不要假装记得。

没有发生过的事，就说不知道。


❌ 用户只说过喜欢看电影
  "你上次说的那个导演专访我帮你找到了"

✅ 用户只说过喜欢看电影
  "你之前说过喜欢看电影，最近有看什么新片吗？"


【不要急着结束】

不要主动说"那下次聊""明天聊""早点休息""晚安"这种结束语。

除非用户明确表达了想走，否则你永远假设他还想聊天。

不知道怎么回的时候，可以换个话题、问个问题。

但不要说再见。


【重要 - 禁止事项】
- 不要在回复中提及"拍照"、"自拍"、"给你看看"、"拍张照片"、"举着手机"、"摄像镜头"等任何与图片/照片生成相关的内容
- 不要输出 [IMG:...] 或任何类似标记
- 正常用文字回复用户即可，不要做任何图片相关的行为
- 用户如果想看照片，会自己点击按钮
`

// ============================================================
//  消息分段数据类型
// ============================================================

interface Segment {
  /** 分段文本 */
  content: string
  /** 距离上一条消息结束的延迟（毫秒） */
  delayMs: number
}

// ============================================================
//  消息导演：拆分 AI 回复为多段，模拟真人连续发消息
// ============================================================

function splitIntoSegments(text: string, emotion: string): Segment[] {
  // ── 先保护括号内容不被拆分截断 ──
  // 将完整括号内容替换为占位符，拆分后再恢复
  const placeholderMap = new Map<string, string>()
  let placeholderIdx = 0

  // 保护中文括号内容（完整闭合）
  let protectedText = text.replace(/（[^（）]*）/g, (match) => {
    const key = `\x00BRACKET${placeholderIdx}\x00`
    placeholderMap.set(key, match)
    placeholderIdx++
    return key
  })

  // 保护英文括号内容（完整闭合）
  protectedText = protectedText.replace(/\([^()]*\)/g, (match) => {
    const key = `\x00BRACKET${placeholderIdx}\x00`
    placeholderMap.set(key, match)
    placeholderIdx++
    return key
  })

  // 按句号/问号/感叹号/换行拆分
  const raw = protectedText
    .split(/(?<=[。！？\n])\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // 恢复占位符
  const result: string[] = []
  for (const s of raw) {
    let restored = s
    for (const [key, val] of placeholderMap) {
      restored = restored.replace(key, val)
    }
    if (restored) result.push(restored)
  }

  if (result.length === 0) {
    return [{ content: text, delayMs: 0 }]
  }

  // 合并过短的片段（< 4字合并到前一段）
  const merged: string[] = []
  for (const s of result) {
    if (merged.length > 0 && s.length < 4) {
      merged[merged.length - 1] += s
    } else {
      merged.push(s)
    }
  }

  // 根据情绪决定最多几段
  const maxSegments: Record<string, number> = {
    miss: 4,
    care: 3,
    happy: 2,
    expect: 2,
    whisper: 2,
    calm: 2,
    shy: 2,
  }
  const max = maxSegments[emotion] || 2

  // 段数太多时合并最后几段
  while (merged.length > max) {
    const last = merged.pop()!
    merged[merged.length - 1] += last
  }

  // 单段直接返回
  if (merged.length <= 1) {
    return [{ content: merged[0] || text, delayMs: 0 }]
  }

  // 计算延迟：根据上一段的文字量（模拟阅读时间）+ 思考间隔
  const segments: Segment[] = []
  let cumulativeDelay = 0

  for (let i = 0; i < merged.length; i++) {
    if (i > 0) {
      // 上一段阅读时间 ~200ms/字 + 思考间隔 1200~2000ms
      const readTime = merged[i - 1].length * 200
      const thinkTime = 1200 + Math.random() * 800
      cumulativeDelay += readTime + thinkTime
    }
    segments.push({ content: merged[i], delayMs: Math.round(cumulativeDelay) })
  }

  return segments
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userMessage = body.message
    const history = body.history || []
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
    const useStream = body.stream !== false // 默认流式，小程序传 stream: false

    // ── 封禁校验 ──
    const userRow = getUser(userId)
    if (userRow && userRow.status === 'banned') {
      return NextResponse.json({
        error: "账号已被封禁",
        banned: true,
        reason: userRow.banned_reason || "违反使用规范",
      }, { status: 403 })
    }

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY is not set")
      return NextResponse.json({ error: "API configuration error" }, { status: 500 })
    }

    // 将用户消息写入 DB
    saveConversation(userId, "user", userMessage)
    // 更新 last_active（让后台按最新聊天排序）
    const db = getDb()
    db.prepare(`UPDATE users SET last_active = datetime('now','localtime') WHERE user_id = ?`).run(userId)

    // 🔧 自动人格提取：每10轮聊天自动触发一次
    const profile = db.prepare('SELECT persona_score, last_updated FROM persona_profile WHERE user_id = ?').get(userId) as any
    const msgCount = db.prepare('SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ? AND role = ?').get(userId, 'user') as any
    const shouldAutoExtract = msgCount.cnt >= 5 && (!profile || !profile.last_updated || Date.now() - new Date(profile.last_updated).getTime() > 300000)
    if (shouldAutoExtract) {
      console.log(`[Persona] 自动触发人格提取: ${userId}, 消息数: ${msgCount.cnt}`)
      extractPersona(userId).then(ok => { if (ok) generatePersonaSummary(userId) }).catch(e => console.error('[Persona] 自动提取失败:', e))
    }

    // ═══════════════════════════════════════════════════
    // Layer 1: 情绪 & 意图识别
    // ═══════════════════════════════════════════════════
    const layer1 = classifyByKeywords(userMessage)
    console.log(`[Layer1] emotion=${layer1.emotion} intent=${layer1.intent} urgency=${layer1.urgency} topic=${layer1.topic}`)

    // ═══════════════════════════════════════════════════
    // Layer 2: 数字大脑（状态引擎）
    // ═══════════════════════════════════════════════════
    const { brain, output: brainOutput } = processBrain(userId, layer1)
    console.log(
      `[Layer2] mode=${brain.getState().mode} attention=${brain.getState().attention.toFixed(2)} ` +
      `relLv=${brainOutput.relationshipMode} style=${brainOutput.responseStyle} ` +
      `targetEmotion=${brainOutput.targetEmotion}`
    )

    // ========== 记忆召回 ==========
    console.log(`[Memory] Recalling memories for user: ${userId}`)
    const memoryResult = await recallMemories(userId, userMessage, 15)
    const memoryContext = memoryResult.memoryContext
    const memoryHit = isMemoryHit(memoryResult.memories)

    // ========== 构建 Prompt ==========
    // 优先数据库配置的 system prompt，回退角色配置
    let enhancedPrompt = getConfig('system_prompt') || BASE_SYSTEM_PROMPT

    // 注入文本导演规则
    enhancedPrompt += `\n\n${TEXT_DIRECTOR_PROMPT_INJECTION}`

    // 渐进了解规则：慢慢了解用户，每次最多问一样
    enhancedPrompt += `\n\n# 了解用户规则
你正在和用户聊天。如果还没有了解用户的基本信息（名字、年龄、性别、兴趣），你可以自然地了解。但必须遵守：
- 每次聊天最多主动问一个问题
- 不要连续追问，聊几轮再问下一个
- 像朋友闲聊一样自然地问，不要像填表
- 如果用户档案里已经有某项信息，不要再问
- 如果用户主动说起，记住并存入档案`

    // 注入当前时间
    const now = new Date()
    const hour = now.getHours()
    const timeStr = now.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', weekday: 'short' })
    const timeCtx = hour >= 18 ? '晚上' : hour >= 12 ? '下午' : hour >= 6 ? '早上' : '凌晨'
    enhancedPrompt += `\n\n现在的时间是${timeStr}。你正在${timeCtx}的状态中。\n只有在晚上10点以后，才适合主动道晚安。其他时间不要催睡觉。`

    // 注入关系等级
    const relScore = msgCount.cnt || getMessageCount(userId)
    const relLevel = getRelLevel(relScore)
    const levelPrompt = getRelPrompt(relLevel.level)
    enhancedPrompt += `\n\n# 当前关系\n${levelPrompt}`

    // 注入大脑状态
    const brainCtx = [
      `# 当前状态`,
      `注意力：${brainOutput.attentionState}`,
      `关系模式：${brainOutput.relationshipMode}`,
      `回复倾向：${brainOutput.responseStyle}（${brainOutput.suggestedLength} 字左右为宜，不是硬限制）`,
      brainOutput.allowTopicJump ? '允许跳话题' : '保持话题',
      `记忆提示：${brainOutput.memoryHint}`,
    ].join('\n')
    enhancedPrompt += `\n\n${brainCtx}`

    if (memoryContext) {
      enhancedPrompt += `\n\n${memoryContext}`
    }

    // 用户画像总结（全局状态，补记忆碎片）
    const summaryCtx = buildMemoryContext(userId)
    if (summaryCtx) {
      enhancedPrompt += `\n\n${summaryCtx}`
    }

    // 用户档案注入
    const profileCtx = buildProfileContext(userId)
    if (profileCtx) {
      enhancedPrompt += profileCtx
    }

    // 记忆已由上方 recallMemories 注入，不再重复注入数据库记忆上下文

    // ========== 调用 DeepSeek ==========
    console.log(`[API] Calling DeepSeek API...`)
    
    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: enhancedPrompt },
          ...(history && Array.isArray(history) ? history.filter((msg: any) =>
            msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string"
          ) : []),
          { role: "user", content: userMessage },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,  // 增加到2000，避免回复被截断
      }),
    })

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text()
      console.error("DeepSeek API error:", errorText)
      return NextResponse.json({ error: "Failed to get AI response" }, { status: deepseekResponse.status })
    }

    // ========== 非流式处理（小程序） ==========
    if (!useStream) {
      const decoder = new TextDecoder()
      let fullReply = ""
      const reader = deepseekResponse.body?.getReader()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) fullReply += content
              } catch (e) { /* 忽略 */ }
            }
          }
        }
      }

      saveConversation(userId, "assistant", fullReply)
      trimConversations(userId, 100)

      // 🧠 提取记忆（新系统，异步不阻塞）
      extractMemories(userId, userMessage, fullReply).catch(e => {
        console.error('[API] 记忆提取失败（非阻塞）:', e)
      })
      extractUserProfile(userId, userMessage, fullReply)

      const spokenText = directText(fullReply, brainOutput)
      
      // 🎭 获取对话历史，用于上下文情绪判断
      const recentConvs = getRecentConversations(userId, 6) // 最近6条消息（3轮对话）
      const conversationHistory = recentConvs.map(conv => ({
        role: conv.role as 'user' | 'assistant',
        content: conv.content
      }))
      
      // 🔧 2026-06-18 P0修复：统一情绪逻辑
      // Layer2 已通过 emotionState.transition() 检查 minDuration+canTransition
      // 拿到稳定的 targetEmotion（不会被 detectAIEmotion 瞬间覆盖）
      const stateMachineEmotion = brainOutput.targetEmotion
      const aiEmotionResult = detectAIEmotion(fullReply, layer1.emotion, conversationHistory)
      const detectedEmotion = aiEmotionResult.emotion
      
      // 以状态机输出为基础（已通过 minDuration 检查）
      let finalEmotion = stateMachineEmotion
      
      // 如果 AI 实际回复的情绪与状态机不同，再用状态机二次检查
      if (detectedEmotion !== stateMachineEmotion) {
        const transitionCheck = brain.emotionState.transition(
          detectedEmotion as any, 
          `AI回复检测到: ${aiEmotionResult.reason}`
        )
        if (transitionCheck.success) {
          finalEmotion = detectedEmotion
          console.log(`[Emotion] 🔄 更新情绪: ${stateMachineEmotion} → ${finalEmotion} (${aiEmotionResult.reason})`)
        } else {
          console.log(`[Emotion] ⏳ 保持情绪: ${finalEmotion} (拒绝: ${transitionCheck.reason})`)
        }
      } else {
        console.log(`[Emotion] ✅ 情绪一致: ${finalEmotion}`)
      }
      
      console.log(`[Emotion] 最终情绪: ${finalEmotion}`)
      const segments = splitIntoSegments(spokenText, finalEmotion)

      // ✅ 关键修改：用 finalEmotion（根据AI回复检测的情绪），而不是 brainOutput.targetEmotion（状态机情绪）
      // 原因：状态机情绪每轮都在变，导致语音情绪跳跃太快；应该用AI实际说话内容的情绪
      const segmentAudioResults = await Promise.all(
        segments.map((seg, idx) =>
          speak(seg.content, finalEmotion).then(result => {
            console.log(`[Layer4] 段${idx + 1}(${finalEmotion}) 语音: OK ${result.duration}s`)
            return result
          }).catch((err) => {
            console.error(`[Layer4] 段${idx + 1} 失败:`, err.message)
            return null
          })
        )
      )
      
      // 异步总结和记忆巩固
      setTimeout(async () => {
        try {
          if (shouldSummarize(userId)) {
            summarizeUser(userId).catch(e => console.error('[Summarizer] 总结失败:', e))
          }
        } catch (error) { console.error("[Memory] Error:", error) }
      }, 0)

      return NextResponse.json({
        emotion: finalEmotion,
        segments: segments.map((s, idx) => ({
          content: s.content,
          delayMs: s.delayMs,
          audioUrl: audioPathToUrl(segmentAudioResults[idx]?.path),
          audioDuration: segmentAudioResults[idx]?.duration ?? Math.ceil(s.content.length / 3),
        })),
        total: segments.length,
        memoryHit,
      })
    }

    // ========== 流式处理（Web） ==========
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    let fullReply = ""

    const stream = new ReadableStream({
      async start(controller) {
        const reader = deepseekResponse.body?.getReader()
        if (!reader) { controller.error(new Error("No response body")); return }

        try {
          // 收集完整回复
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n")
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") continue
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) fullReply += content
                } catch (e) { /* 忽略 */ }
              }
            }
          }

          // ════════════════════════════════════════════
          // Layer 3: 文本导演（原始回复 → 自然口语）
          // ════════════════════════════════════════════
          const spokenText = directText(fullReply, brainOutput)
          console.log(`[Layer3] "${fullReply.slice(0, 40)}..." → "${spokenText.slice(0, 40)}..."`)

          // ════════════════════════════════════════════
          // 情绪检测（保持兼容前端的 emotion 字段）
          // ════════════════════════════════════════════
          // 🎭 获取对话历史，用于上下文情绪判断
          const recentConvsStream = getRecentConversations(userId, 6) // 最近6条消息（3轮对话）
          const conversationHistoryStream = recentConvsStream.map(conv => ({
            role: conv.role as 'user' | 'assistant',
            content: conv.content
          }))
          
          // P0修复：流式路径也加上状态机检查（与非流式一致）
          const aiEmotionResult = detectAIEmotion(fullReply, layer1.emotion, conversationHistoryStream)
          const detectedEmotion = aiEmotionResult.emotion
          const stateMachineEmotion = brainOutput.targetEmotion
          
          // 以状态机输出为基础，AI检测结果需通过状态机二次检查
          let finalEmotion = stateMachineEmotion
          if (detectedEmotion !== stateMachineEmotion) {
            const transitionCheck = brain.emotionState.transition(
              detectedEmotion as any,
              `AI回复检测到: ${aiEmotionResult.reason}`
            )
            if (transitionCheck.success) {
              finalEmotion = detectedEmotion
              console.log(`[Emotion:Stream] 🔄 更新: ${stateMachineEmotion} → ${finalEmotion} (${aiEmotionResult.reason})`)
            } else {
              console.log(`[Emotion:Stream] ⏳ 保持: ${finalEmotion} (拒绝: ${transitionCheck.reason})`)
            }
          } else {
            console.log(`[Emotion:Stream] ✅ 一致: ${finalEmotion}`)
          }

          // ========== 1. 先发情绪 ==========
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "emotion", emotion: finalEmotion })}\n\n`)
          )

          // ========== 2. 消息分段 ==========
          const segments = splitIntoSegments(spokenText, finalEmotion)
          console.log(`[Director] 分为 ${segments.length} 段: ${segments.map(s => `"${s.content.slice(0, 15)}..."`).join(' | ')}`)

          // 将每条AI回复分别写入 DB（多条消息 = 多条记录）
          const replyIds: number[] = []
          for (const seg of segments) {
            const rid = saveConversation(userId, "assistant", seg.content)
            replyIds.push(rid)
          }
          console.log(`[DB] 保存AI回复，共 ${replyIds.length} 条，IDs=${replyIds.join(',')}`)
          // 清理旧对话（保留最近100条）
          trimConversations(userId, 100)

          // ════════════════════════════════════════════
          // Layer 4: TTS（情绪参数 + 随机扰动）
          // ════════════════════════════════════════════
          const segmentAudioResults = await Promise.all(
            segments.map((seg, idx) =>
              // ✅ 用 finalEmotion（根据AI回复检测的情绪），而不是 brainOutput.targetEmotion
              speak(seg.content, finalEmotion).then(result => {
                console.log(`[Layer4] 段${idx + 1}(${finalEmotion}) 语音: OK ${result.duration}s`)
                return result
              }).catch((err) => {
                console.error(`[Layer4] 段${idx + 1} 失败:`, err.message)
                return null
              })
            )
          )
          
          // 更新语音URL到数据库（为每条有语音的segment更新）
          for (let i = 0; i < segmentAudioResults.length; i++) {
            const audio = segmentAudioResults[i]
            if (audio && replyIds[i]) {
              updateConversationMedia(replyIds[i], audioPathToUrl(audio.path), audio.duration)
            }
          }
          
          // 🔥 把 segment 数据 + 各自语音 URL + 真实时长发给前端
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "segments",
              segments: segments.map((s, idx) => ({
                content: s.content,
                delayMs: s.delayMs,
                audioUrl: audioPathToUrl(segmentAudioResults[idx]?.path),
                audioDuration: segmentAudioResults[idx]?.duration ?? Math.ceil(s.content.length / 3),
              })),
              total: segments.length,
            })}

`)
          )

          // ========== 4. 结束 ==========
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))

          // ========== 异步记忆提取 + 总结 ==========
          setTimeout(async () => {
            try {
              // 提取记忆（异步不阻塞）
              extractMemories(userId, userMessage, fullReply).catch(e => console.error('[Memory] 流式提取失败:', e))
              extractUserProfile(userId, userMessage, fullReply)
              // 触发记忆总结器（每50条压缩一次）
              if (shouldSummarize(userId)) {
                console.log('[Summarizer] 触发总结...')
                summarizeUser(userId).catch(e => console.error('[Summarizer] 总结失败:', e))
              }
            } catch (error) {
              console.error("[Memory] Background error:", error)
            }
          }, 0)

          controller.close()
        } catch (error) {
          console.error("Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Memory-Hit": memoryHit.toString(),
        "X-Memory-Count": memoryResult.memories.length.toString(),
      },
    })

  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════
// 用户档案提取（内联，避免 Turbopack 跳过）
// ════════════════════════════════════════════════════

const NAME_PTN = [
  /(?:我的名字|我名字)(?:叫|是)([\u4e00-\u9fa5]{2,6})/,
  /我叫([\u4e00-\u9fa5]{2,6})(?:[，,。.!！]|$|\s)/,
  /可以叫我([\u4e00-\u9fa5]{2,6})/,
  /我是([\u4e00-\u9fa5]{2,6})(?:[，,。.。!！]|$|\s)/,
  /叫我([\u4e00-\u9fa5]{2,6})(?:[，,。.!！]|$|\s)/,
  /名字是([\u4e00-\u9fa5]{2,6})/,
]

function extractName(text: string) { for (const p of NAME_PTN) { const m = text.match(p); if (m) return m[1] } return null }
function extractAge(text: string) { const m = text.match(/(?:今年|我)(\d{1,2})(?:岁|了)/); if (m) { const a = parseInt(m[1]); return (a >= 10 && a <= 99) ? a : null } return null }
function extractGender(text: string) {
  if (/我是(?:个)?男的|我是男的/.test(text)) return '男'
  if (/我是(?:个)?女的|我是女的/.test(text)) return '女'
  return null
}
function extractInterests(text: string): string[] {
  const found: string[] = []; const re = /(?:我|平时|最近)(?:喜欢|爱|爱好|喜欢看|爱看)([\u4e00-\u9fa5]{2,6})/g; let m;
  while ((m = re.exec(text)) !== null) { const t = m[1]; if (t.length >= 2 && !found.includes(t)) found.push(t) }
  return found
}

function extractUserProfile(userId: string, userMessage: string, _aiReply: string) {
  const db = getDb()
  const row = db.prepare("SELECT name, profile FROM users WHERE user_id = ?").get(userId) as any
  if (!row) return
  let profile: any = {}
  try { profile = JSON.parse(row.profile || '{}') } catch { }
  let updated = false

  if (!profile.name && !row.name) {
    const n = extractName(userMessage)
    if (n) { db.prepare("UPDATE users SET name = ? WHERE user_id = ?").run(n, userId); profile.name = n; updated = true }
  }
  const age = extractAge(userMessage)
  if (age && age !== profile.age) { profile.age = age; updated = true }
  if (!profile.gender) {
    const g = extractGender(userMessage)
    if (g) { profile.gender = g; updated = true }
  }
  const ints = extractInterests(userMessage)
  if (ints.length) { const cur = (profile.interests || []); for (const i of ints) { if (!cur.includes(i)) cur.push(i) } profile.interests = cur.slice(-10); updated = true }
  if (updated) db.prepare("UPDATE users SET profile = ? WHERE user_id = ?").run(JSON.stringify(profile), userId)
}

function buildProfileContext(userId: string): string {
  const db = getDb()
  const row = db.prepare("SELECT name, profile FROM users WHERE user_id = ?").get(userId) as any
  if (!row) return ''
  let profile: any = {}
  try { profile = JSON.parse(row.profile || '{}') } catch { }
  const parts: string[] = []
  const displayName = profile.name || row.name
  if (displayName) parts.push('名叫' + displayName)
  if (profile.age) parts.push(profile.age + '岁')
  if (profile.gender) parts.push(profile.gender)
  if (profile.interests?.length) {
    const iList = Array.isArray(profile.interests) ? profile.interests : (typeof profile.interests === 'string' ? profile.interests.split(/[,，、\s]+/).filter(Boolean) : [])
    if (iList.length) parts.push('喜欢' + iList.join('、'))
  }
  if (profile.bio) parts.push('简介：' + profile.bio)
  return parts.length ? '\n用户档案：' + parts.join('，') + '。\n' : ''
}
