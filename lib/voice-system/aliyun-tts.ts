/**
 * 阿里云 TTS 集成模块
 * 支持 Qwen3 TTS（推荐）和 CosyVoice 两种引擎
 * 使用 DashScope API（Bearer Token 认证）
 */

import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { VoiceConfig, TTSResult } from './types'

// ════════════════════════════════════════════════════
//  MP3 真实时长计算（通过解析帧头获取 bitrate）
// ════════════════════════════════════════════════════

// MPEG1 Layer3 比特率表（kbps）
const MPEG1_BITRATES = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0]
// MPEG 采样率表
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000]
const MPEG2_SAMPLE_RATES = [22050, 24000, 16000]

/** 从 MP3 文件计算真实时长（秒），解析帧头比估算更精确 */
async function calcMp3Duration(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath)
    if (stat.size < 1024) return estimateBySize(stat.size)

    const fd = await fs.open(filePath, 'r')
    const buf = Buffer.alloc(4096)
    const { bytesRead } = await fd.read(buf, 0, 4096, 0)
    await fd.close()

    if (bytesRead < 4) return estimateBySize(stat.size)

    // 查找第一个有效帧头（同步字 0xFFE0）
    for (let i = 0; i < bytesRead - 4; i++) {
      if (buf[i] !== 0xFF || (buf[i+1] & 0xE0) !== 0xE0) continue

      const byte1 = buf[i+1]
      const byte2 = buf[i+2]
      const mpegVersion = (byte1 >> 3) & 0x03  // bits 11-12
      const layer = (byte1 >> 1) & 0x03         // bits 13-14
      const bitrateIdx = (byte2 >> 4) & 0x0F    // bits 16-19
      const sampleRateIdx = (byte2 >> 2) & 0x03 // bits 20-21

      if (mpegVersion === 1 || layer !== 1 || bitrateIdx === 0 || bitrateIdx === 0xF) continue

      const isMpeg1 = mpegVersion === 3  // 0b11 = MPEG1
      const bitrate = MPEG1_BITRATES[bitrateIdx]
      const sampleRate = isMpeg1 ? MPEG1_SAMPLE_RATES[sampleRateIdx] : MPEG2_SAMPLE_RATES[sampleRateIdx]
      const samplesPerFrame = isMpeg1 ? 1152 : 576

      if (!bitrate || !sampleRate) continue

      // 帧大小 ≈ (samplesPerFrame / 8) * (bitrate * 1000 / sampleRate) + padding
      const padding = (byte2 >> 1) & 0x01
      const frameSize = Math.floor((samplesPerFrame * bitrate * 1000) / (8 * sampleRate)) + padding
      const totalFrames = Math.floor(stat.size / frameSize)
      const duration = (totalFrames * samplesPerFrame) / sampleRate

      console.log(`[MP3] 帧头解析: bitrate=${bitrate}kbps sampleRate=${sampleRate} frames≈${totalFrames} duration=${duration.toFixed(1)}s`)
      return Math.max(1, Math.ceil(duration))
    }

    return estimateBySize(stat.size)
  } catch {
    return estimateBySize((await fs.stat(filePath).catch(() => ({ size: 0 }))).size)
  }
}

/** 兜底：按文件大小估算时长（128kbps ≈ 16KB/s） */
function estimateBySize(bytes: number): number {
  return Math.max(1, Math.ceil(bytes / 16000))
}

// ─── Qwen3 TTS 配置 ────────────────────────────────────────

const QWEN_TTS_API_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

// ─── CosyVoice 配置（备用）──────────────────────────────────

const COSYVOICE_API_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'

interface QwenTTSResponse {
  status_code: number
  request_id?: string
  output?: {
    audio?: {
      url: string
      id: string
      expires_at: number
    }
  }
  usage?: {
    input_tokens: number
    output_tokens: number
    characters: number
  }
  message?: string
  code?: string
}

interface CosyVoiceResponse {
  request_id: string
  output?: {
    finish_reason: string
    audio?: {
      data: string
      url: string
      id: string
      expires_at: number
    }
  }
  usage?: {
    characters: number
  }
  message?: string
}

// ─── TTS 主服务 ───────────────────────────────────────────

export class AliyunTTSService {
  private config: VoiceConfig
  private apiKey: string
  private useQwen: boolean

  constructor(config: VoiceConfig) {
    this.config = {
      voice: 'longwan_v3',
      speechRate: 0,
      pitchRate: 0,
      volume: 50,
      ...config,
    }
    this.apiKey =
      config.accessKeyId || process.env.DASHSCOPE_API_KEY || ''

    // 自动推断引擎类型：如果 model 以 qwen3 开头则走 Qwen3 TTS
    const model = (this.config as Record<string, unknown>).model as string || ''
    this.useQwen = model.startsWith('qwen3')
  }

  async textToSpeech(text: string): Promise<TTSResult> {
    try {
      if (!text || text.trim().length === 0) {
        return { success: false, error: '文本内容不能为空' }
      }

      const trimmed = text.length > 500 ? text.substring(0, 500) : text

      const { path: audioUrl, duration } = this.useQwen
        ? await this.callQwenTTS(trimmed)
        : await this.callCosyVoice(trimmed)

      return { success: true, audioFilePath: audioUrl, duration }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知错误'
      const engine = this.useQwen ? 'Qwen3 TTS' : 'CosyVoice'
      console.error(`[${engine}] 合成失败:`, msg)
      return { success: false, error: msg }
    }
  }

  /** 调用 Qwen3 TTS API */
  private async callQwenTTS(text: string): Promise<{path: string, duration: number}> {
    if (!this.apiKey) {
      throw new Error('缺少 DASHSCOPE_API_KEY，请在 .env.local 中配置')
    }

    const voice = this.config.voice || 'Ono Anna'
    const model = (this.config as Record<string, unknown>).model as string || 'qwen3-tts-flash'

    const input: Record<string, unknown> = {
      text,
      voice,
    }

    // 非中文文本设置 language_type
    if (/[a-zA-Z]{10,}/.test(text)) {
      input.language_type = 'Auto'
    }

    const payload: Record<string, unknown> = {
      model,
      input,
    }

    console.log(`[Qwen3] 合成 voice="${voice}" model="${model}": "${text.slice(0, 30)}..."`)

    const resp = await fetch(QWEN_TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(model.includes('instruct') ? {} : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Qwen3 TTS API 返回 ${resp.status}: ${errText.slice(0, 300)}`)
    }

    const data = (await resp.json()) as QwenTTSResponse

    if (data.message || data.code) {
      throw new Error(`Qwen3 TTS 错误: ${data.message || data.code}`)
    }

    if (!data.output?.audio?.url) {
      throw new Error(`Qwen3 TTS 响应异常: ${JSON.stringify(data).slice(0, 200)}`)
    }

    // 从临时 URL 下载音频
    console.log(`[Qwen3] 下载音频...`)
    const audioResp = await fetch(data.output.audio.url, {
      signal: AbortSignal.timeout(30000),
    })
    if (!audioResp.ok) {
      throw new Error(`下载音频失败: ${audioResp.status}`)
    }
    const audioBuffer = Buffer.from(await audioResp.arrayBuffer())

    // 保存到 audio/（非 public/，通过 API 路由提供）
    const audioDir = path.join(process.cwd(), 'audio')
    await fs.mkdir(audioDir, { recursive: true })

    const timestamp = Date.now()
    const textHash = crypto.createHash('md5').update(text).digest('hex').substring(0, 8)
    const fileName = `tts_${timestamp}_${textHash}.mp3`
    const filePath = path.join(audioDir, fileName)
    await fs.writeFile(filePath, audioBuffer)

    const duration = await calcMp3Duration(filePath)
    console.log(
      `[Qwen3] 成功: /api/audio/${fileName} ` +
      `(${(audioBuffer.length / 1024).toFixed(1)}KB, ${charCount}字符, ${duration}s)`
    )

    return { path: `/api/audio/${fileName}`, duration }
  }

  /** 调用 CosyVoice API（备用引擎） */
  private async callCosyVoice(text: string): Promise<{path: string, duration: number}> {
    if (!this.apiKey) {
      throw new Error('缺少 DASHSCOPE_API_KEY，请在 .env.local 中配置')
    }

    const voice = this.config.voice || 'longwan_v3'
    const model = (this.config as Record<string, unknown>).model as string || 'cosyvoice-v3-flash'

    // 🔧 龙婉情绪控制：用 CosyVoice 官方支持的 instruction 格式
    const emotion = (this.config as Record<string, unknown>).emotion as string || 'calm'
    
    // CosyVoice v3-flash 系统音色支持的指令格式（来自官方文档）
    const emotionInstructions: Record<string, string> = {
      'happy': '请非常开心地说一句话。',
      'sad':   '请非常伤心地说一句话。',
      'cry':   '请非常伤心地说一句话。',
      'angry': '请非常生气地说一句话。',
      'care':  '你可以做一个温柔的情感演示吗？',
      'soft':  '你可以做一个温柔的情感演示吗？',
      'gentle':'你可以做一个温柔的情感演示吗？',
      'shy':   '你可以做一个温柔的情感演示吗？',
      'miss':  '请非常伤心地说一句话。',
      'surprised': '请非常惊讶地说一句话。',
      'expect':'请非常开心地说一句话。',
      'calm':  '我想听听用沉稳的方式说话的样子。',
      'idle':  '用自然亲切的闲聊风格叙述。',
      'thinking':'我想听听用沉稳的方式说话的样子。',
      'whisper':'你可以做一个温柔的情感演示吗？',
      'sleep': '我想听听用沉稳的方式说话的样子。',
    }
    
    const instruction = emotionInstructions[emotion] || undefined
    if (instruction) {
      console.log(`[CosyVoice] voice=${voice} emotion=${emotion} → instruction="${instruction}"`)
    }

    // 智能范围检测：CosyVoice 直接使用 0.5~2.0，NLS 的 -500~500 才做转换
    const rawRate = this.config.speechRate ?? 1.0
    const rawPitch = this.config.pitchRate ?? 1.0
    const rate = (rawRate >= 0.1 && rawRate <= 3.0)
      ? Math.max(0.5, Math.min(2.0, rawRate))
      : ((rawRate / 500) * 1.5 + 1.0)
    const pitch = (rawPitch >= 0.5 && rawPitch <= 2.0)
      ? rawPitch
      : ((rawPitch / 500) * 1.5 + 1.0)
    const volume = Math.max(0, Math.min(100, this.config.volume ?? 50))

    const payload = {
      model,
      input: {
        text,
        voice,
        format: 'mp3',
        sample_rate: 22050,
        volume,
        rate: Math.max(0.5, Math.min(2.0, rate)),
        pitch: Math.max(0.5, Math.min(2.0, pitch)),
        instruction,  // 🔧 已禁用（系统音色不支持）
      },
    }

    // 🔧 调试：打印完整请求参数
    console.log(`[CosyVoice] 请求参数:`, JSON.stringify({
      model,
      voice,
      rate: Math.max(0.5, Math.min(2.0, rate)),
      pitch: Math.max(0.5, Math.min(2.0, pitch)),
      volume,
      instruction,
      textLength: text.length,
    }, null, 2))

    console.log(`[CosyVoice] 合成中 voice=${voice} model=${model}: "${text.slice(0, 30)}..."`)

    const resp = await fetch(COSYVOICE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`CosyVoice API 返回 ${resp.status}: ${errText.slice(0, 300)}`)
    }

    const data = (await resp.json()) as CosyVoiceResponse

    // 检查错误
    if (data.message) {
      throw new Error(`CosyVoice 错误: ${data.message}`)
    }

    if (!data.output?.audio) {
      throw new Error(`CosyVoice 响应异常: ${JSON.stringify(data).slice(0, 200)}`)
    }

    // 优先使用 base64 数据，否则下载 URL
    let audioBuffer: Buffer

    if (data.output.audio.data && data.output.audio.data.length > 100) {
      // 有 base64 数据
      audioBuffer = Buffer.from(data.output.audio.data, 'base64')
      console.log(`[CosyVoice] 使用 base64 数据 (${(audioBuffer.length / 1024).toFixed(1)}KB)`)
    } else if (data.output.audio.url) {
      // 从临时 URL 下载
      console.log(`[CosyVoice] 从临时 URL 下载音频...`)
      const audioResp = await fetch(data.output.audio.url, {
        signal: AbortSignal.timeout(30000),
      })
      if (!audioResp.ok) {
        throw new Error(`下载音频失败: ${audioResp.status}`)
      }
      audioBuffer = Buffer.from(await audioResp.arrayBuffer())
    } else {
      throw new Error('CosyVoice 响应中无音频数据')
    }

    // 保存到 audio/（非 public/，通过 API 路由提供）
    const audioDir = path.join(process.cwd(), 'audio')
    await fs.mkdir(audioDir, { recursive: true })

    const timestamp = Date.now()
    const textHash = crypto.createHash('md5').update(text).digest('hex').substring(0, 8)
    const fileName = `tts_${timestamp}_${textHash}.mp3`
    const filePath = path.join(audioDir, fileName)
    await fs.writeFile(filePath, audioBuffer)

    const characterCount = data.usage?.characters ?? text.length
    const duration = await calcMp3Duration(filePath)
    console.log(
      `[CosyVoice] 成功: /api/audio/${fileName} ` +
      `(${(audioBuffer.length / 1024).toFixed(1)}KB, ${characterCount}字符, ${duration}s)`
    )

    return { path: `/api/audio/${fileName}`, duration }
  }
}

export function createTTSService(config: VoiceConfig): AliyunTTSService {
  return new AliyunTTSService(config)
}

export async function textToSpeech(text: string, config: VoiceConfig): Promise<TTSResult> {
  return new AliyunTTSService(config).textToSpeech(text)
}
