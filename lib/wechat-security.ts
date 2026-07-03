/**
 * 微信内容安全检测模块
 * 
 * 对接微信小程序 security.msgSecCheck 接口
 * access_token 自动缓存（7200s 有效期，提前 5 分钟刷新）
 */

const WECHAT_APPID = process.env['WECHAT' + '_APPID'] || ''
const WECHAT_APPSECRET = process.env['WECHAT' + '_APPSECRET'] || ''

// access_token 内存缓存
let cachedToken: string | null = null
let tokenExpireAt: number = 0

async function getAccessToken(): Promise<string> {
  // 缓存有效（提前 5 分钟刷新）则直接返回
  if (cachedToken && Date.now() < tokenExpireAt - 300_000) {
    return cachedToken
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}`
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json() as any

  if (data.errcode || !data.access_token) {
    console.error('[微信安全] 获取 access_token 失败：', JSON.stringify(data))
    throw new Error(`获取 access_token 失败: ${data.errmsg || '未知错误'}`)
  }

  cachedToken = data.access_token
  tokenExpireAt = Date.now() + (data.expires_in || 7200) * 1000
  console.log('[微信安全] access_token 已刷新')
  return cachedToken
}

interface MsgSecCheckResult {
  pass: boolean
  label?: number  // 微信返回的违规标签
  suggestion?: string  // pass / review / risky
}

/**
 * 调用微信 msgSecCheck 检测文本内容
 * @param text  用户发送的文本
 * @param openid  微信用户 openid（scene=1 时必须）
 * @returns { pass, label, suggestion }
 */
export async function msgSecCheck(text: string, openid: string): Promise<MsgSecCheckResult> {
  try {
    const token = await getAccessToken()
    const url = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`

    const body = JSON.stringify({
      version: 2,
      openid: openid,
      scene: 1,        // 场景：资料
      content: text,
      title: '',
      nickname: '',
      signature: '',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
    })

    const data = await res.json() as any

    if (data.errcode) {
      console.error('[微信安全] msgSecCheck 调用失败：', JSON.stringify(data))
      // 接口调用失败时放行（避免误伤正常用户）
      return { pass: true, suggestion: 'api_error' }
    }

    const result = (data as any).result || {}
    const suggestion: string = result.suggest || 'pass'
    const label: number = result.label || 0

    // suggest === 'pass'   → 通过
    // suggest === 'review' → 可疑（也建议拦截，更安全）
    // suggest === 'risky'  → 违规
    const pass = suggestion === 'pass'

    if (!pass) {
      console.warn(`[微信安全] 拦截 ${openid}，label=${label}，suggest=${suggestion}`)
    }

    return { pass, label, suggestion }
  } catch (error: any) {
    console.error('[微信安全] 异常：', error.message)
    // 异常时放行，避免因网络问题影响正常使用
    return { pass: true, suggestion: 'exception' }
  }
}
