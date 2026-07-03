interface WaveformProps {
  bars?: number
  className?: string
  barClassName?: string
  // 是否正在播放（控制动画）
  playing?: boolean
}

// 固定高度的波形条（不随机生成，保持一致性）
const FIXED_HEIGHTS = [0.4, 0.6, 0.8, 0.6, 0.9, 0.5, 0.7, 0.4, 0.8, 0.6, 0.5, 0.9, 0.7, 0.5, 0.8, 0.6, 0.4, 0.7, 0.9, 0.5, 0.6, 0.8, 0.4, 0.7, 0.9, 0.5, 0.6, 0.8]

export function Waveform({ bars = 28, className = "", barClassName = "bg-primary/90", playing = false }: WaveformProps) {
  return (
    <div className={`flex items-end gap-[2px] h-5 ${className}`}>
      {Array.from({ length: bars }, (_, i) => {
        const height = FIXED_HEIGHTS[i % FIXED_HEIGHTS.length]
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full ${barClassName} ${playing ? "origin-bottom" : ""}`}
            style={{
              height: `${Math.round(height * 100)}%`,
              ...(playing
                ? {
                    animation: `wave-bounce ${0.6 + (i % 5) * 0.12}s ease-in-out ${(i % 7) * 0.08}s infinite`,
                  }
                : {}),
            }}
          />
        )
      })}
    </div>
  )
}
