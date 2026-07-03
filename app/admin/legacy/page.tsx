"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, RefreshCw, Loader2 } from "lucide-react"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function AdminLegacyPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/auth").then(r => {
      if (!r.ok) { router.push('/admin?redirect=/admin/legacy'); return null }
      return r.json()
    }).then(d => {
      if (d?.authenticated) fetchContacts()
      else router.push('/admin?redirect=/admin/legacy')
    }).catch(() => router.push('/admin?redirect=/admin/legacy'))
  }, [])

  const fetchContacts = async () => {
    const r = await fetch('/api/admin/legacy-contacts')
    const d = await r.json()
    setContacts(d.contacts || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin/dashboard')} className="text-sm text-gray-400 hover:text-gray-600">← 返回面板</button>
            <h1 className="text-lg font-bold text-gray-800">数字遗产联系人</h1>
          </div>
          <button onClick={() => { setLoading(true); fetchContacts() }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"><RefreshCw className="size-3.5" /> 刷新</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="size-5 animate-spin mr-2" /> 加载中...</div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Clock className="size-10 mb-3" />
            <p>暂无用户设置数字遗产联系人</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">用户</div>
              <div className="col-span-2">联系人姓名</div>
              <div className="col-span-2">手机号</div>
              <div className="col-span-2">邮箱</div>
              <div className="col-span-3">留言</div>
              <div className="col-span-1 text-center">时间</div>
            </div>
            {contacts.map(c => (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors items-start">
                <div className="md:col-span-2 text-sm font-medium text-gray-800">{c.user_name || c.user_id?.slice(0, 12) || '未知'}</div>
                <div className="md:col-span-2 text-sm text-gray-700">{c.name}</div>
                <div className="md:col-span-2 text-sm text-gray-500">{c.phone || '-'}</div>
                <div className="md:col-span-2 text-sm text-gray-500 break-all">{c.email || '-'}</div>
                <div className="md:col-span-3 text-sm text-gray-500 line-clamp-2">{c.message || '-'}</div>
                <div className="md:col-span-1 text-xs text-gray-400 text-center">{c.updated_at?.slice(2, 16)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
