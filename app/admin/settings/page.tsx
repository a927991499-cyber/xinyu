"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Upload } from "lucide-react"

interface SettingSection {
  id: string; title: string; icon: string
  items: { key: string; label: string; desc: string; type: 'text'|'number'|'bool'|'textarea'|'password' }[]
}

const SECTIONS: SettingSection[] = [
  { id: 'keys', title: 'API 密钥', icon: '🔑', items: [
    { key: 'deepseek_api_key', label: 'DeepSeek API Key', desc: '对话和记忆提取', type: 'password' },
    { key: 'aliyun_access_key_id', label: '阿里云 AccessKey ID', desc: '短信服务', type: 'password' },
    { key: 'aliyun_access_key_secret', label: '阿里云 AccessKey Secret', desc: '短信服务', type: 'password' },
    { key: 'volcengine_app_id', label: '火山引擎 App ID', desc: '语音合成 TTS', type: 'password' },
    { key: 'volcengine_access_token', label: '火山引擎 Access Token', desc: '语音合成 TTS', type: 'password' },
  ]},
  { id: 'ai', title: 'AI 对话', icon: '🤖', items: [
    { key: 'system_prompt', label: 'System Prompt（小雪人设）', desc: '完整的小雪人设表现和行为规则，修改后下次对话生效', type: 'prompt' },
    { key: 'text_director_prompt', label: '文本导演规则', desc: '输出风格控制，口语化/语气词/断句等规则', type: 'prompt' },
    { key: 'reply_length_min', label: '最小回复字数', desc: '推荐最短字数', type: 'number' },
    { key: 'reply_length_max', label: '最大回复字数', desc: '推荐最长字数', type: 'number' },
    { key: 'ai_temperature', label: 'AI 温度', desc: '0.1=保守 1.0=创意', type: 'number' },
  ]},
  { id: 'prompts', title: '提示词模板', icon: '📝', items: [
    { key: 'memory_extract_prompt', label: '记忆提取提示词', desc: '从对话提取用户关键信息的提示词模板。变量：{userMessage}/{aiReply}', type: 'prompt' },
    { key: 'memory_summarize_prompt', label: '记忆总结提示词', desc: '生成用户画像摘要的提示词模板。变量：{conversations}', type: 'prompt' },
    { key: 'layer1_classify_prompt', label: '情绪分类提示词', desc: 'Layer1 分类提示词模板。变量：{message}', type: 'prompt' },
  ]},
  { id: 'memory', title: '记忆系统', icon: '🧠', items: [
    { key: 'memory_min_score', label: '最低存储阈值', desc: '低于此值不保存 (0-1)', type: 'number' },
    { key: 'memory_summary_interval', label: '总结触发间隔', desc: '每多少条消息触发总结', type: 'number' },
  ]},
  { id: 'persona', title: '数字分身', icon: '✨', items: [
    { key: 'persona_enabled', label: '分身功能开关', desc: '', type: 'bool' },
    { key: 'persona_create_threshold', label: '创建门槛 %', desc: '成长度达标后可创建分身', type: 'number' },
    { key: 'persona_msg_weight_denom', label: '消息权重分母', desc: '越大成长越慢', type: 'number' },
    { key: 'persona_snapshot_interval_days', label: '快照间隔天数', desc: '时间轴快照间隔', type: 'number' },
    { key: 'persona_refresh_cooldown_sec', label: '刷新冷却秒数', desc: '手动刷新最小间隔', type: 'number' },
  ]},
  { id: 'filter', title: '内容安全', icon: '🛡️', items: [
    { key: 'content_filter_enabled', label: '内容过滤开关', desc: '', type: 'bool' },
    { key: 'content_filter_keywords', label: '过滤关键词', desc: 'JSON 数组格式', type: 'textarea' },
    { key: 'sms_cooldown_sec', label: '短信发送间隔秒', desc: '', type: 'number' },
    { key: 'sms_daily_limit', label: '每日短信上限', desc: '每手机号每天', type: 'number' },
    { key: 'free_user_daily_limit', label: '免费用户日限制', desc: '0=不限制', type: 'number' },
  ]},
  { id: 'voice', title: '语音 TTS', icon: '🔊', items: [
    { key: 'tts_enabled', label: '语音开关', desc: '', type: 'bool' },
    { key: 'tts_rate', label: '语速', desc: '-500 到 500', type: 'number' },
    { key: 'tts_pitch', label: '语调', desc: '-500 到 500', type: 'number' },
    { key: 'tts_volume', label: '音量', desc: '0 到 100', type: 'number' },
  ]},
  { id: 'image', title: '图片生成', icon: '🖼️', items: [
    { key: 'image_gen_enabled', label: '图片生成开关', desc: '', type: 'bool' },
  ]},
  { id: 'service', title: '客服', icon: '💬', items: [
    { key: 'contact_qr_url', label: '客服二维码', desc: '用户个人中心"联系我们"显示的二维码图片', type: 'image' },
  ]},
  { id: 'member', title: '会员系统', icon: '💎', items: [
    { key: 'member_price', label: '会员价格（元/月）', desc: '前端显示', type: 'number' },
    { key: 'member_duration_days', label: '会员时长天数', desc: '付费后有效期', type: 'number' },
  ]},
  { id: 'engine', title: '状态引擎', icon: '⚡', items: [
    { key: 'emotion_decay_rate', label: '情绪衰减速度', desc: '越大变化越快 (0-1)', type: 'number' },
  ]},
]

export default function AdminSettingsPage() {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState("")
  const [activeSection, setActiveSection] = useState("ai")
  const [search, setSearch] = useState("")
  const [uploadingQr, setUploadingQr] = useState(false)

  useEffect(() => {
    fetch("/api/admin/auth").then(r => { if (!r.ok) { router.push("/admin"); return } })
    fetch("/api/admin/settings").then(r => r.json()).then(d => { if (d?.settings) setValues(d.settings) }).finally(() => setLoading(false))
  }, [])

  async function save(key: string) {
    setSaving(key)
    try {
      const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: values[key] || "" }) })
      if (res.ok) { setToast(`已保存 ${key}`); setTimeout(() => setToast(""), 2000) }
      else { const e = await res.json(); setToast(`失败: ${e.error}`); setTimeout(() => setToast(""), 3000) }
    } catch { setToast("网络错误"); setTimeout(() => setToast(""), 3000) }
    setSaving(null)
  }

  function handleToggle(key: string) {
    const newVal = values[key] === 'true' ? 'false' : 'true'
    setValues(v => ({ ...v, [key]: newVal }))
    fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: newVal }) })
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingQr(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/settings/upload-qr', { method: 'POST', body: form })
      const data = await res.json()
      if (data.success) {
        setValues(v => ({ ...v, contact_qr_url: data.url }))
        setToast('二维码已更新')
        setTimeout(() => setToast(''), 2000)
      } else {
        setToast('上传失败: ' + (data.error || '未知错误'))
        setTimeout(() => setToast(''), 3000)
      }
    } catch {
      setToast('网络错误')
      setTimeout(() => setToast(''), 3000)
    }
    setUploadingQr(false)
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push("/admin/dashboard")} className="text-sm text-gray-400 hover:text-gray-600">← 返回</button>
            <h1 className="text-lg font-bold text-gray-800">系统设置</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..." className="w-40 rounded-lg border bg-gray-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-purple-300" />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-40 shrink-0 border-r bg-white min-h-[calc(100vh-56px)] p-3 space-y-0.5">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition ${
                      activeSection === s.id ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
              {s.icon} {s.title}
            </button>
          ))}
        </aside>

        <main className="flex-1 p-6 max-h-[calc(100vh-56px)] overflow-auto">
          {SECTIONS.filter(s => s.id === activeSection).map(section => (
            <div key={section.id}>
              <h2 className="mb-5 text-base font-bold text-gray-800">{section.icon} {section.title}</h2>
              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.key} className="flex items-center gap-4 rounded-xl border bg-white p-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700">{item.label}</div>
                      {item.desc && <div className="mt-0.5 text-xs text-gray-400">{item.desc}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.type === 'image' ? (
                        <div className="flex items-center gap-3">
                          {values[item.key] ? (
                            <img src={values[item.key]} alt="二维码预览"
                                 className="w-14 h-14 rounded-lg border object-cover bg-gray-50" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 bg-gray-50">
                              <span className="text-xs">无</span>
                            </div>
                          )}
                          <label className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition
                            ${uploadingQr ? 'bg-gray-300 text-gray-500' : 'bg-purple-500 text-white hover:bg-purple-600'}`}>
                            <Upload className="size-3" />
                            {uploadingQr ? '上传中...' : '更换'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploadingQr} />
                          </label>
                        </div>
                      ) : item.type === 'bool' ? (
                        <button onClick={() => handleToggle(item.key)}
                                className={`w-9 h-5 rounded-full transition ${values[item.key] === 'true' ? 'bg-purple-500' : 'bg-gray-200'}`}>
                          <div className={`size-4 rounded-full bg-white shadow-sm transition ${values[item.key] === 'true' ? 'ml-4' : 'ml-0.5'}`} />
                        </button>
                      ) : (item.type === 'textarea' || item.type === 'prompt') ? (
                        <textarea value={values[item.key] || ''} onChange={e => setValues(v => ({...v, [item.key]: e.target.value}))}
                                  rows={item.type === 'prompt' ? 20 : 5}
                                  className="w-full max-w-2xl rounded-lg border bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 outline-none focus:border-purple-300" />
                      ) : (
                        <input type={item.type} value={values[item.key] || ''} onChange={e => setValues(v => ({...v, [item.key]: e.target.value}))}
                               className="w-28 rounded-lg border bg-gray-50 px-3 py-1.5 text-xs font-mono outline-none focus:border-purple-300" />
                      )}
                      {item.type !== 'bool' && item.type !== 'image' && (
                        <button onClick={() => save(item.key)} disabled={saving === item.key}
                                className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-40">
                          {saving === item.key ? '...' : '保存'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
