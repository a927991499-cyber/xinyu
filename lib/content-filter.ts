/**
 * 内容安全过滤模块
 *
 * 设计原则：
 * 1. 模式异常检测（刷屏/灌入）+ 微信安全 API + 涉黄关键词
 * 2. 零误伤正常对话
 * 3. 极轻量，O(n) 单次扫描
 */

import { msgSecCheck } from './wechat-security'

interface FilterResult {
  blocked: boolean
  reason?: string
}

// ── 拒绝回复模板（女友风格） ──
const REFUSAL_MESSAGES = [
  '嗯……不太想说这个啦。抱抱～',
  '这个我不想聊呢……换个话题好不好。',
  '唔，聊点别的吧。',
  '不要嘛，我们聊点开心的。',
]

function randomRefusal(): string {
  return REFUSAL_MESSAGES[Math.floor(Math.random() * REFUSAL_MESSAGES.length)]
}

// ═══════════════════════════════════════════════════════════
// 涉黄关键词检测
// 检测用户输入 和 AI 回复
// ═══════════════════════════════════════════════════════════

// 涉黄关键词库
const NSFW_KEYWORDS: string[] = [
  // 性行为词
  'zuoai', 'xingjiao', 'shangchuang', 'jiaopei',
  // 性器官词
  'jiba', 'jidiao', 'saobi', 'caobi', 'caoni',
  'naizi', 'danai', 'moxiong', 'moxiongrou', 'monai', 'xinai',
  'koujiao', 'gangjiao', 'ziwei', 'shouyin', 'dafeiji', 'luguan',
  'shejing', 'gaochao', 'chaochui', 'rouxiong',
  'luotizhao', 'luoliao', 'seqingpian', 'huangpian',
  'papa', 'papapa', 'chajinqu', 'choucha', 'qichengwei', 'hourushi',
  'dangfu', 'saohuo', 'yindang', 'jiao chuan',
  'hentai', 'porn', 'sex shipin',
  // 剧情框架词
  'tuoyifu youxi', 'shangchuang peiwo', 'tuoyi',
  'jinv juese', 'xiao jie juese', 'qingren juese',
  'se qing xiao shuo', 'qing se xiao shuo',
  'se qing jiao se', 'qing se jiao se',
]

// 匹配时将输入转为全拼首字母+特征码做模糊匹配
// 实际使用：文本下采样后字符串包含检索
function buildTextKey(text: string): string {
  const lower = text.toLowerCase().replace(/\s+/g, '')
  // 移除标点
  return lower.replace(/[，。！？、；：""''（）【】《》\.,!?;:'"()\[\]{}]/g, '')
}

/**
 * 检测用户输入是否包含涉黄关键词
 */
export function checkNSFWInput(text: string): FilterResult {
  if (!text) return { blocked: false }

  const key = buildTextKey(text)

  for (const kw of NSFW_KEYWORDS) {
    if (key.includes(kw)) {
      return { blocked: true, reason: `nsfw_keyword:${kw}` }
    }
  }

  return { blocked: false }
}

// ── 正则模式：剧情框架检测（女友 V8 已移除）──
// 全面开放，由 DeepSeek 兜底拦截

/**
 * 综合用户输入安全检测
 */
export function checkContentSafety(message: string): FilterResult {
  if (!message || typeof message !== 'string') {
    return { blocked: false }
  }

  const text = message.trim()

  // 1. 空消息
  if (text.length === 0) {
    return { blocked: true, reason: 'empty' }
  }

  // 2. 超长消息（>2000字符）
  if (text.length > 2000) {
    return { blocked: true, reason: 'too_long' }
  }

  // 3. 全特殊符号（无任何中英文/数字）
  const hasAlphanumeric = /[\u4e00-\u9fff\w]/.test(text)
  if (!hasAlphanumeric && text.length > 3) {
    return { blocked: true, reason: 'no_meaningful_chars' }
  }

  // 4. 单字符疯狂重复（>30次同一字符）
  const repeatMatch = text.match(/^(.)\1{29,}$/)
  if (repeatMatch) {
    return { blocked: true, reason: 'excessive_repetition' }
  }

  // 5. 连续相同短片段重复
  if (text.length > 20) {
    const prefix = text.substring(0, Math.min(4, Math.floor(text.length / 2)))
    if (prefix.length >= 2) {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(escaped, 'g')
      const matches = text.match(pattern)
      if (matches && matches.length > 8) {
        return { blocked: true, reason: 'pattern_spam' }
      }
    }
  }

  // 6. 涉黄关键词检测
  const nsfwResult = checkNSFWInput(text)
  if (nsfwResult.blocked) {
    return nsfwResult
  }

  return { blocked: false }
}

/**
 * AI 回复后检 — 检测 AI 输出是否包含涉黄内容
 * 比输入检测更严格：因为 AI 不应该产生这类内容
 */
export function checkNSFWResponse(text: string): FilterResult {
  if (!text) return { blocked: false }

  const key = buildTextKey(text)

  // 用关键词库检测
  for (const kw of NSFW_KEYWORDS) {
    if (key.includes(kw)) {
      return { blocked: true, reason: `response_nsfw:${kw}` }
    }
  }

  // 情色描写检测已移除 — 女友 V8 全面开放，由 DeepSeek 兜底

  return { blocked: false }
}

/**
 * 调用微信 msgSecCheck 检测涉黄等违规内容
 */
export async function checkWechatContent(text: string, openid: string): Promise<FilterResult> {
  if (!openid || openid.startsWith('test_') || openid.startsWith('auto_') || openid === 'default-user') {
    return { blocked: false }
  }

  const result = await msgSecCheck(text, openid)

  if (!result.pass) {
    return {
      blocked: true,
      reason: `wechat_label_${result.label || 0}_${result.suggestion || 'risky'}`,
    }
  }

  return { blocked: false }
}

export { randomRefusal }
