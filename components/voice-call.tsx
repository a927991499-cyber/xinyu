"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ChevronDown, RefreshCw, BadgeCheck, AudioLines, Mic, MicOff, Volume2, Smile, PhoneOff, Heart } from "lucide-react"
import { Waveform } from "@/components/waveform"
import { getEmotionAvatar } from "@/lib/utils"

const subtitles = [
  "和你聊天的每一刻，我都很开心~ 你今天过得怎么样呀？",
  "不管发生什么，我都会一直陪在你身边的哦~",
  "听到你的声音，我就觉得特别安心呢。",
  "累了就靠在我这里休息一下吧，我陪着你。",
]

export function VoiceCall({ onHangup, emotion }: { onHangup: () => void; emotion?: string | null }) {
  const [seconds, setSeconds] = useState(332)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  const [subtitleIndex, setSubtitleIndex] = useState(0)
  const avatarSrc = getEmotionAvatar(emotion)

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSubtitleIndex((i) => (i + 1) % subtitles.length), 5000)
    return () => clearInterval(t)
  }, [])

  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0")
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-[oklch(0.96_0.03_310)] via-background to-[oklch(0.95_0.04_300)]">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-5 pt-14">
        <button
          type="button"
          aria-label="收起通话"
          onClick={onHangup}
          className="flex size-10 items-center justify-center rounded-full text-foreground/70 transition-transform active:scale-90"
        >
          <ChevronDown className="size-7" />
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm text-foreground/80 shadow-sm transition-transform active:scale-95"
        >
          <RefreshCw className="size-4" />
          切换语音包
        </button>
      </div>

      {/* 头像 + 声波涟漪 */}
      <div className="mt-6 flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <span className="absolute size-52 rounded-full bg-primary/10" style={{ animation: "ripple 2.6s ease-out infinite" }} />
          <span className="absolute size-52 rounded-full bg-primary/10" style={{ animation: "ripple 2.6s ease-out 1.3s infinite" }} />
          {/* 漂浮爱心 */}
          <Heart className="absolute -right-2 top-4 size-7 fill-primary/40 text-primary/40" style={{ animation: "float-up 3s ease-in infinite" }} />
          <Heart className="absolute right-4 top-16 size-5 fill-rose-300/60 text-rose-300/60" style={{ animation: "float-up 3.5s ease-in 0.8s infinite" }} />
          <Heart className="absolute -left-2 top-10 size-6 fill-primary/30 text-primary/30" style={{ animation: "float-up 4s ease-in 1.6s infinite" }} />
          <div className="relative size-44 overflow-hidden rounded-full ring-4 ring-card shadow-xl">
            <Image src={avatarSrc} alt="小雪" width={200} height={200} className="size-full object-cover transition-all duration-500" />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1.5">
          <h2 className="text-2xl font-bold text-foreground">小雪</h2>
          <BadgeCheck className="size-5 text-primary" aria-label="官方认证" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">正在通话中…</p>
        <p className="mt-1 text-base tabular-nums text-muted-foreground/80">
          {hh}:{mm}:{ss}
        </p>
      </div>

      {/* 语音字幕气泡 */}
      <div key={subtitleIndex} className="mx-8 mt-6 flex animate-bubble-in items-start gap-2 rounded-3xl bg-card/60 px-5 py-4 shadow-sm backdrop-blur-sm">
        <AudioLines className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-[15px] leading-relaxed text-foreground/80">{subtitles[subtitleIndex]}</p>
      </div>

      {/* 大波形 */}
      <div className="mt-8 flex justify-center px-6">
        <Waveform bars={48} seed={seconds} animated={!muted} className="h-20 w-full justify-center" barClassName="bg-primary/45" />
      </div>

      {/* 控制按钮 */}
      <div className="mt-auto px-10 pb-2">
        <div className="flex items-end justify-between">
          <CallControl
            icon={muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
            label={muted ? "已静音" : "静音"}
            active={muted}
            onClick={() => setMuted((m) => !m)}
          />
          <CallControl
            icon={<Volume2 className="size-6" />}
            label="扬声器"
            active={speaker}
            onClick={() => setSpeaker((s) => !s)}
          />
          <CallControl icon={<Smile className="size-6" />} label="表情互动" badge />
        </div>
      </div>

      {/* 挂断 */}
      <div className="px-10 pb-10 pt-6">
        <button
          type="button"
          aria-label="挂断"
          onClick={onHangup}
          className="flex h-16 w-full items-center justify-center rounded-[2rem] bg-rose-500 text-white shadow-lg transition-transform active:scale-95"
        >
          <PhoneOff className="size-7" />
        </button>
        <p className="mt-3 text-center text-sm text-muted-foreground">长按挂断</p>
      </div>
    </div>
  )
}

function CallControl({
  icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  badge?: boolean
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 transition-transform active:scale-95">
      <span
        className={`relative flex size-16 items-center justify-center rounded-full shadow-sm transition-colors ${
          active ? "bg-primary text-primary-foreground" : "bg-card text-foreground/70"
        }`}
      >
        {icon}
        {badge && (
          <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
            新
          </span>
        )}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </button>
  )
}
