"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })
      if (res.ok) { 
        const redirect = new URLSearchParams(window.location.search).get("redirect") || "/admin/dashboard"
        router.push(redirect)
      } else { setError("密码错误") }
    } catch { setError("网络错误") }
    finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-purple-50 text-2xl">🌙</div>
          <h1 className="text-xl font-bold text-gray-800">心屿管理后台</h1>
          <p className="mt-1 text-sm text-gray-400">输入密码进入</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                 placeholder="管理员密码" autoFocus
                 className="w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm outline-none focus:border-purple-400 focus:bg-white" />
          {error && <p className="text-center text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-purple-500 py-3 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50">
            {loading ? "验证中..." : "进入后台"}
          </button>
        </form>
      </div>
    </div>
  )
}
