"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

export default function ConversationsPage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetch("/api/admin/auth").then(r => { if (!r.ok) router.push("/admin") }) }, [])

  async function search() {
    if (!keyword.trim()) return
    setLoading(true)
    const res = await fetch(`/api/admin/conversations?keyword=${encodeURIComponent(keyword)}&limit=100`)
    const data = await res.json(); setResults(data.results || []); setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center h-14 px-6 gap-6">
          <button onClick={() => router.push("/admin/dashboard")} className="text-sm text-gray-400 hover:text-gray-600">← 返回</button>
          <h1 className="text-lg font-bold text-gray-800">对话搜索</h1>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
                     placeholder="搜索聊天记录关键词..." className="w-full rounded-lg border bg-gray-50 pl-8 pr-3 py-1.5 text-sm outline-none focus:border-purple-300" />
            </div>
          </div>
          <button onClick={search} className="rounded-lg bg-purple-500 px-4 py-1.5 text-sm text-white">搜索</button>
        </div>
      </header>
      <div className="px-6 py-5">
        {loading ? <div className="text-center text-sm text-gray-400 py-20">搜索中...</div> :
         results.length === 0 && keyword ? <div className="text-center text-sm text-gray-400 py-20">无结果</div> :
         !keyword ? <div className="text-center text-sm text-gray-400 py-20">输入关键词搜索</div> :
         <div className="space-y-3">
           {results.map((c, i) => (
             <div key={c.id || i} className="rounded-xl border bg-white p-4">
               <div className="flex items-center gap-2 mb-2">
                 <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.role === 'user' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{c.role === 'user' ? '用户' : '小雪'}</span>
                 <span className="text-xs text-gray-400">{c.phone?.slice(-4) || ''}</span>
                 <span className="text-xs text-gray-300">{c.created_at?.slice(0,16)}</span>
               </div>
               <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
             </div>
           ))}
         </div>
        }
      </div>
    </div>
  )
}
