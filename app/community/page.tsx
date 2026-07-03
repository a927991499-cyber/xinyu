"use client"

import { useState, useEffect } from "react"
import { Heart, MessageCircle, Plus, X, ImagePlus, ChevronLeft, ChevronRight, ImageIcon, SendHorizontal, Sparkles, Clock, MessageSquareText } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"

interface Post { id: number; user_id: string; name: string; content: string; avatar: string; images: string; likes: number; liked: number; comment_count: number; created_at: string; is_pinned: number }
interface Carousel { id: number; image_url: string; title: string; link_url: string }

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [carousels, setCarousels] = useState<Carousel[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPost, setShowPost] = useState(false)
  const [newContent, setNewContent] = useState("")
  const [newImages, setNewImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [token, setToken] = useState("")
  const [curSlide, setCurSlide] = useState(0)
  const [postError, setPostError] = useState("")

  useEffect(() => { setToken(localStorage.getItem('xinyu_token') || '') }, [])
  useEffect(() => { fetch("/api/community/carousels").then(r => r.json()).then(d => setCarousels(d.carousels || [])).catch(() => {}) }, [])
  useEffect(() => {
    setLoading(true)
    fetch(`/api/community/posts?page=${page}&limit=20`)
      .then(r => r.json()).then(d => { setPosts(d.posts || []); setTotalPages(d.totalPages || 1) })
      .finally(() => setLoading(false))
  }, [page])

  const handleLike = async (postId: number) => {
    if (!token) return
    const r = await fetch(`/api/community/posts/${postId}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    setPosts(posts.map(p => p.id === postId ? { ...p, liked: d.liked ? 1 : 0, likes: d.liked ? p.likes + 1 : Math.max(0, p.likes - 1) } : p))
  }

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { setPostError("图片不能超过5MB"); return }
    setUploading(true); setPostError("")
    try {
      const fd = new FormData(); fd.append("file", file)
      const r = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.url) setNewImages([...newImages, d.url])
      else setPostError(d.error || "上传失败")
    } catch (e: any) { setPostError(e.message || "上传异常") }
    finally { setUploading(false) }
  }

  const submitPost = async () => {
    if (!newContent.trim()) return; setPostError("")
    const r = await fetch("/api/community/posts", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: newContent.trim(), images: newImages })
    })
    const d = await r.json()
    if (d.success) { setShowPost(false); setNewContent(""); setNewImages([]); setPage(1); setPostError("") }
    else { setPostError(d.error || "发布失败") }
  }

  const formatTime = (t: string) => {
    const d = new Date(t.replace(' ', 'T') + '+08:00')
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const parseImages = (images: string) => { try { const imgs = JSON.parse(images); return Array.isArray(imgs) ? imgs : [] } catch { return [] } }

  return (
    <div className="min-h-screen bg-[#f5f0ff] pb-20">
      {/* 顶部渐变装饰 */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-purple-200/60 via-purple-100/30 to-transparent" />
        
        {/* 轮播图 */}
        {carousels.length > 0 && (
          <div className="relative px-4 pt-4">
            <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-purple-200/40">
              <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${curSlide * 100}%)` }}>
                {carousels.map((c, i) => (
                  <a key={i} href={c.link_url || '#'} className="w-full shrink-0" target={c.link_url ? '_blank' : undefined}>
                    <img src={c.image_url} alt={c.title} className="h-48 w-full object-cover" />
                    {c.title && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-5"><p className="text-lg font-bold text-white drop-shadow-sm">{c.title}</p></div>}
                  </a>
                ))}
              </div>
              {carousels.length > 1 && (
                <>
                  <button onClick={() => setCurSlide(Math.max(0, curSlide - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 flex items-center justify-center shadow-md backdrop-blur-sm hover:bg-white transition-all"><ChevronLeft className="size-4 text-gray-700" /></button>
                  <button onClick={() => setCurSlide(Math.min(carousels.length - 1, curSlide + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 flex items-center justify-center shadow-md backdrop-blur-sm hover:bg-white transition-all"><ChevronRight className="size-4 text-gray-700" /></button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {carousels.map((_, i) => <button key={i} onClick={() => setCurSlide(i)} className={`transition-all duration-300 rounded-full ${i === curSlide ? 'w-5 h-2 bg-white shadow-md' : 'w-2 h-2 bg-white/60'}`} />)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="size-5 text-purple-500" /> 社区
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">分享你的想法和日常</p>
          </div>
          {token && (
            <button onClick={() => setShowPost(true)} className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-300/40 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200">
              <Plus className="size-4" /> 发帖
            </button>
          )}
        </div>

        {/* 帖子列表 */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse rounded-2xl bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-full bg-purple-100" />
                  <div className="flex-1"><div className="h-3 w-24 rounded bg-purple-100" /><div className="h-2 w-16 rounded bg-purple-50 mt-2" /></div>
                </div>
                <div className="h-3 w-full rounded bg-purple-50 mb-2" />
                <div className="h-3 w-3/4 rounded bg-purple-50" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-purple-100"><MessageSquareText className="size-7 text-purple-300" /></div>
            <p className="text-sm text-gray-500">还没有帖子</p>
            <p className="text-xs text-gray-400 mt-1">来发第一条吧～</p>
            {token && (
              <button onClick={() => setShowPost(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-purple-500 px-5 py-2 text-sm font-medium text-white shadow">写点什么</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, idx) => {
              const imgs = parseImages(post.images)
              return (
                <a key={post.id} href={`/community/posts/${post.id}`} className="group block rounded-2xl bg-white p-4 shadow-sm hover:shadow-md border border-purple-50/50 transition-all duration-200">
                  {/* 用户信息 */}
                  <div className="flex items-center gap-3 mb-3">
                    {post.avatar ? (
                      <img src={post.avatar} alt="" className="size-10 rounded-full object-cover ring-2 ring-purple-100" />
                    ) : (
                      <div className="size-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {post.name?.charAt(0) || '朋'}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{post.name || '小雪的朋友'}</p>
                        {post.is_pinned === 1 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-500">置顶</span>}
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="size-3" /> {formatTime(post.created_at)}</p>
                    </div>
                  </div>

                  {/* 内容 */}
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-3 group-hover:text-gray-900 transition-colors">{post.content}</p>

                  {/* 图片 */}
                  {imgs.length > 0 && (
                    <div className={`mt-3 grid gap-2 ${imgs.length === 1 ? 'grid-cols-1' : imgs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {imgs.slice(0, 3).map((url: string, i: number) => (
                        <div key={i} className="relative overflow-hidden rounded-xl bg-purple-50">
                          <img src={url} alt="" className="h-28 w-full object-cover hover:scale-105 transition-transform duration-300" />
                          {i === 2 && imgs.length > 3 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold text-lg">+{imgs.length - 3}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 底部操作区 */}
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-5 text-xs">
                    <button onClick={(e) => { e.preventDefault(); handleLike(post.id) }} className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}>
                      <Heart className={`size-4 transition-all ${post.liked ? 'fill-red-500 scale-110' : ''}`} /> {post.likes > 0 ? post.likes : '点赞'}
                    </button>
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <MessageCircle className="size-4" /> {post.comment_count > 0 ? post.comment_count : '评论'}
                    </span>
                  </div>
                </a>
              )
            })}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2
              if (p < 1 || p > totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)} className={`min-w-[36px] h-9 rounded-xl text-sm font-medium transition-all ${page === p ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-200' : 'bg-white text-gray-500 hover:bg-purple-50 border border-gray-100'}`}>{p}</button>
              )
            })}
          </div>
        )}
      </div>

      {/* 发帖弹窗 */}
      {showPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowPost(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 max-h-[85vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="size-5 text-purple-500" /> 分享想法
              </h2>
              <button onClick={() => setShowPost(false)} className="size-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><X className="size-4 text-gray-500" /></button>
            </div>

            {/* 输入区 */}
            <div className="relative">
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="说点什么..." rows={4} className="w-full rounded-xl border-0 bg-purple-50/50 p-4 text-sm resize-none outline-none focus:ring-2 focus:ring-purple-200 transition-all placeholder:text-gray-300" />
              {postError && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><X className="size-3" /> {postError}</p>}
            </div>

            {/* 已选图片 */}
            {newImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {newImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-gray-100" />
                    <button onClick={() => setNewImages(newImages.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* 操作栏 */}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-purple-50 px-3.5 py-2 text-sm font-medium text-purple-600 hover:bg-purple-100 transition-colors">
                <ImageIcon className="size-4" /> {uploading ? '上传中...' : '添加图片'}
                <input type="file" accept="image/*" onChange={uploadImage} className="hidden" disabled={uploading} />
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPost(false)} className="rounded-xl px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">取消</button>
                <button onClick={submitPost} disabled={!newContent.trim()} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all">
                  <SendHorizontal className="size-4" /> 发布
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
