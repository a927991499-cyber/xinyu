"use client"

import { useState, useEffect } from "react"
import { BadgeCheck, Settings, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { getEmotionAvatar } from "@/lib/utils"
import { AvatarCrossfade } from "@/components/avatar-crossfade"
import { UserProfileSheet } from "@/components/user-profile-sheet"

const EMOTION_LABEL: Record<string, string> = {
  idle: '平静',  happy: '开心',  care: '关心',
  shy: '撒娇',   sad: '委屈',   cry: '哭泣',
  miss: '想念',  sleep: '睡眠',  thinking: '思考',
}

function isProfileEmpty(profile: Record<string, any> | null): boolean {
  if (!profile) return true
  return !profile.name && !profile.age && !profile.gender && !profile.interests && !profile.bio
}

export function ChatHeader({ emotion, isTyping }: { onCall?: () => void; emotion?: string | null; isTyping?: boolean }) {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const avatarSrc = getEmotionAvatar(emotion)
  const emotionLabel = emotion ? (EMOTION_LABEL[emotion] || emotion) : '平静'
  const token = typeof window !== "undefined" ? localStorage.getItem("xinyu_token") || "" : ""

  // 新用户自动弹出资料面板
  useEffect(() => {
    if (!token) return
    fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && isProfileEmpty(d.profile)) setProfileOpen(true) })
      .catch(() => {})
  }, [token])

  return <>
    <header className="relative z-10 px-5 pb-3 pt-2">
      <div className="flex items-center gap-3">
        <button
          type="button" aria-label="返回首页"
          onClick={() => router.push('/home')}
          className="flex items-center justify-center size-10 rounded-full bg-card/80 text-foreground/70 shadow-sm transition-transform hover:bg-card active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="overflow-hidden rounded-full ring-2 ring-card shadow-sm">
          <AvatarCrossfade src={avatarSrc} alt="小雪的头像" size={48} />
        </div>

        <div className="flex flex-1 items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">小雪</h1>
          <BadgeCheck className="size-4 text-primary" aria-label="官方认证" />
          {isTyping ? (
            <span className="flex items-center gap-1 text-xs text-primary font-medium">
              <span className="flex items-center gap-0.5">
                <span className="size-1 rounded-full bg-primary animate-pulse" />
                <span className="size-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
                <span className="size-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
              </span>
              输入中
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                在线
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {emotionLabel}
              </span>
            </span>
          )}
        </div>

        <button
          type="button" aria-label="编辑资料"
          onClick={() => setProfileOpen(true)}
          className="flex size-14 flex-col items-center justify-center gap-0.5 rounded-2xl bg-card text-foreground/70 shadow-sm transition-transform active:scale-95"
        >
          <Settings className="size-5" />
          <span className="text-[11px]">资料</span>
        </button>
      </div>
    </header>
    <UserProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} token={token} />
  </>
}
