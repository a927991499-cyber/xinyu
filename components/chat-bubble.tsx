"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Check, Play, Pause, Image } from "lucide-react"
import { Waveform } from "@/components/waveform"
import { getEmotionAvatar } from "@/lib/utils"
import { AvatarCrossfade } from "@/components/avatar-crossfade"

/** 全局音频单例：保证同时只有一条语音在播放 */
let globalAudio: { audio: HTMLAudioElement; setPlaying: (v: boolean) => void } | null = null

function stopGlobalAudio() {
  if (globalAudio) {
    globalAudio.audio.pause()
    globalAudio.audio.currentTime = 0
    globalAudio.setPlaying(false)
    globalAudio = null
  }
}

interface ChatBubbleProps {
  role: "ai" | "user"
  lines?: string[]
  voice?: number
  time: string
  emotion?: string | null
  audioUrl?: string
  audioDuration?: number
  imageUrl?: string  // 新增：生成的图片URL
  userAudioUrl?: string  // 新增：用户语音消息URL
  userAudioDuration?: number  // 新增：用户语音时长
}

export function ChatBubble({ role, lines, voice, time, emotion, audioUrl, audioDuration, imageUrl, userAudioUrl, userAudioDuration }: ChatBubbleProps) {
  const isAi = role === "ai"
  const isVoice = typeof voice === "number"
  const hasAudio = isAi && !!audioUrl
  const hasText = lines && lines.length > 0 && lines[0]
  const avatarSrc = getEmotionAvatar(emotion)

  // 如果有图片，显示图片
  const imageContent = imageUrl ? (
    <div className="mt-2 overflow-hidden rounded-2xl">
      <img 
        src={imageUrl} 
        alt="小雪的照片" 
        className="w-full cursor-pointer rounded-2xl"
        onClick={() => window.open(imageUrl, '_blank')}
      />
    </div>
  ) : null

  const textBubble = (
    <div
      className={`rounded-3xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
        isAi ? "rounded-tl-lg bg-card text-card-foreground" : "rounded-tr-lg bg-primary text-primary-foreground"
      }`}
    >
      {lines?.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
      {imageContent}
    </div>
  )

  const voiceBubble = isVoice ? (
    <VoiceContent seconds={voice!} isAi={isAi} />
  ) : null

  const bubble = isVoice ? voiceBubble : textBubble

  if (isAi) {
    return (
      <div className="flex w-full origin-bottom-left animate-bubble-in items-start gap-2.5">
        <div className="shrink-0 overflow-hidden rounded-full ring-1 ring-card shadow-sm">
          <AvatarCrossfade src={avatarSrc} alt="小雪的头像" size={36} />
        </div>
        <div className="flex max-w-[78%] flex-col items-start gap-1.5">
          {/* 语音条模式：语音条在上 + 转文字 + 文字隐藏在下 */}
          {hasAudio ? (
            <AudioBubble
              audioUrl={audioUrl!}
              duration={audioDuration || 0}
              text={hasText ? lines![0] : ""}
              imageUrl={imageUrl}
            />
          ) : (
            /* 无语音条：正常文字气泡（旧消息、TTS失败兜底） */
            bubble
          )}
          <span className="px-1 text-xs text-muted-foreground/70">{time}</span>
        </div>
      </div>
    )
  }

  // 用户消息：如果有语音，显示语音条（不显示空白文字气泡）
  if (userAudioUrl) {
    return (
      <div className="flex w-full origin-bottom-right animate-bubble-in justify-end">
        <div className="flex max-w-[78%] flex-col items-end gap-1.5">
          <UserAudioBubble audioUrl={userAudioUrl} duration={userAudioDuration || 0} text={hasText ? lines![0] : ""} />
          <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground/70">
            {time}
            <Check className="size-3.5 text-primary" />
          </span>
        </div>
      </div>
    )
  }

  // 如果没有语音，显示正常文字气泡
  return (
    <div className="flex w-full origin-bottom-right animate-bubble-in justify-end">
      <div className="flex max-w-[78%] flex-col items-end gap-1.5">
        {bubble}
        <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground/70">
          {time}
          <Check className="size-3.5 text-primary" />
        </span>
      </div>
    </div>
  )
}

/** 语音条 + 转文字按钮 + 可展开文字 */
function AudioBubble({ audioUrl, duration, text, imageUrl }: { audioUrl: string; duration: number; text: string; imageUrl?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [showText, setShowText] = useState(true)  // ✅ 默认展开文字
  const displaySeconds = duration > 0 ? duration : 3

  // 创建 Audio 实例
  useEffect(() => {
    stopGlobalAudio()

    const audio = new Audio(audioUrl)
    audio.preload = "auto"
    audioRef.current = audio

    const onEnded = () => {
      setPlaying(false)
      if (globalAudio?.audio === audio) globalAudio = null
      // 通知 Live2D 停止口型同步
      window.dispatchEvent(new CustomEvent("l2d:speak-end"))
    }
    const onPause = () => {
      // 只有被动暂停（如被其他语音打断）才清 globalAudio
      if (globalAudio?.audio === audio && audio.currentTime < audio.duration - 0.5) {
        setPlaying(false)
        globalAudio = null
      }
    }
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("pause", onPause)

    return () => {
      // 如果正在播放的是这条，清掉全局引用
      if (globalAudio?.audio === audio) {
        globalAudio = null
      }
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("pause", onPause)
      audio.pause()
      audio.currentTime = 0
    }
  }, [audioUrl])

  // 同步全局播放状态
  useEffect(() => {
    if (playing) {
      stopGlobalAudio()
      globalAudio = { audio: audioRef.current!, setPlaying }
      // 通知 Live2D 开始口型同步
      window.dispatchEvent(new CustomEvent("l2d:speak-start"))
    }
  }, [playing])

  return (
    <div className="flex flex-col gap-1.5">
      {/* 语音条 - 整个条可点击播放 */}
      <div
        className={`flex items-center gap-2 rounded-3xl px-3 py-2.5 shadow-sm cursor-pointer ${
          playing ? "bg-primary/10 ring-1 ring-primary/30" : "bg-card"
        }`}
        onClick={() => {
          if (playing) {
            audioRef.current?.pause()
          } else {
            audioRef.current?.play()
            setPlaying(true)
          }
        }}
      >
        <button
          type="button"
          aria-label={playing ? "暂停" : "播放"}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-sm transition-transform active:scale-90"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <div className="flex-1">
          <Waveform playing={playing} bars={28} barClassName={playing ? "bg-primary/90" : "bg-muted-foreground/40"} />
        </div>
        <span className="w-6 text-right text-xs tabular-nums text-muted-foreground/80">
          {displaySeconds}s
        </span>
      </div>

      {/* 图片（如果有） */}
      {imageUrl && (
        <div className="overflow-hidden rounded-2xl">
          <img 
            src={imageUrl} 
            alt="小雪的照片" 
            className="w-full cursor-pointer rounded-2xl"
            onClick={() => window.open(imageUrl, '_blank')}
          />
        </div>
      )}

      {/* 转文字 + 文字 */}
      {text && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowText(!showText)}
            className="self-start text-xs text-primary/70 hover:text-primary transition-colors"
          >
            {showText ? "收起文字" : "转文字"}
          </button>
      {showText && (
        <div className="rounded-xl bg-card/90 px-3 py-2 shadow-sm">
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-card-foreground/90">
            {text}
          </p>
        </div>
      )}
        </div>
      )}
    </div>
  )
}

/** 纯语音内容（无文字） */
function VoiceContent({ seconds, isAi }: { seconds: number; isAi: boolean }) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setPlaying(false), seconds * 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  return (
    <div
      className={`flex items-center gap-2 rounded-3xl px-4 py-3 shadow-sm ${
        isAi ? "bg-card" : "bg-primary text-primary-foreground"
      }`}
    >
      <button
        type="button"
        aria-label={playing ? "暂停" : "播放"}
        onClick={() => setPlaying(!playing)}
        className="flex size-8 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-sm"
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </button>
      <div className="flex-1">
        <Waveform playing={playing} bars={20} />
      </div>
      <span className="w-6 text-right text-xs tabular-nums text-muted-foreground/80">
        {seconds}s
      </span>
    </div>
  )
}

/** 打字中动画（三个点） */
export function TypingBubble({ emotion }: { emotion?: string | null }) {
  const avatarSrc = getEmotionAvatar(emotion)
  return (
    <div className="flex w-full origin-bottom-left animate-bubble-in items-start gap-2.5">
      <div className="shrink-0 overflow-hidden rounded-full ring-1 ring-card shadow-sm">
        <AvatarCrossfade src={avatarSrc} alt="小雪的头像" size={36} />
      </div>
      <div className="flex max-w-[78%] items-center gap-1.5 rounded-3xl rounded-tl-lg bg-card px-4 py-3 shadow-sm">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

/** 用户语音消息气泡 */
function UserAudioBubble({ audioUrl, duration, text }: { audioUrl: string; duration: number; text?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [showText, setShowText] = useState(true)
  const displaySeconds = duration > 0 ? duration : 3

  useEffect(() => {
    const audio = new Audio(audioUrl)
    audio.preload = "auto"
    audioRef.current = audio

    const onEnded = () => setPlaying(false)
    audio.addEventListener("ended", onEnded)

    return () => {
      audio.removeEventListener("ended", onEnded)
      audio.pause()
      audio.currentTime = 0
    }
  }, [audioUrl])

  return (
    <div className="flex flex-col gap-1.5">
      {/* 语音条 */}
      <div
        className={`flex items-center gap-2 rounded-2xl rounded-tr-lg px-3 py-2.5 shadow-sm cursor-pointer transition-colors ${
          playing ? "bg-primary" : "bg-primary/90"
        }`}
        onClick={() => {
          if (playing) {
            audioRef.current?.pause()
            setPlaying(false)
          } else {
            audioRef.current?.play()
            setPlaying(true)
          }
        }}
      >
        <button
          type="button"
          aria-label={playing ? "暂停" : "播放"}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/30 text-white shadow-sm transition-transform active:scale-90"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <div className="flex-1">
          <Waveform playing={playing} bars={20} barClassName="bg-white/70" />
        </div>
        <span className="w-8 text-right text-xs tabular-nums text-white/90 font-medium">
          {displaySeconds}s
        </span>
      </div>

      {/* 转文字（ASR识别完成后显示） */}
      {text && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowText(!showText)}
            className="self-end text-xs text-primary/70 hover:text-primary transition-colors"
          >
            {showText ? "收起文字" : "查看文字"}
          </button>
          {showText && (
            <div className="rounded-xl bg-muted/50 px-3 py-2">
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground/80">
                {text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
