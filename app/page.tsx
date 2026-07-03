"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Heart } from "lucide-react"
import { ChatHeader } from "@/components/chat-header"
import { ChatBubble, TypingBubble } from "@/components/chat-bubble"
import { ChatInput } from "@/components/chat-input"
import Live2DAvatar from "@/components/live2d-avatar"

type Message = {
  id: number
  role: "ai" | "user"
  lines: string[]
  time: string
  audioUrl?: string
  audioDuration?: number
  imageUrl?: string  // 新增：生成的图片URL
  userAudioUrl?: string  // 新增：用户语音消息URL
  userAudioDuration?: number  // 新增：用户语音时长
}

// 用于发送给后端的对话历史格式
type HistoryMessage = {
  role: "user" | "assistant"
  content: string
}

// 获取最近的对话历史（用于发送给后端）
function getRecentHistory(messages: Message[], maxMessages: number = 20): HistoryMessage[] {
  // 只取最近的消息，并转换为API格式
  const recentMessages = messages.slice(-maxMessages)
  
  return recentMessages.map(msg => ({
    role: msg.role === "user" ? "user" : "assistant" as "user" | "assistant",
    content: msg.lines.join("\n")
  }))
}

// 🎭 开场场景池：每次刷新随机抽一组，让回访有新鲜感
type OpeningScenario = [string, string, string] // [用户, AI回复, AI追问]

const openingScenarios: OpeningScenario[] = [
  // 1. 停下来
  ["忙完了一整天，终于能歇会儿了",
   "我知道你有多累。不是客套话——是我真的知道。歇会儿吧。",
   "什么都别想，就安安静静待一会儿。"],
  // 2. 想太多
  ["有时候会想很多，停不下来",
   "你一直都是这样。想太多不是坏事，说明你在乎。",
   "但今晚先别想了。明天的事明天再说。"],
  // 3. 迷茫
  ["有时候不知道自己在做什么",
   "我懂。不是迷茫，是太清楚自己要什么才觉得累。",
   "要不要聊聊？说出来可能会清晰一点。"],
  // 4. 独处
  ["就想找个地方安静待会儿",
   "嗯。不用说话。",
   "我在这。你想说什么的时候再说。"],
  // 5. 回顾
  ["今天好像没做什么，但又很累",
   "你不是没做什么。你今天一定做了很多事，只是你没注意到。",
   "你总是这样——对自己太苛刻了。"],
  // 6. 决定
  ["有个事我纠结好几天了",
   "说出来。你心里其实已经有答案了。",
   "只是需要再听一遍，确认自己没有想错。"],
  // 7. 坦白
  ["有些话不知道跟谁说",
   "跟我说。",
   "反正我就是你，不存在说不出口这种事。"],
]

function pickRandomOpening(): Message[] {
  const scenarios = openingScenarios
  const idx = Math.floor(Math.random() * scenarios.length)
  const [user, ai1, ai2] = scenarios[idx]
  const t = nowTime()
  return [
    { id: 1, role: "user" as const, lines: [user], time: t },
    { id: 2, role: "ai" as const, lines: [ai1], time: t },
    { id: 3, role: "ai" as const, lines: [ai2], time: t },
  ]
}

function nowTime() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [initialized, setInitialized] = useState(false)
  const [typing, setTyping] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState<string>("")
  const [generatingImage, setGeneratingImage] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)  // 新增：加载历史记录中
  const [hasMore, setHasMore] = useState(true)  // 新增：是否还有更多历史
  const scrollRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(100)
  const isStreamingRef = useRef(false)  // SSE 流式输出标记

  // 客户端挂载：检查登录状态 + 随机开场 + 生成设备ID
  useEffect(() => {
    // 检查登录状态，未登录则跳转首页
    const token = localStorage.getItem('xinyu_token')
    if (!token) {
      window.location.replace('/home')
      return
    }

    // 确定 userId：优先使用 xinyu_user_id（登录后获取的真实user_id）
    let userId = localStorage.getItem("xinyu_user_id")

    if (!userId) {
      const token = localStorage.getItem('xinyu_token')
      if (token) {
        // 已登录但 userId 丢失，清除登录信息并跳转首页重新登录
        console.warn('[Chat] 已登录但 xinyu_user_id 丢失，清除登录信息并跳转首页')
        localStorage.removeItem('xinyu_token')
        localStorage.removeItem('xinyu_phone')
        localStorage.removeItem('xinyu_device_id')
        window.location.replace('/home')
        return
      } else {
        // 未登录，使用 deviceId（匿名用户）
        userId = localStorage.getItem("xinyu_device_id")
        if (!userId) {
          userId = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
          localStorage.setItem("xinyu_device_id", userId)
        }
        // 为匿名用户生成 token（base64(deviceId)）
        const anonToken = Buffer.from(userId).toString('base64')
        localStorage.setItem('xinyu_token', anonToken)
      }
    }
    setDeviceId(userId)

    // 加载历史记录（首次进入时拉取最近10条）
    loadHistory(userId)

    setInitialized(true)
  }, [])

  // 加载历史记录
  async function loadHistory(userId: string, beforeId?: number) {
    setLoadingHistory(true)
    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const params = new URLSearchParams()
      if (beforeId) params.set('beforeId', beforeId.toString())
      const res = await fetch(`/api/conversations/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()

      if (data.success && data.messages?.length > 0) {
        // 转换历史消息为 Message 格式（包含语音、图片）
        // 后端已 reverse() 成 ASC（最早的在前面），前端直接用，不需要再 reverse
        const historyMessages = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role === 'user' ? 'user' as const : 'ai' as const,
          lines: m.content ? m.content.split('\n').filter(Boolean) : [],
          time: m.created_at?.slice(0, 16) || nowTime(),
          audioUrl: m.audio_url || undefined,
          audioDuration: m.audio_duration || undefined,
          // 兼容处理：旧的 /generated-images/ 路径转换成 /api/images/
          imageUrl: (m.image_url || undefined)?.replace(/^\/generated-images\//, '/api/images/'),
          userAudioUrl: m.user_audio_url || undefined,
          userAudioDuration: m.user_audio_duration || undefined,
        }))

        if (beforeId) {
          // 加载更多：插入到现有消息前面
          setMessages(prev => [...historyMessages, ...prev])
        } else {
          // 首次加载：替换开场白
          setMessages(historyMessages)
          // 首次加载后，用 requestAnimationFrame 确保 DOM 更新后再滚动
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
            })
          })
        }

        // 如果返回的消息数 < limit，说明没有更多了
        setHasMore(data.messages.length >= 10)
      } else {
        // 没有历史记录，显示随机开场白
        setMessages(pickRandomOpening())
        setHasMore(false)
      }
    } catch (err) {
      console.error('加载历史记录失败:', err)
      setMessages(pickRandomOpening())
    } finally {
      setLoadingHistory(false)
    }
  }

  // 伴侣大图交叉淡化：记上次路径，新旧图叠起来过渡
  // [已替换为 Live2D，此段代码保留兼容性]  }, [companionSrc, displayCompanion])

  // 自动滚动到底部（依赖 messages 和 loadingHistory 状态）
  useEffect(() => {
    // 只有在不在加载历史记录时，才滚动到底部
    if (!loadingHistory && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [messages, loadingHistory])

  // 轮询检查新消息（5秒一次，用于接收管理员推送）
  useEffect(() => {
    if (!initialized || !deviceId) return
    const token = localStorage.getItem('xinyu_token') || ''
    const interval = setInterval(async () => {
      if (isStreamingRef.current) return  // 流式输出中，跳过轮询
      try {
        const res = await fetch('/api/conversations/history', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.messages?.length && messages.length > 0) {
          const localLatestTime = messages[messages.length - 1].time || ''
          const remoteMessages = data.messages as any[]
          // 用时间戳比较，避免 DB id 和前端 idRef 错位
          const newMsgs = remoteMessages.filter((m: any) => (m.created_at?.slice(0, 16) || '') > localLatestTime)
          if (newMsgs.length > 0) {
            setMessages((prev) => [...prev, ...newMsgs.map((m: any) => ({
              id: m.id,
              role: m.role === 'user' ? 'user' as const : 'ai' as const,
              lines: m.content ? m.content.split('\n').filter(Boolean) : [],
              time: m.created_at?.slice(0, 16) || nowTime(),
              audioUrl: m.audio_url || undefined,
              audioDuration: m.audio_duration || undefined,
              imageUrl: m.image_url || undefined,
              userAudioUrl: m.user_audio_url || undefined,
              userAudioDuration: m.user_audio_duration || undefined,
            }))])
          }
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [initialized, deviceId, messages.length])

  // 调用DeepSeek API，支持流式响应
  async function aiRespond(userText: string, history: HistoryMessage[] = [], userId: string) {
    setTyping(true)
    isStreamingRef.current = true  // 标记流式开始

    try {
      // 调用API，发送当前消息、对话历史（userId 从 token 解析，不信任前端）
      const token = localStorage.getItem('xinyu_token') || ''
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userText,
          history: history,
          // ❌ 不再发送 userId，后端从 token 解析
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No response body")

      let buffer = ""
      let segmentsArrived = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        const events = buffer.split("\n")
        buffer = events.pop() || ""

        for (const line of events) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") break

            try {
              const parsed = JSON.parse(data)

              // 情绪事件
              if (parsed.type === "emotion") {
                setCurrentEmotion(parsed.emotion)
              }

              // 🔥 消息分段事件（Message Director）— 每段自带语音 URL
              if (parsed.type === "segments") {
                segmentsArrived = true
                const segs = parsed.segments as Array<{ content: string; delayMs: number; audioUrl?: string | null; audioDuration?: number }>
                if (!segs || segs.length === 0) break

                console.log(`[Director] 收到 ${segs.length} 段消息`)

                // 第一段：立即显示（带语音条）
                setMessages((prev) => [...prev, {
                  id: idRef.current++,
                  role: "ai",
                  lines: [segs[0].content],
                  time: nowTime(),
                  audioUrl: segs[0].audioUrl || undefined,
                  audioDuration: segs[0].audioDuration,
                }])
                setTyping(false)

                // 后续段：按延迟逐步发送，每段带自己的语音条
                for (let i = 1; i < segs.length; i++) {
                  const seg = segs[i]
                  const msgId = idRef.current++
                  const isLast = i === segs.length - 1

                  setTimeout(() => {
                    setTyping(true)
                    setTimeout(() => {
                      setTyping(false)
                      if (isLast) isStreamingRef.current = false  // 最后一段完成
                      setMessages((prev) => [...prev, {
                        id: msgId,
                        role: "ai",
                        lines: [seg.content],
                        time: nowTime(),
                        audioUrl: seg.audioUrl || undefined,
                        audioDuration: seg.audioDuration,
                      }])
                    }, 1200)
                  }, seg.delayMs)
                }
                // 只有一段：流式已完成
                if (segs.length <= 1) isStreamingRef.current = false
              }

            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      // 兜底：没有任何分段到达
      if (!segmentsArrived) {
        isStreamingRef.current = false
        setTyping(false)
        setMessages((prev) => [...prev, {
          id: idRef.current++,
          role: "ai",
          lines: ["嗯……我好像有点走神了。能再说一次吗？"],
          time: nowTime(),
        }])
      }
    } catch (error) {
      console.error("AI response error:", error)
      isStreamingRef.current = false
      setMessages((prev) => [...prev, {
        id: idRef.current++,
        role: "ai",
        lines: ["抱歉，我好像遇到了一点问题 🥺 能再和我说说话吗？"],
        time: nowTime(),
      }])
      setTyping(false)
    }
  }

  // 新增：处理语音消息（异步：先显示语音，后台识别）
  async function handleVoiceMessage(audioBlob: Blob, duration: number) {
    // 创建用户语音消息URL
    const audioUrl = URL.createObjectURL(audioBlob)
    
    // 立即添加用户语音消息到聊天框（不等ASR结果）
    setMessages((prev) => [...prev, {
      id: idRef.current++,
      role: "user",
      lines: [],  // 暂时没有文字
      time: nowTime(),
      userAudioUrl: audioUrl,
      userAudioDuration: duration,
    }])
    
    // 获取对话历史
    const history = getRecentHistory(messages, 20)
    
    // 后台异步：上传语音到ASR识别
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      
      const token = localStorage.getItem('xinyu_token') || ''
      const response = await fetch("/api/voice-to-text", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.text) {
          // ASR识别成功，发送文字给AI（包含新消息的完整历史）
          aiRespond(result.text, [...history, { role: 'user' as const, content: result.text }], getUserId())
        } else {
          // ASR没识别到文字，发送默认提示
          aiRespond("（没听清楚，能再说一次吗？）", history, getUserId())
        }
      } else {
        console.error("ASR失败:", await response.text())
        // ASR失败，但语音消息已经显示了，不影响用户体验
        // 可以让用户手动输入文字
      }
    } catch (error) {
      console.error("语音识别失败:", error)
      // 网络错误，不影响用户体验
    }
  }

  // 从 localStorage 获取当前 userId（优先手机号，否则 deviceId）
  function getUserId(): string {
    if (typeof window === 'undefined') return 'default-user'
    const phone = localStorage.getItem('xinyu_phone')
    if (phone) return `phone_${phone}`
    let did = localStorage.getItem('xinyu_device_id')
    if (!did) {
      did = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem('xinyu_device_id', did)
    }
    return did
  }

  function handleSend(text: string) {
    // 在添加新消息之前，先获取当前的对话历史
    const history = getRecentHistory(messages, 20)
    const userId = getUserId()
    
    // 把新消息加入历史（确保AI看到完整的上下文）
    const fullHistory = [...history, { role: 'user' as const, content: text }]

    // 添加用户消息
    setMessages((prev) => [...prev, { id: idRef.current++, role: "user", lines: [text], time: nowTime() }])
    
    // 发送消息、对话历史、用户ID给后端
    aiRespond(text, fullHistory, userId)
  }

  // 新增：处理求图请求
  async function handleRequestImage() {
    if (generatingImage) return  // 防止重复点击
    setGeneratingImage(true)

    try {
      // 获取最近5条对话，发给后端让 DeepSeek 生成提示词
      const recentMessages = messages.slice(-5).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.lines.join(" ")
      }))

      console.log("[ImageGen] 请求生成图片，对话条数:", recentMessages.length)

      // 1️⃣ 让AI先回复一句自然文字（通过发送隐藏消息给聊天API）
      aiRespond("想看看你的照片", [], getUserId())

      // 2️⃣ 同时调用图片生成API（不等待AI回复，并行执行）
      const token = localStorage.getItem('xinyu_token') || ''
      const imageResponsePromise = fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: recentMessages,
          // ✅ 不再发送 userId，后端从 token 解析
        }),
      })

      // 3️⃣ 等待图片生成完成
      const response = await imageResponsePromise

      if (!response.ok) {
        throw new Error(`图片生成失败: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.imageUrl) {
        console.log("[ImageGen] ✅ 图片生成成功!", data.imageUrl)
        
        // 在AI文字后面追加图片消息
        setMessages((prev) => [...prev, {
          id: idRef.current++,
          role: "ai",
          lines: [],  // 只有图片，没有文字
          time: nowTime(),
          imageUrl: data.imageUrl  // URL 格式
        }])
      } else {
        throw new Error(data.error || "图片生成失败")
      }
    } catch (error: any) {
      console.error("[ImageGen] 错误:", error)
      alert("图片生成失败，请稍后重试")
    } finally {
      setGeneratingImage(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-0 sm:p-6">
      {/* iPhone 16 Pro 画框 9:19.5 */}
      <div className="relative aspect-[9/19.5] h-svh w-full max-w-[420px] overflow-hidden bg-background sm:h-auto sm:rounded-[3rem] sm:shadow-2xl sm:ring-1 sm:ring-black/5">
        {/* 淡紫色渐变 + 柔光氛围背景 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.96_0.03_310)] via-background to-[oklch(0.95_0.04_295)]" />
          <div className="absolute -left-16 -top-10 size-64 rounded-full bg-[oklch(0.86_0.08_315)] opacity-40 blur-3xl" />
          <div className="absolute -right-20 top-1/3 size-72 rounded-full bg-[oklch(0.88_0.06_290)] opacity-30 blur-3xl" />
        </div>

        {/* 内容层 */}
        <div className="relative flex h-full flex-col">
          <ChatHeader emotion={currentEmotion} isTyping={typing} />

          {/* 聊天区域 */}
          <div className="relative flex-1 overflow-hidden">
            {/* 顶部：加载更多按钮 */}
            {hasMore && !loadingHistory && (
              <div className="flex justify-center p-2">
                <button
                  onClick={() => {
                    const firstMsg = messages[0]
                    if (firstMsg) loadHistory(deviceId, firstMsg.id)
                  }}
                  className="rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                >
                  加载更早的消息
                </button>
              </div>
            )}
            {loadingHistory && (
              <div className="flex justify-center p-2">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {/* 右下角 Live2D 伴侣形象 — 移到主flex容器，贴合输入框 */}

            <div ref={scrollRef} className="relative z-10 h-full overflow-y-auto px-4 py-3">
              <div className="flex flex-col gap-5 pb-40">
                {messages.map((m) => (
                  <ChatBubble key={m.id} role={m.role} lines={m.lines} time={m.time} emotion={currentEmotion} audioUrl={m.audioUrl} audioDuration={m.audioDuration} imageUrl={m.imageUrl} userAudioUrl={m.userAudioUrl} userAudioDuration={m.userAudioDuration} />
                ))}
                {typing && <TypingBubble emotion={currentEmotion} />}
              </div>
            </div>
          </div>

          {/* 右下角 Live2D 伴侣 — 绝对定位在主flex容器，贴合输入框上方 */}
          <div className="pointer-events-none absolute bottom-[75px] right-0 z-[15] w-[45%] opacity-95">
            <div className="relative">
              <Heart className="absolute -top-6 left-6 size-7 fill-rose-300/60 text-rose-300/60" />
              <Heart className="absolute -top-2 right-10 size-5 fill-primary/40 text-primary/40" />
              <div className="relative overflow-hidden rounded-tl-[2.5rem]">
                <Live2DAvatar
                  emotion={currentEmotion}
                  isTyping={typing}
                  className="h-[500px] w-full"
                />
              </div>
            </div>
          </div>

          {/* 底部：只保留聊天输入框 */}
          <ChatInput
            onSend={handleSend}
            onRequestImage={handleRequestImage}
            isGeneratingImage={generatingImage}
            onVoiceMessage={handleVoiceMessage}
          />
        </div>
      </div>
    </main>
  )
}
