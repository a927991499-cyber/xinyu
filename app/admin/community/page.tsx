"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, EyeOff, Eye, ImagePlus, Search, RefreshCw, AlertTriangle, Loader2 } from "lucide-react"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function AdminCommunityPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'posts' | 'comments' | 'carousels'>('posts')
  const [posts, setPosts] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [carousels, setCarousels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCarousel, setEditingCarousel] = useState<any | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [commentPage, setCommentPage] = useState(1)
  const [commentTotal, setCommentTotal] = useState(0)

  useEffect(() => {
    fetch("/api/admin/auth").then(r => {
      if (!r.ok) { router.push('/admin?redirect=/admin/community'); return null }
      return r.json()
    }).then(d => {
      if (d?.authenticated) { fetchPosts(); fetchCarousels() }
      else { router.push('/admin?redirect=/admin/community') }
    }).catch(() => { router.push('/admin?redirect=/admin/community') })
  }, [])

  const fetchPosts = async () => {
    const r = await fetch('/api/community/posts?page=1&limit=100')
    const d = await r.json()
    setPosts(d.posts || [])
    setLoading(false)
  }

  const fetchCarousels = async () => {
    const r = await fetch('/api/admin/carousels')
    const d = await r.json()
    setCarousels(d.carousels || [])
    setLoading(false)
  }

  const fetchComments = async (page = 1) => {
    const r = await fetch(`/api/admin/comments?page=${page}&limit=30`)
    const d = await r.json()
    setComments(d.comments || [])
    setCommentTotal(d.total || 0)
    setCommentPage(page)
    setLoading(false)
  }

  const deleteComment = async (id: number) => {
    if (!confirm('确定删除此评论？')) return
    await fetch('/api/admin/comments', {
      method: 'DELETE', headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
    fetchComments(commentPage)
  }

  const hidePost = async (id: number) => {
    await fetch('/api/admin/community', {
      method: 'POST', headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: 'hidden' })
    })
    fetchPosts()
  }

  const showPost = async (id: number) => {
    await fetch('/api/admin/community', {
      method: 'POST', headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: 'active' })
    })
    fetchPosts()
  }

  const deletePost = async (id: number) => {
    if (!confirm('确定要删除这条帖子？操作不可恢复。')) return
    await fetch('/api/admin/community', {
      method: 'POST', headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: 'deleted' })
    })
    fetchPosts()
  }

  const batchDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`确定删除选中的 ${selected.size} 条帖子？`)) return
    for (const id of selected) {
      await fetch('/api/admin/community', {
        method: 'POST', headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: 'deleted' })
      })
    }
    setSelected(new Set())
    fetchPosts()
  }

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append("file", file)
    const r = await fetch("/api/upload", { method: "POST", body: fd })
    const d = await r.json()
    if (d.url) {
      if (editingCarousel) setEditingCarousel({ ...editingCarousel, image_url: d.url })
      else setEditingCarousel({ id: 0, image_url: d.url, title: '', link_url: '', sort_order: 0 })
    }
    setUploading(false)
  }

  const saveCarousel = async () => {
    if (!editingCarousel?.image_url) return
    const method = editingCarousel.id ? 'PUT' : 'POST'
    await fetch('/api/admin/carousels', { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingCarousel) })
    setEditingCarousel(null); fetchCarousels()
  }

  const deleteCarousel = async (id: number) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/admin/carousels', { method: 'DELETE', headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    fetchCarousels()
  }

  const parseImgCount = (images: string) => { try { return JSON.parse(images).length } catch { return 0 } }
  const formatTime = (t: string) => t?.slice(0, 19)?.replace('T', ' ') || ''

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin/dashboard')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← 返回面板</button>
            <h1 className="text-lg font-bold text-gray-800">社区管理</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <button onClick={() => { setLoading(true); fetchPosts() }} className="flex items-center gap-1 hover:text-gray-600"><RefreshCw className="size-3.5" /> 刷新</button>
          </div>
        </div>
        {/* Tab */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            <button onClick={() => setTab('posts')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'posts' ? 'text-purple-600 border-purple-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>帖子管理 {posts.length > 0 && `(${posts.length})`}</button>
            <button onClick={() => { setTab('comments'); if (comments.length === 0) fetchComments() }} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'comments' ? 'text-purple-600 border-purple-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>评论管理 {commentTotal > 0 && `(${commentTotal})`}</button>
            <button onClick={() => setTab('carousels')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'carousels' ? 'text-purple-600 border-purple-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>轮播图 {carousels.length > 0 && `(${carousels.length})`}</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* ===== 帖子管理 ===== */}
        {tab === 'posts' && (
          <div>
            {/* 工具栏 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {selected.size > 0 && (
                  <button onClick={batchDelete} className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
                    <Trash2 className="size-4" /> 删除选中 ({selected.size})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Search className="size-4" />
                <span>共 {posts.length} 条</span>
              </div>
            </div>

            {/* 表格/卡片 */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="size-5 animate-spin mr-2" /> 加载中...</div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400"><AlertTriangle className="size-8 mb-2" /><p>暂无帖子</p></div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* 表头（桌面） */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1 flex items-center"><input type="checkbox" onChange={e => { setSelected(e.target.checked ? new Set(posts.map(p => p.id)) : new Set()) }} checked={selected.size === posts.length && posts.length > 0} className="rounded" /></div>
                  <div className="col-span-2">用户</div>
                  <div className="col-span-5">内容</div>
                  <div className="col-span-1 text-center">状态</div>
                  <div className="col-span-1 text-center">互动</div>
                  <div className="col-span-1">时间</div>
                  <div className="col-span-1 text-right">操作</div>
                </div>

                {/* 行 */}
                {posts.map(p => (
                  <div key={p.id} className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors items-start ${p.status !== 'active' ? 'opacity-50' : ''}`}>
                    {/* 桌面版：checkbox */}
                    <div className="hidden md:flex col-span-1 items-center pt-1"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" /></div>
                    
                    {/* 用户 + 内容（桌面版合并） */}
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name || '匿名'}</p>
                    </div>
                    <div className="md:col-span-5 min-w-0">
                      <a href={`/community/posts/${p.id}`} target="_blank" className="text-sm text-gray-600 line-clamp-2 hover:text-purple-600 transition-colors">{p.content}</a>
                      {parseImgCount(p.images) > 0 && <span className="inline-block mt-1 text-xs text-purple-400">📷 {parseImgCount(p.images)} 张图</span>}
                    </div>

                    {/* 状态 */}
                    <div className="md:col-span-1 flex items-center justify-center">
                      {p.is_pinned === 1 ? <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">置顶</span> :
                       p.status === 'active' ? <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">正常</span> :
                       p.status === 'hidden' ? <span className="rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-600">隐藏</span> :
                       <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500">已删</span>}
                    </div>

                    {/* 互动 */}
                    <div className="md:col-span-1 text-center text-xs text-gray-400">❤️ {p.likes} · 💬 {p.comment_count || 0}</div>

                    {/* 时间 */}
                    <div className="md:col-span-1 text-xs text-gray-400">{formatTime(p.created_at).slice(2, 16)}</div>

                    {/* 操作 */}
                    <div className="md:col-span-1 flex justify-end gap-1.5">
                      {p.status === 'active' ? (
                        <button onClick={() => hidePost(p.id)} className="rounded-lg bg-yellow-50 px-2.5 py-1.5 text-xs font-medium text-yellow-600 hover:bg-yellow-100 transition-colors flex items-center gap-1"><EyeOff className="size-3.5" /> 隐藏</button>
                      ) : p.status === 'hidden' ? (
                        <button onClick={() => showPost(p.id)} className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100 transition-colors flex items-center gap-1"><Eye className="size-3.5" /> 恢复</button>
                      ) : null}
                      <button onClick={() => deletePost(p.id)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors flex items-center gap-1"><Trash2 className="size-3.5" /> 删除</button>
                    </div>

                    {/* 移动端额外信息 */}
                    <div className="md:hidden flex items-center gap-3 text-xs text-gray-400 mt-1 ml-1">
                      <span>❤️ {p.likes}</span>
                      <span>💬 {p.comment_count || 0}</span>
                      <span>{formatTime(p.created_at).slice(2, 16)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 轮播图管理 ===== */}
        {tab === 'comments' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">共 {commentTotal} 条评论</p>
              <button onClick={() => fetchComments(commentPage)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"><RefreshCw className="size-3.5" /> 刷新</button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="size-5 animate-spin mr-2" /> 加载中...</div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p>暂无评论</p></div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-2">用户</div>
                  <div className="col-span-4">评论内容</div>
                  <div className="col-span-4">所属帖子</div>
                  <div className="col-span-1 text-center">时间</div>
                  <div className="col-span-1 text-right">操作</div>
                </div>
                {comments.map(c => (
                  <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors items-start">
                    <div className="md:col-span-2 text-sm font-medium text-gray-800">{c.name || '匿名'}</div>
                    <div className="md:col-span-4 text-sm text-gray-600 line-clamp-2">{c.content}</div>
                    <div className="md:col-span-4 text-xs text-gray-400 line-clamp-1">
                      <span className="text-gray-300">帖: </span>
                      <a href={`/community/posts/${c.post_id}`} target="_blank" className="hover:text-purple-600">{c.post_content?.slice(0, 50) || '(已删除)'}</a>
                    </div>
                    <div className="md:col-span-1 text-xs text-gray-400 text-center">{c.created_at?.slice(2, 16)}</div>
                    <div className="md:col-span-1 text-right">
                      <button onClick={() => deleteComment(c.id)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="size-3.5 inline" /> 删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'carousels' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 表单 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border p-5 sticky top-24">
                <h2 className="text-sm font-bold text-gray-700 mb-4">{editingCarousel?.id ? '编辑轮播图' : '新增轮播图'}</h2>
                {editingCarousel ? (
                  <>
                    <div className="mb-3">
                      {editingCarousel.image_url ? (
                        <div className="relative rounded-lg overflow-hidden bg-gray-100">
                          <img src={editingCarousel.image_url} alt="" className="h-40 w-full object-cover" />
                          <button onClick={() => setEditingCarousel({...editingCarousel, image_url: ''})} className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center text-sm hover:bg-black/80 transition-colors">×</button>
                        </div>
                      ) : (
                        <label className="flex h-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 hover:border-purple-300 hover:bg-purple-50/50 transition-colors">
                          <div className="text-center"><ImagePlus className="mx-auto size-8 mb-1" /><span className="text-xs">{uploading ? '上传中...' : '点击上传图片'}</span></div>
                          <input type="file" accept="image/*" onChange={uploadImage} className="hidden" disabled={uploading} />
                        </label>
                      )}
                    </div>
                    <input value={editingCarousel.title || ''} onChange={e => setEditingCarousel({...editingCarousel, title: e.target.value})} placeholder="标题（可选）" className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400" />
                    <input value={editingCarousel.link_url || ''} onChange={e => setEditingCarousel({...editingCarousel, link_url: e.target.value})} placeholder="跳转链接（可选）" className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400" />
                    <input value={editingCarousel.sort_order ?? 0} onChange={e => setEditingCarousel({...editingCarousel, sort_order: parseInt(e.target.value) || 0})} placeholder="排序" type="number" className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingCarousel(null)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
                      <button onClick={saveCarousel} disabled={!editingCarousel.image_url} className="flex-1 rounded-lg bg-purple-500 py-2 text-sm text-white disabled:opacity-40 hover:bg-purple-600 transition-colors font-medium">保存</button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => setEditingCarousel({ id: 0, image_url: '', title: '', link_url: '', sort_order: carousels.length })} className="flex h-40 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 hover:border-purple-300 hover:bg-purple-50/50 transition-colors">
                    <div className="text-center"><ImagePlus className="mx-auto size-10 mb-2" /><span className="text-sm font-medium">新建轮播图</span></div>
                  </button>
                )}
              </div>
            </div>

            {/* 列表 */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="size-5 animate-spin mr-2" /> 加载中...</div>
              ) : carousels.length === 0 && !editingCarousel ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400"><AlertTriangle className="size-8 mb-2" /><p>暂无轮播图，点击左侧新建</p></div>
              ) : (
                <div className="space-y-3">
                  {carousels.map((c, i) => (
                    <div key={c.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <span className="text-xs text-gray-300 font-mono w-6 text-right shrink-0">#{i + 1}</span>
                      <img src={c.image_url} alt="" className="h-16 w-28 rounded-lg object-cover shrink-0 bg-gray-100" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.title || '(无标题)'}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${c.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{c.is_active ? '显示' : '隐藏'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">排序: {c.sort_order} · 创建于 {formatTime(c.created_at).slice(2, 16)}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setEditingCarousel(c)} className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 transition-colors">编辑</button>
                        <button onClick={() => deleteCarousel(c.id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors">删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
