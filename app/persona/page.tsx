"use client"

import { useState, useEffect } from "react"
import { Sparkles, MessageCircle, Zap, Target, Heart, Brain, Coins, History } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"

interface PersonaData {
  hasProfile: boolean
  personaScore: number
  stage: string
  stageIcon: string
  canCreate: boolean
  dimensionCount: number
  message?: string
  weakDimensions?: { name: string; score: number; hint: string }[]
  values?: { career: number; family: number; freedom: number; money: number; love: number }
  style?: { style: string; sentence_length: string; emoji_rate: number; formality: string }
  emotion?: { stress_response: string; happy_response: string; sad_response: string; angry_response: string }
  decision?: { style: string }
  relationship?: { attachment_style: string; trust_speed: string; emotional_dependency: string }
  interests?: { topic: string; score: number }[]
  dimensions?: Record<string, { label: string; icon: string; progress: number; sub: { label: string; done: boolean }[] }>
  summary?: string
}

const VALUE_ITEMS = [
  { key: "career", label: "事业", icon: Target, color: "from-indigo-400 to-blue-500", bg: "bg-indigo-50", text: "text-indigo-600" },
  { key: "family", label: "家庭", icon: Heart, color: "from-pink-400 to-rose-500", bg: "bg-pink-50", text: "text-pink-600" },
  { key: "freedom", label: "自由", icon: Zap, color: "from-amber-400 to-orange-500", bg: "bg-amber-50", text: "text-amber-600" },
  { key: "money", label: "金钱", icon: Coins, color: "from-emerald-400 to-green-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  { key: "love", label: "爱情", icon: Heart, color: "from-red-400 to-rose-500", bg: "bg-red-50", text: "text-red-600" },
]

const STYLE_LABELS: Record<string, string> = { direct: "直接型", indirect: "委婉型", mixed: "混合型", short: "短句", medium: "中句", long: "长句", casual: "随性", normal: "正常", formal: "正式" }
const DECISION_LABELS: Record<string, string> = { action_first: "行动派", plan_first: "规划派", risk_taker: "冒险派", conservative: "稳健派" }
const STRESS_LABELS: Record<string, string> = { silent: "独自承受", share: "倾诉分享", vent: "宣泄释放", rationalize: "理性分析" }

// 维度进度条颜色
function barColor(p: number) { return p >= 80 ? 'bg-green-400' : p >= 40 ? 'bg-amber-400' : 'bg-purple-300' }

// 单个维度卡片
function DimCard({ dim, isExpanded, onToggle }: { dim: any; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl bg-purple-200/50 p-3 cursor-pointer" onClick={onToggle}>
      <div className="flex items-center gap-2">
        <span className="text-base">{dim.icon}</span>
        <span className="text-sm font-medium text-gray-700">{dim.label}</span>
        <span className="ml-auto text-xs text-gray-400">{dim.progress}%</span>
        <span className="text-xs text-gray-300">{isExpanded ? '▼' : '▶'}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 my-2">
        <div className={`h-full rounded-full transition-all ${barColor(dim.progress)}`} style={{ width: `${dim.progress}%` }} />
      </div>
      {isExpanded && (
        <div className="flex flex-wrap gap-1.5">
          {dim.sub.map((s: any, si: number) => (
            <span key={si} className={`text-xs px-1.5 py-0.5 rounded ${s.done ? 'bg-green-100 text-green-600' : 'bg-white text-gray-300'}`}>
              {s.done ? '✓' : '○'} {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PersonaPage() {
  const [data, setData] = useState<PersonaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState("")
  const [showShare, setShowShare] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [toast, setToast] = useState("")
  const [timeline, setTimeline] = useState<any[]>([])
  const [insight, setInsight] = useState("")
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set(['speaking_style']))
  const [showAllDims, setShowAllDims] = useState(false)
  const [expandedTimeline, setExpandedTimeline] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const token = typeof window !== "undefined" ? localStorage.getItem("xinyu_token") || "" : ""

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/persona/profile", { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) { setData(json); fetchTimeline(); fetchInsight() }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const triggerExtract = async () => {
    if (extracting || cooldown > 0) return
    setExtracting(true)
    setToast("正在分析你的聊天记录，请稍等…")
    try {
      const res = await fetch("/api/persona/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      })
      const json = await res.json()
      if (json.success) {
        setToast("人格数据已刷新！")
        await fetchProfile()
        setCooldown(300)
      } else {
        setToast(json.message || json.error || "刷新失败，多聊几句再试试")
      }
    } catch (e) {
      setToast("网络错误，请稍后重试")
    }
    setExtracting(false)
    setTimeout(() => setToast(""), 3000)
  }

  const createShare = async () => {
    try {
      const res = await fetch("/api/persona/share", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" })
      })
      const json = await res.json()
      if (json.success) {
        setShareUrl(`${window.location.origin}${json.shareUrl}`)
        setShowShare(true)
      }
    } catch (e) { console.error(e) }
  }

  const fetchTimeline = async () => {
    try {
      const res = await fetch("/api/persona/timeline", { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) setTimeline(json.timeline || [])
    } catch (e) {}
  }

  const fetchInsight = async () => {
    try {
      const res = await fetch("/api/persona/insight", { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success && json.report) setInsight(json.report)
    } catch (e) {}
  }

  const toggleDim = (key: string) => {
    setExpandedDims(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  useEffect(() => { if (token) fetchProfile() }, [])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-white">
      <div className="text-center">
        <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
        <p className="text-sm text-purple-400">加载中…</p>
      </div>
    </div>
  )

  const canCreate = data?.canCreate || false
  const dims = data?.dimensions
  let avgProgress = 0
  if (dims) {
    const vals = Object.values(dims)
    avgProgress = Math.round(vals.reduce((s: number, d: { progress: number }) => s + d.progress, 0) / vals.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-200/60 via-purple-100 to-purple-100 pb-28">
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xs rounded-3xl bg-white p-8 text-center shadow-2xl shadow-purple-200/50">
            {extracting ? (
              <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            ) : (
              <div className="text-4xl mb-3">{toast.includes('已刷新') ? '✨' : '🌱'}</div>
            )}
            <p className="text-sm font-medium text-gray-700">{toast}</p>
          </div>
        </div>
      )}

      {/* 头部图片 */}
      <div className="mx-4 mt-4">
        <img src="/persona-banner.png" alt="数字人格" className="w-full rounded-2xl" />
      </div>

      {/* 双入口卡片 */}
      <div className="mx-4 mt-4 space-y-3">
        <a href="/persona/guide" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all active:scale-[0.97] hover:shadow-md">
          <img src="/icon-guide.png" alt="" className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">使用说明</p>
            <p className="text-xs text-gray-400">了解数字人格</p>
          </div>
          <span className="text-xs text-gray-300">→</span>
        </a>
        <a href="/persona/usage" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all active:scale-[0.97] hover:shadow-md">
          <img src="/icon-usage.png" alt="" className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">分身用途</p>
            <p className="text-xs text-gray-400">你不会消失，记忆永远在线，备份另外一个你</p>
          </div>
          <span className="text-xs text-gray-300">→</span>
        </a>
      </div>

      {/* 维度解锁卡片 */}
      <div className="mx-4 mt-4">
        <div className="rounded-3xl bg-purple-50/80 backdrop-blur p-6 shadow-xl shadow-purple-100/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{data?.stageIcon || '🌱'}</span>
            <span className="font-semibold text-purple-700">{data?.stage || '初识自己'}</span>
          </div>

          {/* 总进度 */}
          {dims && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-700">数字人格完整度</span>
                <span className="text-sm font-bold text-purple-600">{avgProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all" style={{ width: `${avgProgress}%` }} />
              </div>
            </div>
          )}

          {/* 维度进度手风琴 */}
          {dims ? (
            <div className="space-y-2">
              {Object.keys(dims).map(key => {
                if (!showAllDims && key !== 'speaking_style') return null
                return <DimCard key={key} dim={dims[key]} isExpanded={expandedDims.has(key)} onToggle={() => toggleDim(key)} />
              })}
              {!showAllDims && Object.keys(dims).length > 1 && (
                <button onClick={() => setShowAllDims(true)}
                        className="w-full py-2 text-xs text-purple-500 hover:text-purple-700 transition-colors">
                  展开全部维度（{Object.keys(dims).length - 1}个）▾
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">还没有人格数据，多和小雪聊天吧～</p>
          )}
        </div>
      </div>

      {/* 聊天入口 */}
      <div className="mx-4 mt-4">
        <a href="/" className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-200/50 transition-all active:scale-[0.98] hover:shadow-xl">
          <MessageCircle className="size-4" /> 和小雪聊天，让她更了解你
        </a>
      </div>

      {/* 操作区 */}
      <div className="mx-4 mt-4">
        {!data?.hasProfile || !canCreate ? (
          <div className="rounded-2xl border border-purple-100 bg-white/80 p-5 backdrop-blur">
            <div className="mb-4 flex items-start gap-3">
              <span className="text-xl">{!data?.hasProfile ? '🌱' : (data?.personaScore || 0) < 40 ? '🌿' : '🌳'}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {!data?.hasProfile ? "开始了解你" : "继续成长"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {!data?.hasProfile ? "和小雪聊天积累数据后，点下方按钮刷新" :
                   (data?.personaScore || 0) < 40 ? "聊得越多，小雪越了解你" : "快接近目标了，继续加油"}
                </p>
              </div>
            </div>
            <button onClick={triggerExtract} disabled={extracting || cooldown > 0}
                    className="w-full rounded-xl bg-purple-50 px-5 py-3 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-100 disabled:opacity-50">
              {extracting ? '⏳ 分析中…' : cooldown > 0 ? `⏳ ${Math.floor(cooldown/60)}:${String(cooldown%60).padStart(2,'0')} 后可刷新` : '🔄 刷新人格数据'}
            </button>
            {cooldown > 0 && <p className="mt-2 text-center text-xs text-gray-400">人格分析需要消耗AI资源，请耐心等待</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-green-100 bg-white/80 p-5 backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <p className="font-semibold text-green-700">可以创建数字分身了！</p>
                <p className="text-xs text-gray-500">分享给朋友，让他们和你的AI人格聊天</p>
              </div>
            </div>
            {!showShare ? (
              <button onClick={createShare} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-purple-200/50 transition-all active:scale-[0.98]">
                <Sparkles className="size-4" /> 创建我的数字人格
              </button>
            ) : (
              <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">分享链接：</p>
                <input readOnly value={shareUrl} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                       onFocus={e => e.target.select()} />
                <button onClick={() => { navigator.clipboard.writeText(shareUrl) }}
                        className="w-full rounded-lg bg-purple-50 py-2 text-sm font-medium text-purple-600 hover:bg-purple-100">
                  📋 复制链接
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 智能引导：短板维度 */}
      {data?.weakDimensions && data.weakDimensions.length > 0 && !canCreate && (
        <div className="mx-4 mt-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
            <p className="mb-3 text-sm font-medium text-amber-800">💡 想让小雪更了解你？试试聊聊这些：</p>
            <div className="space-y-2">
              {data.weakDimensions.map((w, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-2.5">
                  <span className="text-xs font-bold text-amber-600 w-8">{w.score}%</span>
                  <span className="flex-1 text-sm text-gray-700">{w.name}</span>
                  <span className="text-xs text-gray-400">→ {w.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 价值观维度卡片 */}
      {data?.values && (
        <div className="mx-4 mt-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500">
            <Brain className="size-4" /> 人格维度
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {VALUE_ITEMS.map(item => {
              const val = (data?.values as any)[item.key] || 0
              const Icon = item.icon
              return (
                <div key={item.key} className={`rounded-2xl ${item.bg} p-4`}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className={`size-4 ${item.text}`} />
                    <span className={`text-xs font-medium ${item.text}`}>{item.label}</span>
                  </div>
                  <span className={`text-2xl font-bold ${item.text}`}>{Math.round(val)}</span>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/60">
                    <div className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all`}
                         style={{ width: `${val}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 人格洞察报告 */}
      {data?.hasProfile && insight && (
        <div className="mx-4 mt-5">
          <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 p-5 shadow-sm border border-purple-100">
            <h3 className="mb-3 text-sm font-medium text-purple-700">🔍 AI 人格洞察</h3>
            <div className="space-y-1.5 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {insight.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
                <p key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-purple-400">•</span>
                  <span>{line.replace(/^[✅📈📉⚠️•]+\s*/, '')}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 特质标签 */}
      {data?.hasProfile && (data.style || data.decision || data.emotion || data.relationship) && (
        <div className="mx-4 mt-5">
          <h3 className="mb-3 text-sm font-medium text-gray-500">人格特质</h3>
          <div className="flex flex-wrap gap-2">
            {data.style?.style && (
              <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600">
                💬 {STYLE_LABELS[data.style.style] || data.style.style}
              </span>
            )}
            {data.decision?.style && (
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600">
                🎯 {DECISION_LABELS[data.decision.style] || data.decision.style}
              </span>
            )}
            {data.emotion?.stress_response && (
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600">
                😌 压力时：{STRESS_LABELS[data.emotion.stress_response] || data.emotion.stress_response}
              </span>
            )}
            {data.relationship?.attachment_style && (
              <span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600">
                💝 {data.relationship.attachment_style === 'secure' ? '安全型' :
                    data.relationship.attachment_style === 'anxious' ? '焦虑型' :
                    data.relationship.attachment_style === 'avoidant' ? '回避型' : data.relationship.attachment_style}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 时间轴（手风琴） */}
      {timeline.length > 0 && (
        <div className="mx-4 mt-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 cursor-pointer"
              onClick={() => setExpandedTimeline(!expandedTimeline)}>
            <History className="size-4" /> 成长时间轴
            <span className="ml-auto text-xs text-gray-300">{expandedTimeline ? '收起' : '展开'}</span>
          </h3>
          <div className="rounded-2xl bg-white/80 backdrop-blur p-5 shadow-sm">
            {timeline.map((snap: any, i: number) => {
              if (!expandedTimeline && i > 0) return null
              return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex size-8 items-center justify-center rounded-full bg-purple-50 text-sm">{snap.icon}</div>
                  {i < timeline.length - 1 && expandedTimeline && <div className="mt-1 w-px flex-1 bg-purple-100" />}
                </div>
                <div className={`pb-4 flex-1 ${(!expandedTimeline || i === timeline.length - 1) ? 'pb-0' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{snap.date}</span>
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-500">{snap.stage}</span>
                    <span className="text-xs text-gray-400">{Math.round(snap.score)}%</span>
                  </div>
                  {snap.changeNote && (
                    <p className="mt-1 text-xs text-gray-400">📊 {snap.changeNote}</p>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
