/**
 * 语音系统统一导出模块
 * 为心屿AI伴侣提供完整的TTS（文本转语音）功能
 * 支持 CosyVoice（推荐）和 NLS 两种引擎
 */

// 类型导出
export type { VoiceConfig, TTSResult, ConversationContext } from './types'

// 导入函数以便在当前模块使用
import { textToSpeech } from './aliyun-tts'
import type { VoiceConfig } from './types'
import { rewriteForVoice, getEmotionVoiceParams, getEmotionInstruction } from './voice-rewrite'

// 类和函数导出
export { AliyunTTSService, createTTSService, textToSpeech } from './aliyun-tts'
export { rewriteForVoice, getEmotionVoiceParams, getEmotionInstruction } from './voice-rewrite'

/**
 * 便捷函数：将文本转换为语音并返回音频文件路径
 * 自动从环境变量读取配置
 * 优先使用 CosyVoice（DASHSCOPE_API_KEY），降级到 NLS
 * @param text 要转换的文本
 * @param emotion 情绪标签（影响语音参数和文本改写）
 * @returns 音频文件路径
 */
/**
 * 清洗 TTS 输入文本，移除不应朗读的内容：
 * - 中文括号里的动作/表情描述：（微笑）、（叹了口气）
 * - 英文括号里的内容：(smiling)、(thinking)
 * - 方括号标记：【重要】、[标记]
 * - 多余空白和空行
 */
export function cleanTtsText(text: string): string {
  return text
    // 移除中文括号及内容（完整闭合 + 未闭合的情况）
    .replace(/（[^（）]*）/g, '')
    .replace(/（[^）]*$/gm, '')
    // 移除英文括号及内容（完整闭合 + 未闭合的情况）
    .replace(/\([^()]*\)/g, '')
    .replace(/\([^)]*$/gm, '')
    // 移除方括号标记
    .replace(/【[^【】]*】/g, '')
    .replace(/\[[^\[\]]*\]/g, '')
    // 清理多余空白
    .replace(/\s{2,}/g, ' ')
    // 清理行首行尾空白
    .split('\n').map(s => s.trim()).join('\n')
    // 移除空行
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/**
 * Layer 4: TTS 合成（含随机扰动，防机械感）
 *
 * 使用 CosyVoice longwan_v2/v3 进行语音合成。
 * speed ±0.02、pitch ±0.02 随机扰动，避免每次参数完全一致。
 * 单段输出，绝不拼接。
 *
 * @param text    经过 Layer 3 文本导演处理的自然口语文本
 * @param emotion 目标情绪（来自 Layer 2 大脑输出）
 * @returns        音频文件路径
 */
export async function speak(text: string, emotion?: string): Promise<{path: string, duration: number}> {
  // ── 清洗括号内容（残余的动作描述）──
  const cleaned = cleanTtsText(text)
  console.log(`[TTS] 清洗后: "${text.slice(0, 30)}... → ${cleaned.slice(0, 30)}..."`)

  const baseConfig = getVoiceConfigFromEnv()
  if (!baseConfig) {
    throw new Error(
      '未找到语音配置，请设置以下环境变量之一：\n' +
      '【推荐】DASHSCOPE_API_KEY=xxx（CosyVoice）\n' +
      '【旧版】ALIYUN_ACCESS_KEY_ID=xxx（NLS，需配合 SECRET 和 APP_KEY）'
    )
  }

  // ── Layer 4 核心：情绪参数 + 随机扰动 ──
  const voiceParams = getEmotionVoiceParams(emotion || 'calm')

  // ±0.02 随机扰动，防机械感
  const perturbation = () => (Math.random() - 0.5) * 0.04 // -0.02 ~ +0.02

  const config: VoiceConfig = {
    ...baseConfig,
    speechRate: clamp(voiceParams.rate + perturbation(), 0.5, 2.0),
    pitchRate:  clamp(voiceParams.pitch + perturbation(), 0.5, 2.0),
    volume:     voiceParams.volume,
    // 传递情绪标签，用于 CosyVoice Instruct 功能
    emotion:    emotion || 'calm',
  }

  console.log(
    `[TTS] emotion=${emotion || 'calm'} ` +
    `rate=${config.speechRate!.toFixed(3)} (base=${voiceParams.rate}) ` +
    `pitch=${config.pitchRate!.toFixed(3)} (base=${voiceParams.pitch})`
  )

  // ── 单段合成，绝不拼接 ──
  const result = await textToSpeech(cleaned, config)

  if (!result.success || !result.audioFilePath) {
    throw new Error(`语音合成失败: ${result.error}`)
  }

  return { path: result.audioFilePath, duration: result.duration ?? 3 }
}

/** 值钳制 */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * 从环境变量读取语音配置
 * 优先使用 CosyVoice（百炼），降级到 NLS
 * @returns 语音配置，如果环境变量不完整则返回 null
 */
function getVoiceConfigFromEnv(): VoiceConfig | null {
  // ── 优先：CosyVoice（百炼）──
  const dashscopeKey = process.env.DASHSCOPE_API_KEY
  if (dashscopeKey) {
    return {
      accessKeyId: dashscopeKey,   // 用作 Bearer Token
      voice: process.env.COSYVOICE_VOICE || 'longwan_v3',
      volume: process.env.COSYVOICE_VOLUME
        ? parseInt(process.env.COSYVOICE_VOLUME, 10)
        : 50,
      // CosyVoice 的 rate/pitch 范围 0.5~2.0
      speechRate: process.env.COSYVOICE_RATE
        ? parseFloat(process.env.COSYVOICE_RATE)
        : 1.0,
      pitchRate: process.env.COSYVOICE_PITCH
        ? parseFloat(process.env.COSYVOICE_PITCH)
        : 1.0,
      model: process.env.COSYVOICE_MODEL || 'cosyvoice-v3-instruct',
    }
  }

  // ── 降级：NLS（旧版）──
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET
  const appKey = process.env.ALIYUN_TTS_APP_KEY

  if (accessKeyId && accessKeySecret && appKey) {
    return {
      accessKeyId,
      accessKeySecret,
      appKey,
      voice: process.env.ALIYUN_TTS_VOICE || 'xiaoyun',
      speechRate: process.env.ALIYUN_TTS_SPEECH_RATE
        ? parseInt(process.env.ALIYUN_TTS_SPEECH_RATE, 10)
        : 0,
      pitchRate: process.env.ALIYUN_TTS_PITCH_RATE
        ? parseInt(process.env.ALIYUN_TTS_PITCH_RATE, 10)
        : 0,
      volume: process.env.ALIYUN_TTS_VOLUME
        ? parseInt(process.env.ALIYUN_TTS_VOLUME, 10)
        : 50,
    }
  }

  return null
}

/**
 * 检查语音系统是否已配置
 * @returns 是否已配置
 */
export function isVoiceSystemConfigured(): boolean {
  return getVoiceConfigFromEnv() !== null
}

/**
 * 获取当前语音配置摘要（隐藏敏感信息）
 * @returns 配置信息（不包含 Secret/Key）
 */
export function getVoiceConfigSummary(): Partial<VoiceConfig> | null {
  const config = getVoiceConfigFromEnv()

  if (!config) {
    return null
  }

  const summary: Partial<VoiceConfig> = {
    voice: config.voice,
    volume: config.volume,
  }

  if (config.accessKeyId) {
    // 判断是 CosyVoice 还是 NLS
    const isCosyVoice = !config.accessKeySecret
    if (isCosyVoice) {
      summary.accessKeyId = config.accessKeyId.substring(0, 8) + '****（CosyVoice）'
      summary.model = config.model
    } else {
      summary.accessKeyId = config.accessKeyId.substring(0, 8) + '****（NLS）'
      summary.appKey = config.appKey
    }
  }

  return summary
}
