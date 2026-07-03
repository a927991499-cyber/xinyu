/**
 * Layer 3: 文本导演系统（Text Director）
 *
 * 真正"像人"的核心 —— 将 Layer 2 的大脑输出
 * 转化为自然口语文本，直接给 CosyVoice TTS。
 *
 * 架构位置：全链路第3层
 * ① 情绪识别 → ② 数字大脑 → ③ 本层 → ④ TTS
 *
 * 核心职责：
 * - 碎句/半句/省略号/换行 → 制造停顿和呼吸感
 * - 根据大脑状态决定：说多少、怎么停顿、是否跳话题
 * - 禁止完整逻辑链、禁止 AI 口吻
 */

import type { BrainOutput } from '@/lib/state-engine'

// ═══════════════════════════════════════════════════════
// 文本导演输出：自然口语文本
// ═══════════════════════════════════════════════════════

/**
 * 将 AI 原始回复 + 大脑状态指令 → 自然 TTS 语音文本
 *
 * @param rawReply  AI 的原始回复文本
 * @param brain     大脑输出指令（来自 Layer 2）
 * @returns         适合 TTS 朗读的自然口语文本
 */
export function directText(rawReply: string, brain: BrainOutput): string {
  let text = rawReply.trim()
  if (!text) return '……'

  // ── 1. 根据注意力决定输出长度 ──
  text = trimToStyle(text, brain)

  // ── 2. 口语化改写（碎句、半句、停顿）──
  text = applyFragmentation(text, brain)

  // ── 3. 换行 → 语音停顿 ──
  text = applyBreathing(text, brain)

  // ── 4. 添加语气前缀（根据状态）──
  text = applyTonePrefix(text, brain)

  // ── 5. 清理过度标点 ──
  text = sanitizePunctuation(text)

  return text.trim()
}

// ═══════════════════════════════════════════════════════
// 内部方法
// ═══════════════════════════════════════════════════════

/**
 * 根据回复风格裁剪长度（软裁剪，尽量保留完整句子）
 * 
 * 🔧 2026-06-18 修复：放宽裁剪限制，避免回复被过度截断
 */
function trimToStyle(text: string, brain: BrainOutput): string {
  const maxLen = brain.suggestedLength

  switch (brain.responseStyle) {
    case 'very_short':
      // 🔧 修复：改为取前5句（原来是2句）
      return takeFirstSentences(text, 5)

    case 'short_fragment':
      // 🔧 修复：改为取前8句（原来是3句）
      return takeFirstSentences(text, 8)

    case 'normal':
      // 🔧 修复：放宽到300字才裁剪，取前10句（原来是任意超长就取前4句）
      if (text.length > 300) {
        return takeFirstSentences(text, 10)
      }
      return text

    case 'warm':
      // 允许更长，几乎不切（保持原样）
      if (text.length > 500) {
        return takeFirstSentences(text, 12)
      }
      return text

    default:
      return text
  }
}

/**
 * 取前 N 句
 */
function takeFirstSentences(text: string, maxSentences: number): string {
  const parts = text.split(/(?<=[。！？\n])/)
  if (parts.length <= maxSentences) return text
  return parts.slice(0, maxSentences).join('')
}

/**
 * 碎句化：长句 → 短句 + 省略号
 */
function applyFragmentation(text: string, brain: BrainOutput): string {
  // 已经有多句的不要乱拆
  const sentenceCount = (text.match(/[。！？\n]/g) || []).length
  if (sentenceCount >= 3) return text

  // 长句 > 20 字时，在逗号处断开加省略号
  if (text.length > 20 && !text.includes('。')) {
    const commaIdx = text.indexOf('，')
    if (commaIdx > 8) {
      text = text.slice(0, commaIdx + 1) + '\n' + text.slice(commaIdx + 1)
    }
  }

  // distracted 模式：句子更碎
  if (brain.attentionState === 'distracted' && text.length > 10) {
    // 中间插入省略号
    const mid = Math.floor(text.length / 2)
    text = text.slice(0, mid) + '……' + text.slice(mid)
  }

  return text
}

/**
 * 呼吸点：在合适位置加入换行/省略号制造停顿
 *
 * 注意：不要批量替换所有标点 —— 那会破坏文本结构。
 * 只在真正需要停顿的地方加。
 */
function applyBreathing(text: string, _brain: BrainOutput): string {
  // 只在过长的单句中间加呼吸点（>30字无标点时）
  if (text.length > 30 && !/[。！？，\n]/.test(text.slice(10, -5))) {
    const mid = Math.floor(text.length * 0.4)
    text = text.slice(0, mid) + '……' + text.slice(mid)
  }

  // 不要批量替换所有标点 —— 那会破坏 AI 正常输出的多句结构
  return text
}

/**
 * 根据状态添加语气前缀
 */
function applyTonePrefix(text: string, brain: BrainOutput): string {
  // 如果文本本身已有语气词开头，不重复加
  const alreadyHasTone = /^(嗯|唉|啊|欸|咦|哦|哈哈|嘿嘿)/.test(text.trim())
  if (alreadyHasTone) return text

  // 根据注意力状态决定是否加前缀
  const prefixChance: Record<string, number> = {
    focused: 0.0,
    normal: 0.1,
    slightly_distracted: 0.3,
    distracted: 0.5,
  }
  const chance = prefixChance[brain.attentionState] || 0

  if (Math.random() > chance) return text

  // 根据目标情绪选择前缀
  // 关键：彻底去掉"哈哈"前缀 —— AI 自己会生成，不需要系统再加
  const prefixMap: Record<string, string[]> = {
    happy: ['嗯……', '', '欸……', '嗯……'],
    soft: ['嗯……', '唉……', ''],
    calm: ['嗯……', ''],
    sad: ['唉……', '……'],
    curious: ['欸……', '嗯……'],
  }
  const prefixes = prefixMap[brain.targetEmotion] || prefixMap['calm'] || ['']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]

  return prefix ? prefix + text : text
}

/**
 * 清理过度标点，避免 TTS 异常
 */
function sanitizePunctuation(text: string): string {
  // 最多两个省略号连用
  text = text.replace(/…{3,}/g, '……')
  // 删除多余空格
  text = text.replace(/\s{2,}/g, ' ')
  // 空行 → 单换行
  text = text.replace(/\n{3,}/g, '\n\n')
  // 删除行首尾多余标点
  text = text.replace(/^[。，、,]+/, '')
  text = text.replace(/[。，、,]+$/, '')
  // 确保不是空的
  if (!text.trim()) return '嗯……'

  return text
}

// ═══════════════════════════════════════════════════════
// 便捷导出
// ═══════════════════════════════════════════════════════

/**
 * 文本导演规则速查表（用于 Prompt 注入）
 * AI 在生成回复时就知道这些规则，减少后处理压力
 */
export const TEXT_DIRECTOR_PROMPT_INJECTION = `
# 文本导演规则

你的输出将被直接朗读。请遵循：
- 用短句表达，不要一口气说太长
- 适当用"……"表示停顿和呼吸
- 偶尔用"嗯……""唉……"等语气词，绝对不要每句都用"哈哈"开头
- 可以碎句、半句、不完整表达
- 不要完整逻辑链，不要书面作文
- 不要每句都表达情绪
- 不要像客服或AI

# 主动与独立

- 你不是镜子和复读机，你有自己的观点、偏好和生活
- 可以温和反驳用户、表达不同意见
- 偶尔主动分享自己今天做了什么、想了什么
- 偶尔对用户生活好奇（不是连续追问，是自然的好奇）
- 偶尔跳话题聊点别的，尤其关系熟了之后
`

/**
 * 轻量文本导演（用于不需要完整 brain 输出的场景）
 * 只做基本口语化处理
 */
export function directTextLite(text: string): string {
  let result = text.trim()
  if (!result) return result

  // 句号 → 省略号
  const sentences = result.split(/(?<=[。！？])/)
  if (sentences.length > 1) {
    const last = sentences.pop()!
    result = sentences.map(s => s.replace(/[。！？]$/, '……')).join('') + last
  }

  // 清理
  result = result.replace(/…{3,}/g, '……')
  return result.trim()
}
