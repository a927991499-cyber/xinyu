/**
 * 小雪AI伴侣核心引擎
 * 统一处理AI回复生成和语音输出
 */

import { speak, isVoiceSystemConfigured, VoiceConfig, ConversationContext } from './voice-system'
import { rewriteReply } from './reply-controller'

/**
 * AI回复处理结果
 */
export interface AIReplyResult {
  /** 文本回复内容 */
  text: string
  /** 语音文件路径（如果启用了语音输出） */
  voiceFilePath?: string
}

/**
 * 处理AI回复（核心引擎函数）
 * 生成AI文本回复，并可选择转换为语音
 * 
 * @param reply 原始AI回复文本
 * @param context 对话上下文
 * @param options 处理选项
 * @returns 处理结果（包含文本和可选的语音文件路径）
 */
export async function processAIReply(
  reply: string,
  context: ConversationContext,
  options?: {
    /** 是否启用语音输出 */
    enableVoice?: boolean
    /** 语音配置（可选，默认从环境变量读取） */
    voiceConfig?: VoiceConfig
    /** 是否应用回复重写规则 */
    enableRewrite?: boolean
  }
): Promise<AIReplyResult> {
  // 默认选项
  const opts = {
    enableVoice: false,
    enableRewrite: true,
    ...options
  }

  let finalReply = reply

  // 应用回复重写规则（可选）
  if (opts.enableRewrite) {
    try {
      finalReply = rewriteReply(reply, context)
    } catch (error) {
      console.warn('回复重写失败，使用原始回复:', error)
      finalReply = reply
    }
  }

  // 初始化结果
  const result: AIReplyResult = {
    text: finalReply
  }

  // 如果启用语音输出，生成语音文件
  if (opts.enableVoice) {
    // 检查语音系统是否已配置
    if (!isVoiceSystemConfigured() && !opts.voiceConfig) {
      console.warn('语音系统未配置，跳过语音生成')
      return result
    }

    try {
      // 调用语音合成
      const ttsResult = await speak(finalReply)
      result.voiceFilePath = ttsResult.path
    } catch (error) {
      console.error('语音生成失败:', error)
      // 不影响文本回复，只记录错误
    }
  }

  return result
}

/**
 * 快速处理AI回复（使用默认配置）
 * @param reply AI回复文本
 * @param userId 用户ID
 * @returns 处理结果
 */
export async function quickProcessReply(
  reply: string,
  userId: string
): Promise<AIReplyResult> {
  const context: ConversationContext = {
    userId,
    sessionId: `session_${Date.now()}`,
    history: [],
    memory: {},
    relationshipLevel: 0
  }

  return processAIReply(reply, context)
}

/**
 * 批量处理多条AI回复
 * @param replies 回复列表
 * @param context 对话上下文
 * @param options 处理选项
 * @returns 处理结果列表
 */
export async function batchProcessReplies(
  replies: string[],
  context: ConversationContext,
  options?: {
    enableVoice?: boolean
    voiceConfig?: VoiceConfig
    enableRewrite?: boolean
  }
): Promise<AIReplyResult[]> {
  const results: AIReplyResult[] = []

  for (const reply of replies) {
    const result = await processAIReply(reply, context, options)
    results.push(result)
  }

  return results
}

/**
 * 检查系统状态
 * @returns 系统状态信息
 */
export function getSystemStatus(): {
  voiceSystem: boolean
  replyRewriter: boolean
  version: string
} {
  return {
    voiceSystem: isVoiceSystemConfigured(),
    replyRewriter: true, // 回复重写器始终可用
    version: '1.0.0'
  }
}

// 统一导出
export { speak, isVoiceSystemConfigured }
export type { VoiceConfig, ConversationContext, AIReplyResult }
