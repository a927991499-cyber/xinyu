"use client"

import { BottomNav } from "@/components/bottom-nav"

export default function PersonaGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      {/* 头部 */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 px-6 pb-8 pt-12 text-white">
        <a href="/persona" className="mb-4 inline-block text-sm text-purple-200">← 返回</a>
        <h1 className="text-2xl font-bold">使用说明</h1>
        <p className="mt-1 text-sm text-purple-200">了解数字人格的功能</p>
      </div>

      {/* 图片占位 */}
      <div className="mx-4 mt-6">
        <img src="/guide.png" alt="使用说明" className="w-full rounded-2xl" />
      </div>

      <BottomNav />
    </div>
  )
}
