"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface AvatarCrossfadeProps {
  src: string
  alt: string
  size: number
  /** 可选额外的 className */
  className?: string
}

/**
 * 头像交叉淡化组件
 * 切换图片时旧图缩小+淡出，新图放大+淡入，400ms 过渡
 */
export function AvatarCrossfade({ src, alt, size, className = "" }: AvatarCrossfadeProps) {
  const [current, setCurrent] = useState(src)
  const [previous, setPrevious] = useState<string | null>(null)

  useEffect(() => {
    if (src !== current) {
      setPrevious(current)
      setCurrent(src)
      const t = setTimeout(() => setPrevious(null), 450)
      return () => clearTimeout(t)
    }
  }, [src, current])

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* 旧图：缩小+淡出 */}
      {previous && (
        <Image
          src={previous}
          alt={alt}
          width={size}
          height={size}
          className="pointer-events-none absolute inset-0 size-full rounded-full object-cover select-none"
          style={{ animation: 'avatarFadeOut 400ms ease-out forwards' }}
        />
      )}
      {/* 新图：放大+淡入 */}
      <Image
        key={current}
        src={current}
        alt={alt}
        width={size}
        height={size}
        className="size-full rounded-full object-cover"
        style={{ animation: previous ? 'avatarFadeIn 400ms ease-in forwards' : 'none' }}
      />
    </div>
  )
}
