"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Search, ArrowLeft } from "lucide-react"

export default function MemoriesPage() {
  const router = useRouter()
  const [memories, setMemories] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/admin/auth").then(r => { if (!r.ok) { router.push("/admin"); return } })
    fetch("/api/admin/memories?action=stats").then(r => r.json()).then(d => setStats(d)).catch(() => {})
    fetch("/api/admin/memories").then(r => r.json()).then(d => setMemories(d.memories || [])).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number) {
    if (!confirm("确定删除？")) return
    await fetch(`/api/admin/memories?id=${id}`, { method: "DELETE" })
    setMemories(m => m.filter(x => x.id !== id))
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">加载中...</div>

  const filtered = search ? memories.filter(m => m.content.includes(search) || (m.phone||"").includes(search)) : memories

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center h-14 px-6 gap-6">
          <button onClick={() => router.push("/admin/dashboard")} className="text-sm text-gray-400 hover:text-gray-600">← 返回</button>
          <h1 className="text-lg font-bold text-gray-800">记忆管理</h1>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..." className="w-48 rounded-lg border bg-gray-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-purple-300" />
          </div>
        </div>
      </header>

      {stats && (
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-xs text-gray-400 mb-1">总记忆</div>
              <div className="text-3xl font-bold text-purple-500">{stats.total}</div>
            </div>
            {stats.byCategory?.slice(0, 3).map((c: any) => (
              <div key={c.category} className="rounded-2xl border bg-white p-5">
                <div className="text-xs text-gray-400 mb-1">{c.category}</div>
                <div className="text-3xl font-bold text-gray-700">{c.cnt}</div>
                <div className="text-xs text-gray-400">条</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 pb-6">
        <div className="rounded-2xl border bg-white">
          <div className="divide-y">
            {filtered.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
                <span className="text-lg">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{m.content}</p>
                  <span className="text-[10px] text-gray-400">{(m.phone || m.user_id || "").slice(-8)} · {m.created_at?.slice(0,10)}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">{m.category}</span>
                <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-400"><Trash2 className="size-3.5" /></button>
              </div>
            ))}
            {filtered.length === 0 && <div className="py-16 text-center text-sm text-gray-400">暂无记忆</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
