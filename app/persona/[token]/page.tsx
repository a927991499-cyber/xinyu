"use client"

import { useState, useEffect, use } from "react"
import { MessageCircle, Send, Heart, Target, Zap, Coins, Sparkles } from "lucide-react"

interface ShareInfo {
  success: boolean; displayName: string; personaScore: number; stage: string; stageIcon: string
  summary: string; interests: string[]; style: any; values: any; decision: any; relationship: any
}

const PRESET_QUESTIONS = [
  "你最近在忙什么？",
  "聊聊你对未来的规划",
  "你觉得什么最重要？",
]

const VALUE_ICONS: Record<string, any> = { career: Target, family: Heart, freedom: Zap, money: Coins, love: Heart }

export default function PersonaSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [info, setInfo] = useState<ShareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/persona/share?token=${token}`)
      .then(r => r.json())
      .then(data => { if (data.success) setInfo(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const sendMessage = async (msg?: string) => {
    const text = msg || message
    if (!text.trim() || sending) return
    setSending(true)
    setChatHistory(prev => [...prev, { role: "user", content: text }])
    try {
      const res = await fetch(`/api/persona/chat/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      setChatHistory(prev => [...prev, { role: "assistant", content: data.reply || "..." }])
    } catch (e) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "抱歉，暂时无法回复" }])
    }
    setMessage("")
    setSending(false)
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-white text-gray-400">加载中...</div>
  if (!info) return <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-white text-gray-400">分享已失效 😢</div>

  const values = info.values || {}
  const valueItems = [
    { key: "career", label: "事业", icon: Target, color: "text-indigo-500", bg: "bg-indigo-50" },
    { key: "family", label: "家庭", icon: Heart, color: "text-pink-500", bg: "bg-pink-50" },
    { key: "freedom", label: "自由", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
    { key: "money", label: "金钱", icon: Coins, color: "text-emerald-500", bg: "bg-emerald-50" },
    { key: "love", label: "爱情", icon: Heart, color: "text-red-500", bg: "bg-red-50" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white pb-24">
      {/* 头部 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-600 px-6 pb-10 pt-14 text-white">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative text-center">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur shadow-lg">
            {info.stageIcon}
          </div>
          <h1 className="text-xl font-bold">{info.displayName} 的数字人格</h1>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
            <Sparkles className="size-3" />
            {info.stage} · {info.personaScore}%
          </div>
        </div>
      </div>

      {/* 人格简介 */}
      <div className="-mt-6 mx-4">
        <div className="rounded-2xl bg-white p-5 shadow-lg shadow-purple-100/30">
          {info.summary ? (
            <p className="text-sm leading-relaxed text-gray-600">{info.summary.slice(0, 250)}</p>
          ) : (
            <p className="text-sm text-gray-400">这个人还在被AI了解中…</p>
          )}

          {/* 价值观迷你图 */}
          {Object.values(values).some((v: any) => v > 0) && (
            <div className="mt-4 flex gap-2">
              {valueItems.map(item => {
                const val = (values as any)[item.key] || 0
                const Icon = item.icon
                return (
                  <div key={item.key} className="flex-1 text-center">
                    <div className={`mx-auto mb-1 flex size-8 items-center justify-center rounded-lg ${item.bg}`}>
                      <Icon className={`size-3.5 ${item.color}`} />
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-current" style={{ width: `${val}%` }} />
                    </div>
                    <span className="mt-0.5 block text-[10px] text-gray-400">{Math.round(val)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 兴趣标签 */}
          {info.interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {info.interests.map((t: string) => (
                <span key={t} className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] text-purple-500">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* 预设问题 */}
        <div className="mt-4">
          <p className="mb-2 text-xs text-gray-400">试试这样问TA：</p>
          <div className="space-y-2">
            {PRESET_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => { setShowChat(true); sendMessage(q) }}
                      className="w-full rounded-xl border border-purple-100 bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm transition-colors hover:border-purple-300 hover:bg-purple-50">
                💬 {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 聊天区 */}
      <div className="mx-4 mt-4">
        {!showChat ? (
          <button onClick={() => setShowChat(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4 text-white font-semibold shadow-lg shadow-purple-200/50 transition-all active:scale-[0.98]">
            <MessageCircle className="size-5" /> 和 TA 聊聊
          </button>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-purple-500 px-4 py-3 text-sm text-white">
              <span>💬 正在和 {info.displayName} 的数字人格聊天</span>
              <button onClick={() => setShowChat(false)} className="text-xs text-white/60">收起</button>
            </div>
            <div className="h-72 space-y-3 overflow-y-auto p-4">
              {chatHistory.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">发送第一条消息吧~</p>
              )}
              {chatHistory.map((h, i) => (
                <div key={i} className={`flex ${h.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    h.role === "user" ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-700"
                  }`}>
                    {h.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-gray-100 p-3">
              <input value={message} onChange={e => setMessage(e.target.value)}
                     onKeyDown={e => e.key === "Enter" && sendMessage()}
                     placeholder={`问问 ${info.displayName}...`}
                     className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none" />
              <button onClick={() => sendMessage()} disabled={sending || !message.trim()}
                      className="rounded-xl bg-purple-500 px-4 py-2 text-white disabled:opacity-50">
                <Send className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
