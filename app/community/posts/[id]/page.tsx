"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, Heart, MessageCircle, Send, Clock, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

interface Post { id: number; user_id: string; name: string; content: string; avatar: string; images: string; likes: number; created_at: string }
interface Comment { id: number; user_id: string; name: string; content: string; created_at: string }

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [commentText, setCommentText] = useState("")
  const [token, setToken] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => { setToken(localStorage.getItem('xinyu_token') || '') }, [])

  useEffect(() => {
    if (!id) return; setLoaded(true)
    fetch(`/api/community/posts/${id}`).then(r => r.json()).then(d => {
      if (d.post) { setPost(d.post); setLikes(d.post.likes); try { d.post.images = JSON.parse(d.post.images) || d.post.images } catch {} }
    }).catch(() => {})
    fetch(`/api/community/posts/${id}/comments`).then(r => r.json()).then(d => setComments(d.comments || [])).catch(() => {})
    if (token) {
      fetch(`/api/community/posts?page=1&limit=1`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => {
          const p = (d.posts || []).find((p: any) => p.id === parseInt(id))
          if (p) setLiked(p.liked === 1)
        }).catch(() => {})
    }
  }, [id, token])

  const handleLike = async () => {
    if (!token) return
    const r = await fetch(`/api/community/posts/${id}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    setLiked(d.liked); setLikes(d.liked ? likes + 1 : Math.max(0, likes - 1))
  }

  const submitComment = async () => {
    if (!commentText.trim() || !token) return
    const r = await fetch(`/api/community/posts/${id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: commentText.trim() })
    })
    const d = await r.json()
    if (d.success) {
      setComments([...comments, { id: d.commentId, user_id: '', name: '我', content: commentText.trim(), created_at: new Date().toISOString() }])
      setCommentText("")
    }
  }

  const formatTime = (t: string) => {
    const d = new Date(t.replace(' ', 'T') + '+08:00')
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!loaded || !post) return (
    <div className="min-h-screen bg-[#f5f0ff] flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-purple-100">
          <Sparkles className="size-5 text-purple-300 animate-pulse" />
        </div>
        <p className="text-sm text-gray-400">加载中...</p>
      </div>
    </div>
  )

  const imgs = Array.isArray(post.images) ? post.images : (() => { try { return JSON.parse(post.images) } catch { return [] } })()

  return (
    <div className="min-h-screen bg-[#f5f0ff] flex flex-col">
      {/* 顶部导航 */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-md border-b border-purple-50 sticky top-0 z-20">
        <button onClick={() => router.back()} className="size-9 rounded-xl bg-purple-50 flex items-center justify-center hover:bg-purple-100 transition-colors"><ArrowLeft className="size-4 text-purple-600" /></button>
        <h1 className="text-base font-bold text-gray-800">详情</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* 用户信息 */}
          <div className="flex items-center gap-3 mb-4">
            {post.avatar ? (
              <img src={post.avatar} alt="" className="size-11 rounded-full object-cover ring-2 ring-purple-100" />
            ) : (
              <div className="size-11 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-base font-bold shadow-sm">
                {post.name?.charAt(0) || '朋'}
              </div>
            )}
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-800">{post.name || '小雪的朋友'}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock className="size-3" /> {formatTime(post.created_at)}</p>
            </div>
          </div>

          {/* 正文 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-50/50">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

            {/* 图片画廊 */}
            {imgs.length > 0 && (
              <div className="mt-4">
                {imgs.length === 1 ? (
                  <img src={imgs[0]} alt="" className="w-full rounded-xl object-cover max-h-96 shadow-sm" />
                ) : (
                  <>
                    <div className="relative overflow-hidden rounded-xl bg-purple-50 shadow-sm">
                      <img src={imgs[imageIndex]} alt="" className="w-full h-72 object-cover" />
                      {imgs.length > 1 && (
                        <>
                          <button onClick={() => setImageIndex(Math.max(0, imageIndex - 1))} disabled={imageIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 flex items-center justify-center shadow disabled:opacity-30"><ArrowLeft className="size-4" /></button>
                          <button onClick={() => setImageIndex(Math.min(imgs.length - 1, imageIndex + 1))} disabled={imageIndex === imgs.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 flex items-center justify-center shadow disabled:opacity-30"><ArrowLeft className="size-4 rotate-180" /></button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {imgs.map((url: string, i: number) => (
                        <button key={i} onClick={() => setImageIndex(i)} className={`shrink-0 overflow-hidden rounded-lg transition-all ${i === imageIndex ? 'ring-2 ring-purple-500 ring-offset-1' : 'opacity-60 hover:opacity-90'}`}>
                          <img src={url} alt="" className="h-14 w-14 object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 交互区 */}
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-6 text-sm">
              <button onClick={handleLike} className={`flex items-center gap-1.5 transition-all ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}>
                <Heart className={`size-5 transition-all ${liked ? 'fill-red-500 scale-110' : ''}`} /> <span className="font-medium">{likes}</span>
              </button>
              <span className="flex items-center gap-1.5 text-gray-400">
                <MessageCircle className="size-5" /> <span className="font-medium">{comments.length}</span>
              </span>
            </div>
          </div>

          {/* 评论标题 */}
          {comments.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <MessageCircle className="size-4 text-purple-500" /> 全部评论 <span className="text-gray-400 font-normal">({comments.length})</span>
              </h3>
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-50 flex gap-3">
                    <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-sm font-bold text-purple-600">
                      {(c.name || '匿').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-700">{c.name || '匿名'}</p>
                        <span className="text-[10px] text-gray-400">{formatTime(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 评论输入栏 */}
      {token && (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-2.5 flex items-center gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
          <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()} placeholder="写评论..." className="flex-1 rounded-xl bg-purple-50/70 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200 transition-all placeholder:text-gray-300" />
          <button onClick={submitComment} disabled={!commentText.trim()} className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 p-2.5 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all"><Send className="size-4" /></button>
        </div>
      )}
    </div>
  )
}
