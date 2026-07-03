"use client"

import { useState } from "react"
import { Phone, MessageSquare, Loader2, X } from "lucide-react"

export function LoginModal({ isOpen, onSuccess, onClose }: { isOpen: boolean; onSuccess: (token: string, phone: string, userId: string) => void; onClose?: () => void }) {
  const [step, setStep] = useState<"phone" | "verify">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)

  // 发送验证码
  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("手机号格式不正确")
      return
    }

    setLoading(true)
    setError("")

    try {
      // 审核专用手机号：跳过验证码，直接登录
      if (phone === "19973997999") {
        const res = await fetch("/api/auth/sms-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code: "0000" })
        })
        const data = await res.json()
        if (res.ok) {
          onSuccess(data.token, phone, data.user.user_id)
        } else {
          setError(data.error || "登录失败")
        }
        setLoading(false)
        return
      }

      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      })

      const data = await res.json()

      if (res.ok) {
        setStep("verify")
        // 开始倒计时
        setCountdown(60)
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setError(data.error || "发送失败")
      }
    } catch (err) {
      setError("发送失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  // 验证验证码
  const handleVerify = async () => {
    if (code.length !== 4) {
      setError("请输入4位验证码")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/sms-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code })
      })

      const data = await res.json()

      if (res.ok) {
        // 登录成功
        onSuccess(data.token, phone, data.user.user_id)
      } else {
        setError(data.error || "验证失败")
      }
    } catch (err) {
      setError("验证失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl relative">
        {/* 关闭按钮 */}
        {onClose && (
          <button onClick={onClose} className="absolute top-3 right-3 size-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors">
            <X className="size-4" />
          </button>
        )}
        <h2 className="mb-4 text-center text-xl font-bold">登录/注册</h2>

        {step === "phone" ? (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">手机号</label>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                <Phone className="size-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="请输入手机号"
                  className="flex-1 bg-transparent outline-none"
                  maxLength={11}
                />
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-500">{error}</p>
            )}

            <button
              onClick={handleSendCode}
              disabled={loading || phone.length !== 11}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "发送中..." : "获取验证码"}
            </button>
          </>
        ) : (
          <>
            <p className="mb-2 text-center text-sm text-muted-foreground">
              验证码已发送到 {phone}
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">验证码</label>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                <input
                  type="number"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="请输入4位验证码"
                  className="flex-1 bg-transparent outline-none"
                  maxLength={4}
                />
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-500">{error}</p>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 4}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "验证中..." : "登录/注册"}
            </button>

            <button
              onClick={() => {
                setStep("phone")
                setCode("")
                setError("")
              }}
              className="mt-2 w-full text-center text-sm text-muted-foreground"
            >
              返回修改手机号
            </button>
          </>
        )}
      </div>
    </div>
  )
}
