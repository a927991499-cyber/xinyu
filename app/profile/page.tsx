"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Phone, LogOut, User, LogIn, MessageSquare, Calendar, Image, Pencil, Camera, Crown, Trash2, AlertTriangle, Gift, Shield, FileText, BookOpen, Clock } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { LoginModal } from "@/components/login-modal"

// 用户信息接口
interface UserInfo {
  user_id: string
  phone: string
  name: string
  avatar_url: string | null
}

// 聊天统计接口
interface ChatStats {
  totalMessages: number
  totalDays: number
  totalImages: number
}

export default function ProfilePage() {
  const [phone, setPhone] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [stats, setStats] = useState<ChatStats>({ totalMessages: 0, totalDays: 0, totalImages: 0 })
  const [showLogin, setShowLogin] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [memberStatus, setMemberStatus] = useState({
    type: "free",
    typeName: "免费用户",
    expire: null as string | null,
    isExpired: false,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showReset, setShowReset] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [gifts, setGifts] = useState<any[]>([])
  const [showGift, setShowGift] = useState<any>(null)
  const [giftName, setGiftName] = useState("")
  const [giftPhone, setGiftPhone] = useState("")
  const [giftAddr, setGiftAddr] = useState("")
  const [giftSubmitting, setGiftSubmitting] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const [showLegacy, setShowLegacy] = useState(false)
  const [legacyName, setLegacyName] = useState("")
  const [legacyPhone, setLegacyPhone] = useState("")
  const [legacyEmail, setLegacyEmail] = useState("")
  const [legacyMessage, setLegacyMessage] = useState("")
  const [legacySaved, setLegacySaved] = useState(false)
  const [savingLegacy, setSavingLegacy] = useState(false)
  const [legacyError, setLegacyError] = useState("")
  const [showContact, setShowContact] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("/qr-contact.jpg")

  // 加载客服二维码 URL
  useEffect(() => {
    if (showContact) {
      fetch('/api/settings/qr-code')
        .then(r => r.json())
        .then(d => { if (d.success && d.url) setQrCodeUrl(d.url) })
        .catch(() => {})
    }
  }, [showContact])

  // 加载数字遗产联系人数据
  useEffect(() => {
    if (!showLegacy) return
    const token = localStorage.getItem('xinyu_token') || ''
    fetch('/api/user/legacy-contact', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.contact) {
          setLegacyName(d.contact.name || '')
          setLegacyPhone(d.contact.phone || '')
          setLegacyEmail(d.contact.email || '')
          setLegacyMessage(d.contact.message || '')
          setLegacySaved(true)
        } else {
          setLegacyName('')
          setLegacyPhone('')
          setLegacyEmail('')
          setLegacyMessage('')
          setLegacySaved(false)
        }
      }).catch(() => {})
  }, [showLegacy])
  const router = useRouter()

  // 挂载时读取登录状态
  useEffect(() => {
    const savedPhone = localStorage.getItem('xinyu_phone')
    const savedUserId = localStorage.getItem('xinyu_user_id')
    if (savedPhone) {
      setPhone(savedPhone)
    }
    if (savedUserId) {
      setUserId(savedUserId)
    }
  }, [])

  // 登录后获取用户信息和统计
  useEffect(() => {
    if (phone) {
      // 如果没有 userId，尝试从 localStorage 或后端获取
      if (!userId) {
        const savedUserId = localStorage.getItem('xinyu_user_id')
        if (savedUserId) {
          setUserId(savedUserId)
        } else {
          // 根据 phone 从后端获取 userId
          fetchUserIdByPhone(phone)
        }
      } else {
        fetchUserInfo()
        // fetchChatStats()  // 暂时隐藏
      }
    }
  }, [phone, userId])

  // 根据 phone 获取 userId
  const fetchUserIdByPhone = async (phone: string) => {
    try {
      const res = await fetch(`/api/auth/get-user-id?phone=${phone}`)
      const data = await res.json()
      if (data.success && data.userId) {
        localStorage.setItem('xinyu_user_id', data.userId)
        setUserId(data.userId)
        console.log('[Profile] 已获取 userId:', data.userId)
      }
    } catch (error) {
      console.error('[Profile] 获取 userId 失败:', error)
    }
  }

  // 当 userId 变化时获取信息
  useEffect(() => {
    if (userId && phone) {
      fetchUserInfo()
      // fetchChatStats()  // 暂时隐藏
      // fetchMemberStatus()  // 暂时隐藏
      fetchGifts()  // 获取礼物
      // fetchChatStats()  // 暂时隐藏聊天统计
    }
  }, [userId])

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const res = await fetch(`/api/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setUserInfo(data.user)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  // 获取聊天统计
  const fetchChatStats = async () => {
    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const res = await fetch(`/api/user/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('获取统计失败:', error)
    }
  }

  // 获取会员状态
  const fetchMemberStatus = async () => {
    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const res = await fetch(`/api/user/member-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setMemberStatus(data.member)
      }
    } catch (error) {
      console.error('获取会员状态失败:', error)
    }
  }

  // 获取礼物列表
  const fetchGifts = async () => {
    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const res = await fetch('/api/user/gifts', { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setGifts(data.gifts || [])
    } catch {}
  }

  // 提交礼物地址
  const submitGiftAddress = async () => {
    if (!showGift || !giftName.trim() || !giftPhone.trim() || !giftAddr.trim()) return
    setGiftSubmitting(true)
    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const res = await fetch('/api/user/gifts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId: showGift.id, name: giftName, phone: giftPhone, address: giftAddr })
      })
      if (res.ok) { setShowGift(null); fetchGifts() }
    } catch {}
    setGiftSubmitting(false)
  }

  // 脱敏显示手机号
  const maskPhone = (p: string) => {
    if (p.length !== 11) return p
    return p.slice(0, 3) + '****' + p.slice(7)
  }

  // 登录成功
  const handleLoginSuccess = (token: string, phone: string, userId: string) => {
    localStorage.setItem('xinyu_token', token)
    localStorage.setItem('xinyu_phone', phone)
    localStorage.setItem('xinyu_user_id', userId)
    setPhone(phone)
    setUserId(userId)
    setShowLogin(false)
  }

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('xinyu_token')
    localStorage.removeItem('xinyu_phone')
    localStorage.removeItem('xinyu_user_id')
    setPhone(null)
    setUserId(null)
    setUserInfo(null)
    setStats({ totalMessages: 0, totalDays: 0, totalImages: 0 })
  }

  // 修改名字
  const handleUpdateName = async () => {
    if (!editName.trim() || !userId) return

    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const res = await fetch('/api/user/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName.trim() })  // ❌ 不再发送 userId
      })
      const data = await res.json()
      if (data.success) {
        setUserInfo(prev => prev ? { ...prev, name: editName.trim() } : null)
        setIsEditingName(false)
      } else {
        alert('修改失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('修改名字失败:', error)
      alert('修改失败，请稍后重试')
    }
  }

  // 上传头像
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (!file) return

    console.log('[UploadAvatar] 开始上传，file:', file.name)
    setUploading(true)
    const formData = new FormData()
    formData.append('avatar', file)
    // ❌ 不再发送 userId，后端从 token 解析

    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const res = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })
      const data = await res.json()
      console.log('[UploadAvatar] 响应:', data)
      if (data.success) {
        setUserInfo(prev => prev ? { ...prev, avatar_url: data.avatarUrl } : null)
        alert('头像上传成功！')
      } else {
        alert('上传失败：' + (data.error || '未知错误'))
      }
    } catch (error: any) {
      console.error('[UploadAvatar] 错误:', error)
      alert('上传失败，请稍后重试：' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 重置数据
  const handleReset = async () => {
    setResetting(true)
    try {
      const token = localStorage.getItem('xinyu_token') || ''
      const res = await fetch('/api/user/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setShowResetConfirm(false)
        setShowReset(false)
        // 刷新页面
        window.location.reload()
      }
    } catch {}
    setResetting(false)
  }

  return (
    <div className="min-h-screen bg-[#f5f3f7] pb-24">
      {/* 顶部渐变 */}
      <div className="relative bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#ec4899] pb-16 pt-10 px-4">
        {/* 装饰圆 */}
        <div className="absolute top-0 right-0 size-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 size-24 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />
        
        <h1 className="relative text-xl font-bold text-white/90 mb-6 tracking-wide">个人中心</h1>

        {phone ? (
          <div className="relative flex flex-col items-center">
            {/* 头像 — 浮动在卡片上方 */}
            <div className="relative mb-2 z-10">
              <div className="size-[88px] rounded-full bg-white/10 backdrop-blur p-[3px] ring-2 ring-white/20">
                <div className="size-full rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {userInfo?.avatar_url ? (
                    <img src={userInfo.avatar_url.replace('/api/images/avatars/', '/api/images/')} alt="头像" className="size-full object-cover" />
                  ) : (
                    <User className="size-10 text-white/80" />
                  )}
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 size-8 rounded-full bg-white shadow-lg shadow-purple-200/50 flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                disabled={uploading}
              >
                <Camera className="size-4 text-purple-500" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            {/* 名字 */}
            <div className="relative z-10 flex items-center gap-1.5 mb-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                    className="bg-white/15 rounded-lg px-3 py-1.5 text-white placeholder-white/50 text-sm outline-none backdrop-blur w-32" placeholder="输入名字" autoFocus />
                  <button onClick={handleUpdateName} className="text-white text-xs bg-white/20 rounded-lg px-3 py-1.5 backdrop-blur">保存</button>
                </div>
              ) : (
                <>
                  <span className="text-white text-base font-semibold">{userInfo?.name || '小雪的朋友'}</span>
                  <button onClick={() => { setEditName(userInfo?.name || ''); setIsEditingName(true) }}
                    className="text-white/50 hover:text-white/90 transition-colors">
                    <Pencil className="size-3.5" />
                  </button>
                </>
              )}
            </div>
            <p className="relative z-10 text-white/50 text-xs">{maskPhone(phone)}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center pb-4">
            <div className="size-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-3 ring-2 ring-white/10">
              <User className="size-10 text-white/70" />
            </div>
            <p className="text-white/60 text-sm mb-4">登录后解锁全部功能</p>
            <button onClick={() => setShowLogin(true)}
              className="bg-white/90 text-purple-600 px-8 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-purple-500/20 hover:bg-white transition-all active:scale-95">
              登录 / 注册
            </button>
          </div>
        )}
      </div>

      {/* 礼物卡片 */}
      {phone && gifts.length > 0 && (
        <div className="px-4 -mt-8 mb-4 space-y-2.5 relative z-20">
          {gifts.map((g: any) => (
            <div key={g.id} className="rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 p-4 shadow-sm border border-pink-100/50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="size-6 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Gift className="size-3.5 text-pink-500" />
                </div>
                <span className="text-xs font-semibold text-pink-600">小雪送你的礼物</span>
              </div>
              <p className="text-sm text-gray-700 mb-2.5 font-medium">{g.content}</p>
              {g.status === 'pending' ? (
                <button onClick={() => { setShowGift(g); setGiftName(""); setGiftPhone(phone || ""); setGiftAddr("") }}
                  className="rounded-xl bg-pink-500 px-5 py-2 text-xs font-semibold text-white active:scale-95 transition-transform shadow-sm shadow-pink-200">
                  填写地址领取
                </button>
              ) : g.status === 'claimed' ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600"><span className="size-1.5 rounded-full bg-green-400" />已领取，等待发货</div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="size-1.5 rounded-full bg-gray-300" />已送达</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 功能菜单 */}
      {phone && (
        <div className={`px-4 ${gifts.length === 0 ? '-mt-6' : ''} relative z-20`}>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {[
              { icon: Shield, label: '隐私协议', href: '/legal?type=privacy', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: FileText, label: '用户协议', href: '/legal?type=terms', color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { icon: BookOpen, label: '个人信息保护告知书', href: '/legal?type=notice', color: 'text-purple-500', bg: 'bg-purple-50' },
            ].map(({ icon: Icon, label, href, color, bg }) => (
              <a key={label} href={href} className="flex items-center gap-3 px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50/80 transition-colors no-underline active:bg-gray-100">
                <div className={`size-8 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <span className="flex-1">{label}</span>
                <span className="text-gray-300 text-lg">›</span>
              </a>
            ))}

            {/* 联系我们 */}
            <button onClick={() => setShowContact(true)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50/80 transition-colors active:bg-gray-100">
              <div className="size-8 rounded-xl bg-sky-50 flex items-center justify-center">
                <MessageSquare className="size-4 text-sky-500" />
              </div>
              <span className="flex-1 text-left">联系我们</span>
              <span className="text-gray-300 text-lg">›</span>
            </button>

            {/* 数字遗产联系人 */}
            <button onClick={() => setShowLegacy(true)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50/80 transition-colors active:bg-gray-100">
              <div className="size-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="size-4 text-amber-500" />
              </div>
              <span className="flex-1 text-left">数字遗产联系人</span>
              <span className="text-gray-300 text-lg">›</span>
            </button>
            <button onClick={() => setShowReset(true)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-red-400 hover:bg-red-50/50 transition-colors active:bg-red-100">
              <div className="size-8 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="size-4 text-red-400" />
              </div>
              <span className="flex-1 text-left">重置数据</span>
              <span className="text-gray-300 text-lg">›</span>
            </button>
            <button onClick={() => setShowLogout(true)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-red-400 active:bg-red-50">
              <div className="size-8 rounded-xl bg-red-50 flex items-center justify-center">
                <LogOut className="size-4 text-red-400" />
              </div>
              <span className="flex-1 text-left">退出登录</span>
            </button>
          </div>

          {/* 底部版本号 */}
          <p className="text-center text-xs text-gray-300 mt-6 pb-2">心屿 v1.0 · 用AI温暖你的每一天</p>
        </div>
      )}

      {!phone && (
        <div className="px-4 -mt-4 relative z-20">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="size-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <LogIn className="size-7 text-purple-400" />
            </div>
            <p className="text-gray-400 text-sm">登录后查看更多功能</p>
          </div>
        </div>
      )}

      {/* 联系我们弹窗 */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowContact(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">联系我们</h3>
              <button onClick={() => setShowContact(false)} className="size-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-gray-400 text-sm">x</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              扫描下方二维码，添加客服微信<br />
              获取更多帮助与支持
            </p>
            <div className="rounded-xl bg-gray-50 p-4 mb-4 mx-auto inline-block">
              <img src={qrCodeUrl} alt="客服二维码" className="w-48 h-48 object-contain rounded-lg" />
            </div>
            <button
              onClick={async () => {
                try {
                  const resp = await fetch(qrCodeUrl)
                  const blob = await resp.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = '客服二维码.jpg'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                } catch {
                  alert('保存失败，请长按图片选择"保存图片"')
                }
              }}
              className="w-full rounded-xl bg-sky-500 py-2.5 text-sm font-medium text-white hover:bg-sky-600 active:bg-sky-700 transition-colors"
            >
              保存图片到相册
            </button>
            <p className="text-xs text-gray-300 mt-3">长按图片也可以保存哦</p>
          </div>
        </div>
      )}

      <BottomNav />
      <LoginModal isOpen={showLogin} onSuccess={handleLoginSuccess} onClose={() => setShowLogin(false)} />

      {/* 礼物地址填写弹窗 — 保持不变 */}
      {showGift && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowGift(null)}>
          <div className="mx-4 w-full max-w-[340px] rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-1">填写收货信息</h3>
            <p className="text-xs text-gray-400 mb-4">小雪会给你寄礼物哦～</p>
            <input type="text" placeholder="姓名" value={giftName} onChange={e => setGiftName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm mb-2 outline-none focus:border-pink-400" />
            <input type="tel" placeholder="手机号" value={giftPhone} onChange={e => setGiftPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm mb-2 outline-none focus:border-pink-400" />
            <textarea rows={2} placeholder="详细地址（省市区+门牌号）" value={giftAddr} onChange={e => setGiftAddr(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm mb-4 outline-none focus:border-pink-400 resize-none" />
            <button onClick={submitGiftAddress} disabled={giftSubmitting}
              className="w-full rounded-xl bg-pink-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {giftSubmitting ? '提交中…' : '确认领取'}
            </button>
          </div>
        </div>
      )}

      {/* 重置弹窗不变 */}
      {showReset && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowReset(false)}>
          <div className="mx-4 w-full max-w-[320px] rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">确认重置数据？</h3>
                <p className="text-xs text-gray-500">此操作将清除所有聊天记录和记忆</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">重置后你的账号还在，但聊天记录、记忆、人格数据将被清空，就像重新开始。</p>
            <div className="flex gap-2">
              <button onClick={() => setShowReset(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500">取消</button>
              <button onClick={() => { setShowReset(false); setShowResetConfirm(true) }} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white">确认重置</button>
            </div>
          </div>
        </div>
      )}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}>
          <div className="mx-4 w-full max-w-[320px] rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-red-200 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">最后一次确认</h3>
                <p className="text-xs text-red-500">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">所有聊天记录和记忆将被永久删除。你确定要继续吗？</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowResetConfirm(false); setShowReset(true) }} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500">再想想</button>
              <button onClick={handleReset} disabled={resetting} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {resetting ? '重置中…' : '永久删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 退出登录确认 */}
      {showLogout && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLogout(false)}>
          <div className="mx-4 w-full max-w-[300px] rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="size-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
                <LogOut className="size-6 text-orange-400" />
              </div>
              <h3 className="font-semibold text-gray-800">确定退出登录？</h3>
              <p className="text-xs text-gray-400 mt-1">退出后需要重新登录才能使用</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowLogout(false)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500 active:bg-gray-200">取消</button>
              <button onClick={handleLogout}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white active:bg-red-600">确定退出</button>
            </div>
          </div>
        </div>
      )}

      {/* 数字遗产联系人弹窗 */}
      {showLegacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowLegacy(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">数字遗产联系人</h3>
              <button onClick={() => setShowLegacy(false)} className="size-7 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-sm">x</span></button>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              如果你长期不再登录，你的数字记忆将自动发送给指定的联系人。
              这是"备份"的最终保障。
            </p>
            {legacySaved && (
              <div className="mb-4 rounded-xl bg-green-50 p-3 text-xs text-green-600 flex items-center gap-2">
                <span>已保存</span>
              </div>
            )}
            {legacyError && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-500 flex items-center gap-2">
                <span>{legacyError}</span>
              </div>
            )}
            <input value={legacyName} onChange={e => setLegacyName(e.target.value)} placeholder="联系人姓名 *" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 mb-2" />
            <input value={legacyPhone} onChange={e => setLegacyPhone(e.target.value)} placeholder="手机号（可选）" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 mb-2" />
            <input value={legacyEmail} onChange={e => setLegacyEmail(e.target.value)} placeholder="邮箱（可选）" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 mb-2" />
            <textarea value={legacyMessage} onChange={e => setLegacyMessage(e.target.value)} placeholder="想对联系人的话（可选）" rows={2} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 mb-4 resize-none" />
            <button onClick={async () => {
              if (!legacyName.trim()) return
              setSavingLegacy(true); setLegacyError("")
              const token = localStorage.getItem('xinyu_token') || ''
              const r = await fetch('/api/user/legacy-contact', {
                method: 'POST', headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: legacyName, phone: legacyPhone, email: legacyEmail, message: legacyMessage })
              })
              const d = await r.json()
              if (d.success) setLegacySaved(true)
              else setLegacyError(d.error || '保存失败')
              setSavingLegacy(false)
            }} disabled={!legacyName.trim() || savingLegacy} className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white disabled:opacity-40 active:bg-amber-600">
              {savingLegacy ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
