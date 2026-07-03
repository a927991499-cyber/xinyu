"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Shield, ArrowLeft, Check } from "lucide-react"

const AGREEMENT = `实名认证服务说明暨个人信息保护告知书

为严格遵守国家法律法规要求，落实生成式人工智能服务真实身份认证义务，保障用户账号安全与合法权益，营造健康、安全、有序的AI互动陪伴环境，本平台按照国家监管规定对所有使用AI陪伴核心服务的用户实行实名认证管理制度。现就实名认证的规则、信息收集范围、安全保护、使用限制等事宜，向您作出完整告知，请您仔细阅读。

一、实名认证的法律依据
本次实名认证严格遵循现行有效法律法规及监管要求：《中华人民共和国网络安全法》第二十四条、《中华人民共和国个人信息保护法》、《中华人民共和国数据安全法》、《生成式人工智能服务管理暂行办法》、《互联网用户账号信息管理规定》等相关规定。

二、为什么需要实名认证
1. 落实法定合规要求：生成式AI服务属于国家明确要求实名制的互联网服务范畴。
2. 保障您的账号安全：有效防范恶意注册、盗号冒用、批量刷号等风险。
3. 守护未成年人健康成长：精准识别未成年用户，自动启用内容过滤、时长限制等专项保护。
4. 维护健康互动环境：防范利用AI服务发布违法违规信息、恶意骚扰、诈骗等行为。
5. 保障服务稳定运行：防范批量注册、恶意调用、刷量攻击等异常行为。

三、实名认证的适用范围
所有使用本平台AI陪伴核心服务的用户均需完成实名认证，包括：发起AI文字对话、语音通话等核心服务；使用充值、开通会员等付费功能；保存聊天记录、收藏互动内容等个性化服务。

四、实名信息收集范围（严格遵循最小必要原则）
基础身份信息：真实姓名、居民身份证号码。我们不会要求您提供银行卡号、家庭住址、工作单位等与实名认证无关的信息。

五、实名信息的存储与安全保护
所有实名信息均采用国密级加密算法进行静态加密存储，信息传输全程采用HTTPS加密通道。所有用户实名信息均存储于中华人民共和国境内的合规服务器。实名信息留存期限为账号正常使用期间+法律法规要求的最短留存期限。

六、实名认证办理流程
首次使用核心服务时系统会自动弹出实名认证提示。请您准确、如实填写本人真实姓名、居民身份证号码，确保信息与身份证件完全一致。核验完成后即可解锁全部服务功能。

七、未完成实名认证的服务限制
根据国家法律法规的强制要求，未完成实名认证的用户无法使用AI文字对话、语音通话等全部核心陪伴服务；无法使用充值、开通会员等所有付费功能；无法保存聊天记录、收藏内容。

八、未成年人特殊保护规则
通过实名认证自动判定用户年龄区间，未满14周岁儿童用户必须由监护人陪同完成实名认证。未成年用户将经过更严格的内容审核，使用时长受到强制限制，无法使用付费功能。

九、实名信息的使用边界与禁止承诺
我们仅将您的实名信息用于：完成官方身份核验、账号安全防护、配合司法机关依法调查。绝对不会向任何第三方披露、出售、出租、共享您的实名信息。

十、实名信息的更正、删除与账号注销
您可通过联系平台客服申请更正实名信息或注销账号，注销后全部数据将按规则清除。

十一、常见问题
1. 实名认证安全吗？答：我们严格遵守《个人信息保护法》，所有实名信息均加密存储传输，不会向任何无关第三方泄露。
2. 可以用家人/朋友的身份证吗？答：不可以，必须使用本人真实身份信息，违规可能导致账号封禁。
3. 一张身份证可以绑定多个平台账号吗？答：同一身份信息可绑定的账号数量有明确限额。

十二、其他说明
本告知书未尽事宜，按照平台《用户服务协议》《隐私政策》及国家相关法律法规执行。我们可能会根据法律法规更新修订本告知书，修订内容自公告发布之日起生效。

感谢您的理解与支持，我们将全力保障您的个人信息安全。`

export default function RealnamePage() {
  const router = useRouter()
  const [realName, setRealName] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [checked, setChecked] = useState(true) // 已检查状态，true=不需要实名
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("xinyu_token")
    if (!token) { router.push("/home"); return }

    fetch("/api/user/realname", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.id_verified) router.push("/") // 已实名直接进聊天
        else setChecked(false)
      })
      .catch(() => router.push("/home"))
  }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 20) setScrolled(true)
  }

  const handleSubmit = async () => {
    if (!agreed) { setError("请阅读并同意告知书"); return }
    setSubmitting(true); setError("")
    const token = localStorage.getItem("xinyu_token") || ""
    const res = await fetch("/api/user/realname", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ realName, idNumber })
    })
    const data = await res.json()
    if (data.success) { router.push("/") }
    else { setError(data.error || "验证失败"); setSubmitting(false) }
  }

  if (checked) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center gap-3 px-5 py-4 border-b">
        <button onClick={() => router.push("/home")}><ArrowLeft className="size-5" /></button>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-blue-500 flex items-center justify-center"><Shield className="size-4 text-white" /></div>
          <h1 className="text-base font-bold">实名认证</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-4">
        <p className="text-sm text-gray-500 mb-3">根据国家法律法规要求，使用AI陪伴服务需要进行实名认证。请阅读以下告知书并填写您的真实信息。</p>

        <div className="rounded-xl border border-gray-200 bg-gray-50 mb-4">
          <div ref={scrollRef} onScroll={handleScroll} className="h-48 overflow-y-auto p-4">
            <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{AGREEMENT}</p>
          </div>
          {!scrolled && <p className="text-center text-[11px] text-gray-400 py-2">↓ 请滚动阅读完整内容</p>}
        </div>

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <div onClick={() => setAgreed(!agreed)}
            className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${agreed ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
            {agreed && <Check className="size-3 text-white" />}
          </div>
          <span className="text-sm text-gray-600">我已阅读并同意以上告知书</span>
        </label>

        <div className="space-y-3">
          <input type="text" placeholder="真实姓名" value={realName} onChange={e => setRealName(e.target.value)}
            className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-blue-400" />
          <input type="text" maxLength={18} placeholder="居民身份证号码" value={idNumber} onChange={e => setIdNumber(e.target.value)}
            className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-blue-400" />
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="p-5 border-t">
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full h-12 rounded-xl bg-blue-500 text-white font-medium text-base disabled:opacity-50 active:scale-[0.98] transition-transform">
          {submitting ? "提交中…" : "提交实名认证"}
        </button>
      </div>
    </div>
  )
}
