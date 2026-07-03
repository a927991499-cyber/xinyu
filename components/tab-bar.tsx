"use client"

import { Images, Gift, CalendarDays, AudioLines, User } from "lucide-react"

const tabs = [
  { key: "album", icon: Images, label: "相册" },
  { key: "gift", icon: Gift, label: "礼物" },
  { key: "record", icon: CalendarDays, label: "记录" },
  { key: "voice", icon: AudioLines, label: "语音" },
  { key: "me", icon: User, label: "我的" },
]

interface TabBarProps {
  active?: string
  onChange?: (key: string) => void
}

export function TabBar({ active = "record", onChange }: TabBarProps) {
  return (
    <nav className="relative z-10 flex items-center justify-around px-4 pb-6 pt-2">
      {tabs.map(({ key, icon: Icon, label }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange?.(key)}
            className={`flex flex-1 flex-col items-center gap-1 transition-colors active:scale-95 ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
            }`}
          >
            <Icon className={`size-6 ${isActive ? "fill-primary/15" : ""}`} />
            <span className={`text-[11px] ${isActive ? "font-medium" : ""}`}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
