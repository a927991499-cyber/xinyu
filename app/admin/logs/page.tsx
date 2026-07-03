"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/auth").then(r => { if (!r.ok) router.push("/admin") })
    fetch("/api/admin/logs?limit=200").then(r => r.json()).then(d => setLogs(d.logs || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center h-14 px-6 gap-6">
          <button onClick={() => router.push("/admin/dashboard")} className="text-sm text-gray-400 hover:text-gray-600">← 返回</button>
          <h1 className="text-lg font-bold text-gray-800">操作日志</h1>
        </div>
      </header>
      <div className="px-6 py-5">
        <div className="rounded-2xl border bg-white">
          <div className="divide-y">
            {logs.map((l, i) => (
              <div key={l.id || i} className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs text-gray-400 w-32 shrink-0">{l.created_at?.slice(0,16)}</span>
                <span className="px-2 py-0.5 text-xs rounded font-medium bg-purple-50 text-purple-600">{l.action}</span>
                <span className="text-xs text-gray-500 font-mono">{l.target?.slice(-12)}</span>
                <span className="flex-1 text-xs text-gray-400 truncate">{l.detail}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="py-16 text-center text-sm text-gray-400">暂无操作记录</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
