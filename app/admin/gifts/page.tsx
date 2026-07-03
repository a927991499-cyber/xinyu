"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Gift } from "lucide-react"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function GiftsPage() {
  const router = useRouter()
  const [gifts, setGifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/gifts", { headers: { Authorization: "Bearer xinyu2026admin" } })
      .then(r => r.json())
      .then(d => { if (d.success) setGifts(d.gifts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin/dashboard')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">礼物管理</h1>
        <span className="text-sm text-gray-400">{gifts.length} 条记录</span>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {loading ? (
          <p className="text-center text-gray-400 py-10">加载中...</p>
        ) : gifts.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="size-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">暂无礼物记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gifts.map((g: any) => (
              <div key={g.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      g.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                      g.status === 'claimed' ? 'bg-blue-50 text-blue-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {g.status === 'pending' ? '待领取' : g.status === 'claimed' ? '已领取' : '已完成'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{g.created_at}</span>
                </div>

                <p className="text-base text-gray-800 mb-2">{g.content}</p>
                <p className="text-xs text-gray-400 mb-3">用户: {g.phone || g.user_id}</p>

                {g.status === 'claimed' && g.address_name && (
                  <div className="bg-green-50 rounded-xl p-4 mt-2">
                    <p className="text-sm font-medium text-green-700 mb-2">📮 收货信息</p>
                    <div className="space-y-1 text-sm text-green-600">
                      <p>👤 {g.address_name}</p>
                      <p>📱 {g.address_phone}</p>
                      <p>📍 {g.address_detail}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await fetch("/api/admin/gifts", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "Authorization": "Bearer xinyu2026admin" },
                          body: JSON.stringify({ action: "complete", id: g.id })
                        })
                        window.location.reload()
                      }}
                      className="mt-3 rounded-lg bg-green-500 px-4 py-1.5 text-xs font-medium text-white"
                    >
                      标记已完成
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
