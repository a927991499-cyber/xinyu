"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { MessageCircle, ChevronRight } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { LoginModal } from "@/components/login-modal"

// 了解深度定义
const REL_LEVELS = [
  { level: 1, name: '初识·陌生',  icon: '🌱', threshold: 0 },
  { level: 2, name: '熟悉·了解',  icon: '🔍', threshold: 120 },
  { level: 3, name: '深知·懂得',  icon: '🧠', threshold: 500 },
  { level: 4, name: '透彻·看穿',  icon: '👁️', threshold: 1500 },
  { level: 5, name: '共鸣·一体',  icon: '✨', threshold: 4000 },
]

export default function HomePage() {
  const [greeting, setGreeting] = useState("下午好")
  const [showLogin, setShowLogin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [relData, setRelData] = useState<any>(null)
  const [userName, setUserName] = useState("")
  const [personaScore, setPersonaScore] = useState(0)

  const fetchRelation = useCallback(async () => {
    const token = localStorage.getItem('xinyu_token') || ''
    try {
      const res = await fetch('/api/user/relationship', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setRelData(data)
    } catch {}
  }, [])

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 6) setGreeting("夜深了")
    else if (hour < 9) setGreeting("早上好")
    else if (hour < 12) setGreeting("上午好")
    else if (hour < 14) setGreeting("中午好")
    else if (hour < 18) setGreeting("下午好")
    else setGreeting("晚上好")
  }, [])

  const fetchUserInfo = useCallback(async () => {
    const token = localStorage.getItem('xinyu_token') || ''
    try {
      const res = await fetch('/api/user/info', { headers: { Authorization: `Bearer ${token}` } })
      const d = await res.json()
      if (d.success) setUserName(d.user.name || '朋友')
    } catch {}
  }, [])

  const fetchPersonaScore = useCallback(async () => {
    const token = localStorage.getItem('xinyu_token') || ''
    try {
      const res = await fetch('/api/persona/profile', { headers: { Authorization: `Bearer ${token}` } })
      const d = await res.json()
      if (d.success) setPersonaScore(d.personaScore || 0)
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('xinyu_token')
    setIsLoggedIn(!!token)
    if (token) {
      fetchRelation()
      fetchUserInfo()
      fetchPersonaScore()
    }
  }, [])

  const handleLoginSuccess = (token: string, phone: string, userId?: string) => {
    localStorage.setItem('xinyu_token', token)
    localStorage.setItem('xinyu_phone', phone)
    setIsLoggedIn(true)
    setShowLogin(false)
    fetchRelation()
    fetchUserInfo()
    fetchPersonaScore()
    if (userId) localStorage.setItem('xinyu_user_id', userId)
  }

  const handleEnterChat = () => {
    if (isLoggedIn) { window.location.href = '/' }
    else { setShowLogin(true) }
  }

  // 计算今日状态分数
  const statusScore = relData ? Math.min(100, Math.round(
    (relData.progress * 0.4) +
    (Math.min(100, relData.consecutiveDays * 10) * 0.3) +
    (Math.min(100, relData.totalMessages / 5) * 0.3)
  )) : 0

  // 获取当前等级
  const getLevel = (score: number) => {
    let lvl = REL_LEVELS[0]
    for (let i = 0; i < REL_LEVELS.length; i++) {
      if (score >= REL_LEVELS[i].threshold) lvl = REL_LEVELS[i]
    }
    return lvl
  }

  const currentLevel = relData ? getLevel(relData.score) : REL_LEVELS[0]

  // 半圆进度条
  const ArcProgress = ({ value, size = 80 }: { value: number; size?: number }) => {
    const radius = (size - 8) / 2
    const circumference = Math.PI * radius
    const progress = Math.min(1, value / 100)
    const arcLength = progress * circumference

    return (
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <path
          d={`M 4 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2}`}
          fill="none" stroke="#e5e7eb" strokeWidth="6" strokeLinecap="round"
        />
        <path
          d={`M 4 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2}`}
          fill="none" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
        />
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f5ff] pb-24">
      {/* ===== 顶部区域 ===== */}
      <div className="px-5 pt-10">
        <div className="flex gap-3">
          {/* 左侧：问候 + 聊聊吧卡片 */}
          <div className="flex-1 flex flex-col gap-2">
            {/* 问候 */}
            <div>
              <h1 className="text-[#1f2937] text-xl font-bold flex items-center gap-1">
                {greeting}，小雪
                <span className="text-purple-500">💌</span>
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">今天也要好好照顾自己哦✨</p>
              <div className="inline-flex items-center gap-1.5 bg-[#faf5ff] border border-purple-200/50 rounded-full px-3 py-1 mt-2 shadow-sm">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-500">在线 · 等你来聊</span>
              </div>
            </div>

            {/* "和我聊聊吧" 卡片 — 宽度自适应 */}
            <div className="self-start bg-[#fcf9ff] border border-purple-200/50 rounded-2xl px-5 py-4 shadow-sm shadow-purple-100/50">
              <h3 className="text-gray-800 font-semibold text-[13px]">和我聊聊吧</h3>
              <p className="text-gray-400 text-[11px] mt-0.5">有什么想和我聊的吗？</p>
              <button 
                onClick={handleEnterChat}
                className="mt-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-[11px] font-medium px-5 py-2 rounded-full inline-flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="size-3.5" />
                进入对话
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 右侧：大头像 */}
          <div className="shrink-0">
            <div className="relative">
              {/* 紫色光晕 */}
              <div className="absolute -inset-4 rounded-full bg-purple-400/20 blur-3xl" />
              <div className="relative size-44 rounded-full overflow-hidden ring-2 ring-purple-200/50 shadow-xl shadow-purple-200/50">
                <Image 
                  src="/images/xiaoxue-avatar.gif" 
                  alt="小雪" 
                  width={176} 
                  height={176} 
                  className="object-cover w-full h-full" 
                  unoptimized 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 功能网格 ===== */}
      {isLoggedIn && (
        <div className="mx-5 mt-8 mb-4 grid grid-cols-2 gap-3">
          <button 
            onClick={() => window.location.href = '/persona'}
            className="bg-[#fcf9ff] border border-purple-200/50 rounded-2xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shrink-0">
                <Image src="/icons/renbei.png" alt="人生备份" width={28} height={28} className="object-contain" unoptimized />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-800">人生备份</h4>
                <p className="text-[10px] text-purple-500 mt-0.5">人格完整度 {personaScore}%</p>
                <div className="h-1 rounded-full bg-purple-100 mt-1.5 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: personaScore + '%' }} />
                </div>
              </div>
            </div>
          </button>

          <button 
            onClick={() => window.location.href = '/'}
            className="bg-[#fcf9ff] border border-purple-200/50 rounded-2xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shrink-0">
                <Image src="/icons/jiyi.png" alt="记忆对话" width={28} height={28} className="object-contain" unoptimized />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-800">记忆对话</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">与AI分身聊天</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-gray-300 ml-auto -mt-4" />
          </button>
        </div>
      )}

      {/* ===== 今日状态 ===== */}
      {isLoggedIn && relData && (
        <div className="mx-5 mb-4 bg-[#fcf9ff] border border-purple-200/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">今日状态</h3>
            <span className="text-[10px] text-gray-400">更新于 08:30</span>
          </div>

          <div className="flex items-center gap-6">
            {/* 左侧半圆环 */}
            <div className="relative shrink-0">
              <ArcProgress value={statusScore} size={70} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                <span className="text-xl font-bold text-gray-800">{statusScore}</span>
                <span className="text-[10px] text-gray-400">综合状态</span>
              </div>
            </div>

            {/* 右侧状态列表 */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🙂</span>
                  <div>
                    <p className="text-xs text-gray-700">情绪</p>
                    <p className="text-[10px] text-gray-400">平静积极</p>
                  </div>
                </div>
                <span className="text-xs text-purple-500">良好</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🌙</span>
                  <div>
                    <p className="text-xs text-gray-700">睡眠</p>
                    <p className="text-[10px] text-gray-400">{Math.min(8, relData.consecutiveDays + 5)} 小时</p>
                  </div>
                </div>
                <span className="text-xs text-purple-500">良好</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎯</span>
                  <div>
                    <p className="text-xs text-gray-700">专注时长</p>
                    <p className="text-[10px] text-gray-400">{(relData.totalMessages / 10).toFixed(1)} 小时</p>
                  </div>
                </div>
                <span className="text-xs text-purple-500">优秀</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 目标追踪 ===== */}
      {isLoggedIn && relData && (
        <div className="mx-5 mb-4">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-purple-600 font-medium">正在陪伴你的目标</span>
              <span className="text-xs">✨</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">坚持学习 · 提升自己</p>
                <p className="text-[10px] text-gray-400 mt-0.5">不积跬步，无以至千里</p>
              </div>
              <span className="text-xs text-purple-500">进行中 {relData.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white mt-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all" 
                style={{ width: relData.progress + '%' }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== 未登录状态 ===== */}
      {!isLoggedIn && (
        <div className="mx-5">
          <div className="bg-[#fcf9ff] border border-purple-200/50 rounded-2xl p-6 text-center shadow-sm">
            <div className="size-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💜</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">登录后开启你的心灵之旅</p>
            <p className="text-xs text-gray-400 mb-4">小雪会记得你的一切</p>
            <button 
              onClick={() => setShowLogin(true)}
              className="bg-[#8b5cf6] text-white px-8 py-2.5 rounded-full text-sm font-medium hover:bg-[#7c3aed] transition-colors"
            >
              登录 / 注册
            </button>
          </div>
        </div>
      )}

      <BottomNav />
      <LoginModal isOpen={showLogin} onSuccess={handleLoginSuccess} onClose={() => setShowLogin(false)} />
    </div>
  )
}
