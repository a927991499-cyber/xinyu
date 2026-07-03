/**
 * 语音重写器（Voice Rewrite Engine）V6
 *
 * 核心原则：
 * 真人说话有停顿、有语气、不播音腔。
 * 通过文本结构（省略号、短句、换行）+
 * CosyVoice 参数（rate/pitch/volume）
 * 共同产生自然呼吸感。
 *
 * ❌ 不用标签系统（(sigh) 等）
 * ✅ 直接改写文本结构
 */

/** 心屿支持的情绪类型 */
type Emotion = 'care' | 'happy' | 'miss' | 'shy' | 'calm' | 'expect' | 'whisper' | string

/**
 * 聊天文本 → 语音文本（文本情绪塑形器）
 *
 * 通过文本结构制造呼吸感：
 * 1. 句号 → 省略号（中间句），让 CosyVoice 自然停顿
 * 2. 长句在逗号处插入省略号，制造呼吸点
 * 3. 问号/叹号柔和化
 * 4. 情绪不同，塑形策略不同
 *
 * ⚠️ 情绪表达主要靠 getEmotionVoiceParams() 的 rate/pitch/volume，
 *    文本改写只做通用口语化，不碰音色一致性。
 */
export function rewriteForVoice(text: string, emotion: Emotion = 'calm'): string {
  let result = text.trim()
  if (!result) return text

  // ─── 1. 中间句句号 → 省略号（制造"在想下一句"的感觉）───
  // 保留末句标点，中间句用省略号制造停顿
  const sentences = result.split(/(?<=[。！？])/)
  if (sentences.length > 1) {
    // 最后一句保留原标点
    const last = sentences[sentences.length - 1]
    const middle = sentences.slice(0, -1).map(s => s.replace(/[。！？]$/, '……')).join('')
    result = middle + last
  } else {
    // 只有一句：去掉末尾句号（后面会根据情绪决定是否加省略号）
    result = result.replace(/[。！？]$/, '')
  }

  // ─── 2. 长句逗号处插入省略号（制造呼吸点）───
  // 对于 >15 字的句子，在随机一个逗号后加省略号
  const longSentenceThreshold = 15
  result = result.replace(/([^，,]{8,}?)([，,])([^，,]{4,})/g, (match, pre, comma, post) => {
    // 只处理较长的句子
    if (match.length > longSentenceThreshold && Math.random() > 0.5) {
      return pre + comma + '……' + post
    }
    return match
  })

  // ─── 3. 问号前加省略号（思考感）───
  result = result.replace(/？/g, '……？')

  // ─── 4. 叹号柔和化 → 省略号 ─────────────────────
  result = result.replace(/！/g, '……')

  // ─── 5. 自然逗号补全（避免播音腔）─────────────────
  // "还是"/"但是"前补逗号
  result = result.replace(/(\S)(还是)/g, '$1，$2')
  result = result.replace(/(\S)(但(?:是)?)/g, '$1，$2')

  // ─── 6. 情绪特定文本塑形 ──────────────────────────
  // 注意：不改写结尾文本（避免音色不一致），只加停顿结构
  switch (emotion) {
    case 'care':
      // 关心：慢一点，多停顿
      result = '……' + result
      break
    case 'happy':
      // 开心：轻快，省略号少一点（已在第1步加了，这里不再额外加）
      break
    case 'miss':
      // 想念：句首加省略号，制造"欲言又止"感
      result = '……' + result
      break
    case 'shy':
      // 害羞：碎句，多加省略号
      result = result.replace(/([。……])/g, '$1……')
      break
    case 'whisper':
      // 耳语：句尾波浪号，制造轻柔感
      result = result + '～'
      break
    default:
      // calm/expect 等：保持自然
      break
  }

  // ─── 7. 统一末尾收尾 ──────────────────────────────
  // 确保末尾有合理结束符
  if (!result.endsWith('。') && !result.endsWith('？') &&
      !result.endsWith('！') && !result.endsWith('……') &&
      !result.endsWith('～')) {
    // 根据情绪决定结尾
    if (emotion === 'miss' || emotion === 'care') {
      result += '……'
    } else if (emotion === 'whisper') {
      result += '～'
    } else {
      result += '。'
    }
  }

  // ─── 8. 清理过度标点 ──────────────────────────────
  // 最多两个省略号
  result = result.replace(/…{3,}/g, '……')
  // 清理多余空格
  result = result.replace(/\s{2,}/g, ' ')

  return result.trim()
}

/**
 * 获取情绪对应的 CosyVoice 语音参数
 * 这是情绪表达的主要手段，文本改写只做辅助
 *
 * 参数范围（CosyVoice 原生）：
 * - rate:  0.5 ~ 2.0（1.0 = 原速）
 * - pitch: 0.5 ~ 2.0（1.0 = 原调）
 * - volume: 0 ~ 100
 *
 * 范围收紧原则：小范围变化更自然，不会引起音色变化
 */
export function getEmotionVoiceParams(emotion: Emotion): {
  rate: number
  pitch: number
  volume: number
} {
  // 🔧 龙婉(longwan_v3)调优：参数范围极窄，靠音色本身表达情绪
  // 龙婉天然偏温柔，大幅调参反而破坏自然度
  switch (emotion) {
    case 'care':
      return { rate: 0.96, pitch: 1.01, volume: 78 }
    case 'happy':
      return { rate: 1.03, pitch: 1.02, volume: 82 }
    case 'miss':
      return { rate: 0.94, pitch: 0.99, volume: 74 }
    case 'shy':
      return { rate: 0.95, pitch: 1.01, volume: 72 }
    case 'calm':
      return { rate: 0.98, pitch: 1.00, volume: 78 }
    case 'idle':
      return { rate: 0.98, pitch: 1.00, volume: 76 }
    case 'expect':
      return { rate: 1.02, pitch: 1.02, volume: 82 }
    case 'whisper':
      return { rate: 0.93, pitch: 0.98, volume: 60 }
    case 'soft':
      return { rate: 0.95, pitch: 0.99, volume: 72 }
    case 'sad':
      return { rate: 0.93, pitch: 0.97, volume: 70 }
    case 'gentle':
      return { rate: 0.97, pitch: 1.01, volume: 78 }
    case 'cry':
      return { rate: 0.90, pitch: 0.96, volume: 62 }
    case 'angry':
      return { rate: 1.04, pitch: 1.03, volume: 85 }
    case 'sleep':
      return { rate: 0.92, pitch: 0.98, volume: 58 }
    case 'thinking':
      return { rate: 0.96, pitch: 1.00, volume: 76 }
    case 'surprised':
      return { rate: 1.03, pitch: 1.03, volume: 84 }
    default:
      console.warn(`[Voice] 未知情绪: ${emotion}，使用默认参数`)
      return { rate: 0.98, pitch: 1.00, volume: 78 }
  }
}

/**
 * 获取情绪对应的 Qwen3 TTS 自然语言指令
 *（当前项目使用 CosyVoice，此函数保留供备用）
 */
export function getEmotionInstruction(emotion: Emotion): string {
  switch (emotion) {
    case 'care':
      return '用温柔关心的语气，慢慢地说话，声音要温暖。'
    case 'happy':
      return '用开心的语气，声音轻快明亮，带着笑意说话。'
    case 'miss':
      return '用想念的语气，柔柔地说话，语调轻轻的。'
    case 'shy':
      return '用害羞的语气，声音轻柔，语速稍慢。'
    case 'calm':
      return '用平静的语气，不紧不慢地说话，声音平稳。'
    case 'expect':
      return '用期待的语气，声音明亮，带着好奇和兴奋。'
    case 'whisper':
      return '用低语的语气，声音很轻，像在耳边悄悄说话。'
    default:
      return '用自然的语气说话，语速适中。'
  }
}
