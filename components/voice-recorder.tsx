"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Mic, X } from "lucide-react"
import { Waveform } from "@/components/waveform"

interface VoiceRecorderProps {
  onClose: () => void
  onSend?: (seconds: number) => void
}

export function VoiceRecorder({ onClose, onSend }: VoiceRecorderProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")

  function handleSend() {
    onSend?.(Math.max(1, seconds))
    onClose()
  }

  return (
    <div className="relative z-20 rounded-t-[2rem] bg-card/95 px-5 pb-8 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      {/* 顶部收起 + 提示 */}
      <div className="flex items-center">
        <button
          type="button"
          aria-label="取消"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90"
        >
          <ChevronDown className="size-6" />
        </button>
        <p className="flex-1 text-center text-sm text-muted-foreground">松开发送，上滑取消</p>
        <span className="size-9" />
      </div>

      {/* 麦克风 + 两侧波形 */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <Waveform
          bars={12}
          seed={seconds + 1}
          animated
          className="h-10 flex-1 justify-end"
          barClassName="bg-primary/40"
        />
        <div className="relative flex shrink-0 items-center justify-center">
          <span className="absolute size-28 rounded-full bg-primary/10" style={{ animation: "ripple 2s ease-out infinite" }} />
          <span className="absolute size-24 rounded-full bg-primary/15" />
          <button
            type="button"
            aria-label="松开发送语音"
            onClick={handleSend}
            className="relative flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          >
            <Mic className="size-8" />
          </button>
        </div>
        <Waveform bars={12} seed={seconds + 2} animated className="h-10 flex-1" barClassName="bg-primary/40" />
      </div>

      {/* 计时 */}
      <p className="mt-6 text-center text-2xl font-semibold tabular-nums text-foreground">
        {mm}:{ss}
      </p>

      {/* 操作按钮 */}
      <div className="mt-6 flex items-center justify-center gap-12">
        <button
          type="button"
          onClick={onClose}
          className="flex flex-col items-center gap-1.5 text-muted-foreground transition-transform active:scale-95"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <X className="size-5" />
          </span>
          <span className="text-xs">取消</span>
        </button>
        <button
          type="button"
          onClick={handleSend}
          className="flex flex-col items-center gap-1.5 text-primary transition-transform active:scale-95"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/15">
            <Mic className="size-5" />
          </span>
          <span className="text-xs">发送</span>
        </button>
      </div>
    </div>
  )
}
