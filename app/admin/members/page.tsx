"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface MemberInfo {
  user_id: string
  phone: string
  name: string
  member_type: string
  member_expire: string
  created_at: string
  last_active: string
  is_expired: number
}

interface MemberStats {
  totalMembers: number
  monthlyCount: number
  quarterlyCount: number
  yearlyCount: number
  expiredCount: number
}

export default function AdminMembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [extendDialog, setExtendDialog] = useState<{ userId: string; name: string } | null>(null)
  const [extendDays, setExtendDays] = useState("")
  const [extendLoading, setExtendLoading] = useState(false)

  // 检查登录 + 加载会员数据
  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => {
        if (!r.ok) { router.push("/admin"); return }
        return Promise.all([
          fetch("/api/admin/members").then(r => r.json()),
          fetch("/api/admin/members?stats=true").then(r => r.json())
        ])
      })
      .then(([membersData, statsData]) => {
        if (membersData?.members) setMembers(membersData.members)
        if (statsData?.stats) setStats(statsData.stats)
      })
      .catch(() => router.push("/admin"))
      .finally(() => setLoading(false))
  }, [])

  // 延长会员期限
  async function handleExtend() {
    if (!extendDialog || !extendDays || parseInt(extendDays) <= 0) return
    
    setExtendLoading(true)
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: extendDialog.userId, days: parseInt(extendDays) }),
      })
      
      if (res.ok) {
        alert("延长成功！")
        setExtendDialog(null)
        setExtendDays("")
        // 刷新列表
        const data = await fetch("/api/admin/members").then(r => r.json())
        if (data?.members) setMembers(data.members)
      } else {
        const err = await res.json()
        alert("延长失败：" + (err.error || "未知错误"))
      }
    } catch (error) {
      alert("操作失败，请重试")
    } finally {
      setExtendLoading(false)
    }
  }

  const getMemberTypeName = (type: string) => {
    const names = { monthly: "月度会员", quarterly: "季度会员", yearly: "年度会员" }
    return names[type] || type
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        加载中...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* 顶部导航 */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-800 transition"
            >
              ← 返回用户管理
            </button>
            <h1 className="text-xl font-bold">会员管理</h1>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 统计数据 */}
        {stats && (
          <div className="mb-6 grid grid-cols-5 gap-4">
            <div className="rounded-lg bg-white p-4 border border-gray-200">
              <p className="text-sm text-gray-400">会员总数</p>
              <p className="mt-1 text-2xl font-bold text-purple-500">{stats.totalMembers}</p>
            </div>
            <div className="rounded-lg bg-white p-4 border border-gray-200">
              <p className="text-sm text-gray-400">月度会员</p>
              <p className="mt-1 text-2xl font-bold text-blue-400">{stats.monthlyCount}</p>
            </div>
            <div className="rounded-lg bg-white p-4 border border-gray-200">
              <p className="text-sm text-gray-400">季度会员</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{stats.quarterlyCount}</p>
            </div>
            <div className="rounded-lg bg-white p-4 border border-gray-200">
              <p className="text-sm text-gray-400">年度会员</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.yearlyCount}</p>
            </div>
            <div className="rounded-lg bg-white p-4 border border-gray-200">
              <p className="text-sm text-gray-400">已过期</p>
              <p className="mt-1 text-2xl font-bold text-red-400">{stats.expiredCount}</p>
            </div>
          </div>
        )}

        {/* 会员列表 */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="font-medium">会员用户列表</h2>
          </div>

          {members.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">暂无会员用户</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-400">
                    <th className="px-4 py-3">用户ID</th>
                    <th className="px-4 py-3">手机号</th>
                    <th className="px-4 py-3">昵称</th>
                    <th className="px-4 py-3">会员类型</th>
                    <th className="px-4 py-3">到期时间</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.user_id} className="border-b border-gray-200/50 hover:bg-gray-50/30">
                      <td className="px-4 py-3 font-mono text-xs">{m.user_id}</td>
                      <td className="px-4 py-3">{m.phone || "-"}</td>
                      <td className="px-4 py-3">{m.name || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-purple-50 px-2 py-1 text-xs text-purple-500">
                          {getMemberTypeName(m.member_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {m.member_expire ? new Date(m.member_expire).toLocaleDateString('zh-CN') : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {m.is_expired ? (
                          <span className="rounded bg-red-600/20 px-2 py-1 text-xs text-red-400">已过期</span>
                        ) : (
                          <span className="rounded bg-green-600/20 px-2 py-1 text-xs text-green-400">有效</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExtendDialog({ userId: m.user_id, name: m.name || m.phone || m.user_id })}
                          className="rounded bg-purple-50 px-3 py-1 text-xs text-purple-500 transition hover:bg-purple-600/30"
                        >
                          延长期限
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 延长期限弹窗 */}
      {extendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <h3 className="mb-4 text-lg font-bold text-purple-500">延长会员期限</h3>
            <p className="mb-3 text-sm text-gray-500">
              用户：{extendDialog.name}
            </p>
            <input
              type="number"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              placeholder="输入延长天数（如：30）"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setExtendDialog(null); setExtendDays("") }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleExtend}
                disabled={!extendDays || parseInt(extendDays) <= 0 || extendLoading}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {extendLoading ? "处理中..." : "确认延长"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
