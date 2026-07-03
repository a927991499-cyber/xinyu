"use client"

import { useState, useEffect } from "react"
import { X, User, Calendar, Heart, Tag, FileText, Sparkles } from "lucide-react"

interface ProfileData {
  name?: string
  age?: string
  gender?: string
  interests?: string
  bio?: string
}

export function UserProfileSheet({ open, onClose, token }: { open: boolean; onClose: () => void; token: string }) {
  const [profile, setProfile] = useState<ProfileData>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState("")

  useEffect(() => {
    if (!open || !token) return
    fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setProfile(d.profile || {}) })
      .catch(() => {})
  }, [open, token])

  const saveField = async (field: string, value: string) => {
    if (!value.trim()) return
    setSaving(field)
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: value.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setProfile(prev => ({ ...prev, [field]: value.trim() }))
        setToast("已保存 ✅")
        setTimeout(() => setToast(""), 2000)
      }
    } catch {}
    setSaving(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-md" onClick={onClose}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-20 size-80 rounded-full bg-purple-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-80 rounded-full bg-pink-200/20 blur-3xl" />
      </div>

      <div className="relative mx-4 w-full max-w-[380px] overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-purple-200/30 border border-purple-100"
           onClick={e => e.stopPropagation()}>
        <div className="h-1.5 bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-sm shadow-purple-200">
                <Sparkles className="size-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">个人信息</h2>
            </div>
            <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full bg-gray-100/80 text-gray-400 hover:bg-gray-200 transition-colors">
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-4">
            <Field label="称呼" icon={<User className="size-3 text-purple-500" />} placeholder="你的名字"
              value={profile.name || ""} field="name" saving={saving} onSave={saveField} />
            <Field label="年龄" icon={<Calendar className="size-3 text-purple-500" />} placeholder="28"
              value={profile.age || ""} field="age" saving={saving} onSave={saveField} type="number" />
            
            <div>
              <label className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500">
                <div className="size-5 rounded-md bg-purple-50 flex items-center justify-center"><Heart className="size-3 text-purple-500" /></div>
                性别
              </label>
              <div className="flex gap-2">
                {["男","女","保密"].map(g => (
                  <button key={g} onClick={() => saveField("gender", g)}
                    className={`flex-1 h-10 rounded-xl text-sm font-medium transition-all ${
                      profile.gender === g
                        ? "bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-sm shadow-purple-200"
                        : "bg-white text-gray-500 ring-1 ring-purple-200 hover:bg-purple-50"
                    }`}>{g}</button>
                ))}
              </div>
            </div>

            <Field label="兴趣" icon={<Tag className="size-3 text-purple-500" />} placeholder="越野车, 旅游, 美食"
              value={profile.interests || ""} field="interests" saving={saving} onSave={saveField} />
            <Field label="简介" icon={<FileText className="size-3 text-purple-500" />} placeholder="介绍一下自己..."
              value={profile.bio || ""} field="bio" saving={saving} onSave={saveField} textarea />
          </div>

          <div className="mt-5 pt-4 border-t border-purple-100 text-center text-[11px] text-gray-400">
            ✨ 保存后小雪会记住你的信息
          </div>
        </div>
      </div>

      {/* 保存成功提示 */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] rounded-full bg-gray-800/90 px-5 py-2.5 text-sm text-white shadow-lg animate-bounce-in">
          {toast}
        </div>
      )}
    </div>
  )
}

function Field({ label, icon, placeholder, value, field, saving, onSave, type, textarea }: {
  label: string; icon: React.ReactNode; placeholder: string; value: string; field: string
  saving: string | null; onSave: (f: string, v: string) => void; type?: string; textarea?: boolean
}) {
  const [v, setV] = useState(value)
  useEffect(() => { setV(value) }, [value])

  return (
    <div>
      <label className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500">
        <div className="size-5 rounded-md bg-purple-50 flex items-center justify-center">{icon}</div>
        {label}
      </label>
      <div className="flex gap-2">
        {textarea ? (
          <textarea rows={2} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
            className="flex-1 rounded-xl border-0 bg-purple-50/50 px-4 py-2.5 text-sm outline-none ring-1 ring-purple-100 focus:ring-2 focus:ring-purple-400 transition-all resize-none placeholder:text-gray-300" />
        ) : (
          <input type={type || "text"} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
            className="flex-1 h-10 rounded-xl bg-white px-4 text-sm outline-none ring-1 ring-purple-200 focus:ring-2 focus:ring-purple-400 transition-all placeholder:text-gray-300" />
        )}
        <button onClick={() => onSave(field, v)}
          disabled={saving === field}
          className="shrink-0 h-10 rounded-xl bg-purple-500 px-4 text-sm font-medium text-white hover:bg-purple-600 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap">
          {saving === field ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  )
}
