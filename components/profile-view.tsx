"use client"

import Image from "next/image"
import {
  ChevronRight,
  Heart,
  Flame,
  MessageCircleHeart,
  Gift,
  Crown,
  Bell,
  Palette,
  ShieldCheck,
  HelpCircle,
  Settings,
} from "lucide-react"

const stats = [
  { label: "陪伴天数", value: "128", icon: Heart },
  { label: "连续签到", value: "32", icon: Flame },
  { label: "心动值", value: "4.6k", icon: MessageCircleHeart },
]

const groups = [
  {
    title: "我的服务",
    items: [
      { icon: Crown, label: "会员中心", hint: "畅享专属特权", accent: true },
      { icon: Gift, label: "我的礼物", hint: "12 件" },
      { icon: Palette, label: "个性装扮", hint: "气泡 · 主题" },
    ],
  },
  {
    title: "设置与帮助",
    items: [
      { icon: Bell, label: "消息通知" },
      { icon: ShieldCheck, label: "隐私与安全" },
      { icon: HelpCircle, label: "帮助与反馈" },
      { icon: Settings, label: "通用设置" },
    ],
  },
]

export function ProfileView() {
  return (
    <div className="relative z-10 h-full overflow-y-auto px-4 pb-40 pt-2">
      {/* 个人信息卡 */}
      <section className="flex items-center gap-4 rounded-3xl bg-card/80 p-5 shadow-sm backdrop-blur-sm">
        <div className="size-16 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/30 shadow-sm">
          <Image src="/user-avatar.png" alt="我的头像" width={64} height={64} className="size-full object-cover" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">温柔的小满</h2>
            <span className="flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Crown className="size-3" />
              LV.6
            </span>
          </div>
          <p className="text-sm text-muted-foreground">ID: 8801 2046 · 与小雪相伴 128 天</p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground/60" />
      </section>

      {/* 数据统计 */}
      <section className="mt-4 flex items-center justify-between rounded-3xl bg-card/80 px-2 py-5 shadow-sm backdrop-blur-sm">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <span className="flex items-center gap-1 text-xl font-bold text-foreground">
              <Icon className="size-4 text-primary" />
              {value}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </section>

      {/* 亲密度进度 */}
      <section className="mt-4 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/40 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Heart className="size-4 fill-rose-400 text-rose-400" />
            与小雪的亲密度
          </span>
          <span className="text-sm font-semibold text-primary">68%</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-card/70">
          <div className="h-full rounded-full bg-primary" style={{ width: "68%" }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">再陪伴 3 天，即可解锁专属语音哦~</p>
      </section>

      {/* 功能分组 */}
      {groups.map((group) => (
        <section key={group.title} className="mt-5">
          <h3 className="mb-2 px-2 text-sm font-medium text-muted-foreground">{group.title}</h3>
          <div className="overflow-hidden rounded-3xl bg-card/80 shadow-sm backdrop-blur-sm">
            {group.items.map(({ icon: Icon, label, hint, accent }, i) => (
              <button
                key={label}
                type="button"
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/50 ${
                  i > 0 ? "border-t border-border/60" : ""
                }`}
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-full ${
                    accent ? "bg-primary/15 text-primary" : "bg-muted text-foreground/70"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="flex-1 text-[15px] text-foreground">{label}</span>
                {hint && <span className="text-sm text-muted-foreground/80">{hint}</span>}
                <ChevronRight className="size-4 text-muted-foreground/50" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
