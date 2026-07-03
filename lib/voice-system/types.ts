/**
 * 语音系统类型定义
 * 用于小雪AI伴侣的TTS（文本转语音）功能
 * 支持阿里云 NLS 和 CosyVoice（百炼）两种引擎
 */

/**
 * 语音配置接口
 * 存储 TTS 服务所需的认证和配置信息
 * CosyVoice（推荐）：只需配置 accessKeyId 为 DashScope API Key
 * NLS（旧版）：需要配置 accessKeyId + accessKeySecret + appKey
 */
export interface VoiceConfig {
  /** [CosyVoice] DashScope API Key（Bearer Token，推荐） */
  accessKeyId?: string
  /** [NLS 旧版] 阿里云 AccessKey Secret */
  accessKeySecret?: string
  /** [NLS 旧版] 阿里云 TTS AppKey */
  appKey?: string
  /** 音色名称，CosyVoice 默认 longanhuan（龙安欢，支持情感控制） */
  voice?: string
  /** 语速：NLS 用 -500~500，CosyVoice 用 0.5~2.0 */
  speechRate?: number
  /** 音调：NLS 用 -500~500，CosyVoice 用 0.5~2.0 */
  pitchRate?: number
  /** 音量，0 ~ 100，默认 50 */
  volume?: number
  /** [CosyVoice] 模型名称，如 cosyvoice-v3-flash */
  model?: string
  /** [Qwen3 TTS] 情绪/语气自然语言指令 */
  instruction?: string
  /** [CosyVoice] 情绪标签，用于 Instruct 功能（龙安欢等音色支持） */
  emotion?: string
}

/**
 * TTS 处理结果
 */
export interface TTSResult {
  /** 是否成功 */
  success: boolean
  /** 成功时返回音频文件路径 */
  audioFilePath?: string
  /** 音频时长（秒） */
  duration?: number
  /** 失败时返回错误信息 */
  error?: string
}

/**
 * 对话上下文接口
 * 用于传递对话相关的上下文信息
 */
export interface ConversationContext {
  /** 用户ID */
  userId: string
  /** 会话ID */
  sessionId?: string
  /** 对话历史 */
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  /** 用户记忆 */
  memory?: Record<string, string>
  /** 关系等级 */
  relationshipLevel?: number
}
