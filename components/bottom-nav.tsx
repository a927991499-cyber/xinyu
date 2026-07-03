"use client"

import { Home, User, Globe } from "lucide-react"
import { usePathname } from "next/navigation"

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/home", icon: Home, label: "首页" },
    { href: "/community", icon: Globe, label: "社区" },
    { href: "/persona", img: "/icon-nav-persona.png", label: "分身" },
    { href: "/profile", icon: User, label: "我的" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-around px-4 py-2 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.img ? (
                <img src={item.img} alt={item.label} className="size-5" />
              ) : (
                <Icon className="size-5" />
              )}
              <span>{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
