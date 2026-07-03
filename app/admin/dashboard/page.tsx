"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Users, MessageSquare, Brain, Sparkles, Shield, Ban, Send, Gift, Clock } from "lucide-react"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface User { user_id: string; phone?: string; created_at: string; message_count: number; status: string }
interface Stats { totalUsers: number; activeUsers: number; todayMessages: number; totalMessages: number; personaUsers: number; activeShares: number; memoryCount: number }

export default function DashboardPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedUser, setSelectedUser] = useState<{id:string;label:string} | null>(null)
  const [convs, setConvs] = useState<any[]>([])
  const [convLoading, setConvLoading] = useState(false)
  const [convKeyword, setConvKeyword] = useState("")
  const [viewMemories, setViewMemories] = useState<{userId:string;label:string;data:any[]} | null>(null)
  const [sysStatus, setSysStatus] = useState<any>(null)
  const [msgTarget, setMsgTarget] = useState<{id:string;label:string} | null>(null)
  const [msgText, setMsgText] = useState("")
  const [msgSending, setMsgSending] = useState(false)
  const [giftTarget, setGiftTarget] = useState<{id:string;label:string} | null>(null)
  const [giftContent, setGiftContent] = useState("")
  const [giftSending, setGiftSending] = useState(false)

  async function sendMessage() {
    if (!msgTarget || !msgText.trim()) return
    setMsgSending(true)
    await fetch("/api/admin/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer xinyu2026admin" },
      body: JSON.stringify({ userId: msgTarget.id, message: msgText.trim() })
    })
    setMsgSending(false); setMsgTarget(null); setMsgText("")
  }

  async function sendGift() {
    if (!giftTarget || !giftContent.trim()) return
    setGiftSending(true)
    await fetch("/api/admin/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer xinyu2026admin" },
      body: JSON.stringify({ userId: giftTarget.id, content: giftContent.trim() })
    })
    setGiftSending(false); setGiftTarget(null); setGiftContent("")
  }

  useEffect(() => {
    fetch("/api/admin/auth").then(r => { if (!r.ok) { router.push("/admin"); return } })
    fetch("/api/admin/users?action=stats").then(r => r.json()).then(d => setStats(d)).catch(() => {})
    fetch("/api/admin/stats").then(r => r.json()).then(d => setSysStatus(d)).catch(() => {})
    fetchUsers(1)
  }, [])

  async function fetchUsers(p: number) {
    setPage(p); setLoading(true)
    const res = await fetch(`/api/admin/users?page=${p}&limit=50&t=${Date.now()}`, { cache: 'no-store' })
    const data = await res.json(); setUsers(data.users || []); setTotal(data.total || 0); setLoading(false)
  }
  async function handleBan(userId: string, action: string, reason?: string) {
    const body = action === "ban" ? { userId, action, reason: reason || "违规" } : { userId, action }
    await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    fetchUsers(page)
  }
  async function viewUserMemories(userId: string, label: string) {
    setViewMemories({ userId, label, data: [] })
    const res = await fetch(`/api/admin/memories?action=user&userId=${userId}`)
    const d = await res.json()
    setViewMemories({ userId, label, data: d.memories || [] })
  }
  async function viewConvs(userId: string, label: string) {
    setSelectedUser({ id: userId, label }); setConvLoading(true)
    const res = await fetch(`/api/admin/conversations?userId=${userId}&limit=100`)
    const data = await res.json(); setConvs(data.conversations || []); setConvLoading(false)
  }
  async function searchConvs() {
    if (!convKeyword.trim()) return; setConvLoading(true)
    const res = await fetch(`/api/admin/conversations?keyword=${encodeURIComponent(convKeyword)}&limit=50`)
    const data = await res.json(); setConvs(data.results || []); setConvLoading(false)
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-gray-800">心屿管理</h1>
            <nav className="flex items-center gap-1">
              <span className="px-3 py-1.5 text-sm font-medium text-white bg-purple-500 rounded-lg">用户</span>
              <button onClick={() => router.push("/admin/settings")} className="px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100">设置</button>
              <button onClick={() => router.push("/admin/members")} className="px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100">会员</button>
              <button onClick={() => router.push("/admin/logs")} className="px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100">日志</button>
              <button onClick={() => router.push("/admin/conversations")} className="px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100">搜索</button>
              <button onClick={() => router.push("/admin/members")} className="px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100">会员</button>
            </nav>
          </div>
          <button onClick={() => { document.cookie = "admin_token=;max-age=0"; router.push("/admin") }} className="text-sm text-gray-400 hover:text-gray-600">退出</button>
        </div>
      </header>

      {/* 统计栏 */}
      {stats && (
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: "注册用户", value: stats.totalUsers, sub: `${stats.activeUsers} 人周活跃`, color: "text-blue-500", bg: "bg-blue-50" },
              { icon: MessageSquare, label: "今日消息", value: stats.todayMessages, sub: `累计 ${stats.totalMessages} 条`, color: "text-green-500", bg: "bg-green-50" },
              { icon: Brain, label: "用户记忆", value: stats.memoryCount, sub: `${stats.personaUsers} 人有分身`, color: "text-purple-500", bg: "bg-purple-50" },
              { icon: Sparkles, label: "活跃分身", value: stats.activeShares, sub: "可被访问的分享", color: "text-amber-500", bg: "bg-amber-50" },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl border bg-white p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex size-9 items-center justify-center rounded-xl ${c.bg}`}><c.icon className={`size-4 ${c.color}`} /></div>
                  <span className="text-sm text-gray-500">{c.label}</span>
                </div>
                <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
                <div className="mt-1 text-xs text-gray-400">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 系统状态 */}
      {sysStatus && (
        <div className="px-6 pb-4">
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <span>💻 {sysStatus.uptime?.slice(0,40) || ''}</span>
            <span>💾 磁盘 {sysStatus.disk || '-'}</span>
            <span>🧠 内存 {sysStatus.mem || '-'}</span>
          </div>
        </div>
      )}

      {/* 用户列表 */}
      <div className="px-6 pb-6">
        <div className="rounded-2xl border bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-semibold text-gray-700">用户列表 <span className="text-gray-400 font-normal">({total})</span></h2>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/admin/gifts')} className="rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100 flex items-center gap-1"><Gift className="size-3" />礼物管理</button>
              <button onClick={() => router.push('/admin/community')} className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 flex items-center gap-1">社区管理</button>
              <button onClick={() => router.push('/admin/legacy')} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-100 flex items-center gap-1"><Clock className="size-3" />数字遗产</button>
              <span className="text-sm text-gray-300">|</span>
              共 {Math.ceil(total/50)} 页
              <button disabled={page <= 1} onClick={() => fetchUsers(page-1)} className="px-2 py-0.5 rounded hover:bg-gray-100 disabled:opacity-30">‹</button>
              <span className="text-gray-800 font-medium">{page}</span>
              <button disabled={page >= Math.ceil(total/50)} onClick={() => fetchUsers(page+1)} className="px-2 py-0.5 rounded hover:bg-gray-100 disabled:opacity-30">›</button>
            </div>
          </div>
          <div className="divide-y">
            {users.map(u => (
              <div key={u.user_id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50">
                <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">{u.phone ? u.phone.slice(-4) : '?'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {u.displayName && <span className="text-sm font-medium text-purple-600">{u.displayName}</span>}
                    <span className={`size-2 rounded-full ${u.isOnline ? 'bg-green-400' : 'bg-gray-300'}`} title={u.isOnline ? '在线' : '离线'} />
                    <span className="text-sm font-medium text-gray-800">{u.phone || '未知'}</span>
                    {u.status === "banned" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500">已封禁</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>注册于 {u.created_at?.slice(0,10)}</span>
                    <span className="text-gray-300">·</span>
                    <span>{u.message_count} 条消息</span>
                    <span className="text-gray-300">·</span>
                    <span title="最后发消息时间">最后活跃 {u.last_active?.slice(5,16) || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => viewUserMemories(u.user_id, u.phone || '')} className="rounded-lg border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">记忆</button>
                  <button onClick={() => viewConvs(u.user_id, u.phone || '')} className="rounded-lg border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">对话</button>
                  <button onClick={() => setGiftTarget({ id: u.user_id, label: u.phone || '用户' })} className="rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100">送礼物</button>
                  <button onClick={() => setMsgTarget({ id: u.user_id, label: u.phone || '用户' })} className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100">发消息</button>
                  {u.status === "banned" ? (
                    <button onClick={() => handleBan(u.user_id, "unban")} className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100">解封</button>
                  ) : (
                    <button onClick={() => { const r = prompt("封禁原因"); if (r) handleBan(u.user_id, "ban", r) }} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100">封禁</button>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && <div className="py-16 text-center text-sm text-gray-400">暂无用户</div>}
          </div>
        </div>
      </div>

      {/* 对话侧面板 */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20" onClick={() => setSelectedUser(null)} />
          <div className="w-full max-w-md bg-white border-l shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div><h3 className="text-sm font-bold">{selectedUser.label}</h3><p className="text-xs text-gray-400">{convs.length} 条消息</p></div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="p-3 border-b">
              <input value={convKeyword} onChange={e => setConvKeyword(e.target.value)} onKeyDown={e => e.key==='Enter' && searchConvs()}
                     placeholder="搜索关键词..." className="w-full rounded-lg border px-3 py-1.5 text-xs outline-none focus:border-purple-300" />
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 p-4 space-y-3">
              {convLoading ? <p className="text-center text-xs text-gray-400 py-10">加载中...</p> :
               convs.length === 0 ? <p className="text-center text-xs text-gray-400 py-10">暂无对话</p> :
               convs.map(c => (
                <div key={c.id} className={`flex ${c.role === 'user' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${c.role === 'user' ? 'bg-purple-500 text-white' : 'bg-white border text-gray-700'}`}>
                    {c.role === 'assistant' && <span className="text-[11px] text-purple-400 font-medium">小雪</span>}
                    <p className={`${c.role === 'assistant' ? 'mt-0.5' : ''} leading-relaxed`}>{c.content}</p>
                    <span className="text-[10px] opacity-40 mt-1 block">{c.created_at?.slice(11,16)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 用户记忆面板 */}
      {viewMemories && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20" onClick={() => setViewMemories(null)} />
          <div className="w-full max-w-md bg-white border-l shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div><h3 className="text-sm font-bold">{viewMemories.label} 的记忆</h3><p className="text-xs text-gray-400">{viewMemories.data.length} 条</p></div>
              <button onClick={() => setViewMemories(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {viewMemories.data.map((m:any) => (
                <div key={m.id} className="flex items-start gap-3 rounded-xl border bg-white p-3">
                  <span className="text-lg shrink-0">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700">{m.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-gray-100 rounded px-1.5 py-0.5 text-gray-500">{m.category}</span>
                      <span className="text-[10px] text-gray-400">{m.created_at?.slice(0,16)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {viewMemories.data.length === 0 && <p className="text-center text-xs text-gray-400 py-10">暂无记忆</p>}
            </div>
          </div>
        </div>
      )}

      {/* 送礼物弹窗 */}
      {giftTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setGiftTarget(null); setGiftContent("") }}>
          <div className="mx-4 w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 mb-1">送礼物给 {giftTarget.label}</h3>
            <p className="text-xs text-gray-400 mb-4">礼物内容会在用户个人中心显示，用户点开后可填写地址。</p>
            <textarea rows={3} value={giftContent} onChange={e => setGiftContent(e.target.value)}
              placeholder='例如：小雪送你一杯奈雪の茶 🧋，快去个人中心领取吧～' className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-pink-400 resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setGiftTarget(null); setGiftContent("") }} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500">取消</button>
              <button onClick={sendGift} disabled={giftSending || !giftContent.trim()} className="flex-1 rounded-xl bg-pink-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {giftSending ? '发送中…' : '赠送礼物'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发消息弹窗 */}
      {msgTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setMsgTarget(null); setMsgText("") }}>
          <div className="mx-4 w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 mb-1">发送消息给 {msgTarget.label}</h3>
            <p className="text-xs text-gray-400 mb-4">消息将以小雪的身份发送，用户会看到这条消息出现在聊天中。</p>
            <textarea rows={4} value={msgText} onChange={e => setMsgText(e.target.value)}
              placeholder="输入要发送的消息..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-400 resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setMsgTarget(null); setMsgText("") }} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500">取消</button>
              <button onClick={sendMessage} disabled={msgSending || !msgText.trim()} className="flex-1 rounded-xl bg-purple-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {msgSending ? '发送中…' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
