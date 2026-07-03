"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Trash2, GripVertical } from "lucide-react"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function CarouselsPage() {
  const router = useRouter()
  const [carousels, setCarousels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/admin'); return }
    fetchCarousels()
  }, [])

  const fetchCarousels = async () => {
    const r = await fetch('/api/admin/carousels')
    const d = await r.json()
    setCarousels(d.carousels || [])
    setLoading(false)
  }

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append("file", file)
    const r = await fetch("/api/upload", { method: "POST", body: fd })
    const d = await r.json()
    if (d.url) {
      if (editing) setEditing({ ...editing, image_url: d.url })
      else setEditing({ id: 0, image_url: d.url, title: '', link_url: '', sort_order: 0 })
    }
    setUploading(false)
  }

  const save = async () => {
    if (!editing?.image_url) return
    const method = editing.id ? 'PUT' : 'POST'
    await fetch('/api/admin/carousels', {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    })
    setEditing(null); fetchCarousels()
  }

  const remove = async (id: number) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/admin/carousels', {
      method: 'DELETE', headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
    fetchCarousels()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-10">
        <button onClick={() => router.push('/admin/dashboard')} className="text-sm text-gray-500">← 返回</button>
        <h1 className="text-base font-bold">轮播图管理</h1>
        <button onClick={() => setEditing({ id: 0, image_url: '', title: '', link_url: '', sort_order: 0 })} className="text-sm text-purple-600 font-medium">+ 新增</button>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        {editing && (
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm border">
            <h2 className="text-sm font-bold mb-3">{editing.id ? '编辑' : '新增'}轮播图</h2>
            {editing.image_url ? (
              <div className="relative mb-3">
                <img src={editing.image_url} alt="" className="h-36 w-full rounded-lg object-cover" />
                <button onClick={() => setEditing({...editing, image_url: ''})} className="absolute top-2 right-2 size-6 rounded-full bg-black/50 text-white text-xs">×</button>
              </div>
            ) : (
              <label className="mb-3 flex h-36 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
                <div className="text-center"><ImagePlus className="mx-auto size-8" /><span className="text-xs">{uploading ? '上传中...' : '点击上传图片'}</span></div>
                <input type="file" accept="image/*" onChange={uploadImage} className="hidden" disabled={uploading} />
              </label>
            )}
            <input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} placeholder="标题（可选）" className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
            <input value={editing.link_url} onChange={e => setEditing({...editing, link_url: e.target.value})} placeholder="跳转链接（可选）" className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
            <input value={editing.sort_order} onChange={e => setEditing({...editing, sort_order: parseInt(e.target.value) || 0})} placeholder="排序" type="number" className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-500">取消</button>
              <button onClick={save} disabled={!editing.image_url} className="flex-1 rounded-lg bg-purple-500 py-2 text-sm text-white disabled:opacity-50">保存</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">加载中...</div>
        ) : carousels.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">暂无轮播图</div>
        ) : (
          <div className="space-y-2">
            {carousels.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border">
                <span className="text-xs text-gray-300"><GripVertical className="size-4" /></span>
                <img src={c.image_url} alt="" className="h-14 w-24 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title || '无标题'}</p>
                  <p className="text-xs text-gray-400">排序: {c.sort_order} · {c.is_active ? '显示' : '隐藏'}</p>
                </div>
                <button onClick={() => setEditing(c)} className="text-xs text-purple-600">编辑</button>
                <button onClick={() => remove(c.id)} className="text-xs text-red-500"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
