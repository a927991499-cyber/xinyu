/**
 * 回复控制器规则定义
 * 定义如何处理模型回复，使其更有人味
 */

export interface ReplyRule {
  id: string
  name: string
  enabled: boolean
  apply: (reply: string) => string
}

/**
 * 长度控制规则
 * 目标：≤3句，≤50字
 */
export function applyLengthControl(reply: string): string {
  // 按句子分割（支持中英文标点）
  const sentences = reply
    .split(/(?<=[。！？\.\!\?])\s*/)
    .filter(s => s.trim().length > 0)

  // 如果超过3句，只保留前3句
  if (sentences.length > 3) {
    reply = sentences.slice(0, 3).join('')
  }

  // 如果超过50字，截断
  if (reply.length > 50) {
    reply = reply.substring(0, 50)
    // 确保在句子边界截断
    const lastPunct = Math.max(
      reply.lastIndexOf('。'),
      reply.lastIndexOf('！'),
      reply.lastIndexOf('？'),
      reply.lastIndexOf('.')
    )
    if (lastPunct > 30) {
      reply = reply.substring(0, lastPunct + 1)
    }
  }

  return reply
}

/**
 * 删除规则：删除AI腔的表达
 */
export function applyDeletionRules(reply: string): string {
  const deletePatterns = [
    // 禁止的短语
    /希望你能?/g,
    /建议你/g,
    /保持积极/g,
    /作为AI/g,
    /请尝试/g,
    /我相信你可以/g,
    /你要相信/g,
    /加油哦/g,
    /继续加油/g,
    /你一定可以/g,
    /希望你好好/g,

    // 鸡汤类
    /人生就像/g,
    /你要知道/g,
    /其实每个人/g,
    /这个世界/g,

    // 过于正式的表达
    /尊敬的用户/g,
    /亲爱的用户/g,
    /很高兴为你/g,
  ]

  let result = reply
  for (const pattern of deletePatterns) {
    result = result.replace(pattern, '')
  }

  // 清理多余空格
  result = result.replace(/\s+/g, ' ').trim()

  return result
}

/**
 * 替换规则：把AI腔替换成更自然的表达
 */
export const REPLACEMENT_RULES: Array<[RegExp, string]> = [
  [/辛苦了/g, '今天应该挺累'],
  [/建议你休息/g, '先休息会'],
  [/你很棒/g, '不容易'],
  [/希望你开心/g, '今天会慢慢过去'],
  [/很高兴认识你/g, '嗯，你好'],
  [/有什么可以帮助你/g, '怎么了'],
  [/我理解你的感受/g, '嗯'],
  [/如果你需要倾诉/g, '想说就说'],
  [/记住/g, '想起'],
  [/建议您/g, '你可以'],
  [/请注意/g, '注意'],
  [/希望您/g, '希望你'],
]

/**
 * 应用替换规则
 */
export function applyReplacementRules(reply: string): string {
  let result = reply
  for (const [pattern, replacement] of REPLACEMENT_RULES) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * 提问比例控制
 * 目标：≤30%的回复包含提问
 */
export function applyQuestionControl(reply: string): string {
  // 检测是否包含提问
  const hasQuestion = /[？?]/.test(reply)

  if (!hasQuestion) {
    return reply // 没有提问，直接返回
  }

  // 检测提问数量
  const questionCount = (reply.match(/[？?]/g) || []).length

  // 如果提问超过1个，删除多余的
  if (questionCount > 1) {
    // 保留第一个问号，删除后续的
    const firstQuestionIndex = reply.indexOf('？') >= 0 
      ? reply.indexOf('？') 
      : reply.indexOf('?')
    
    const before = reply.substring(0, firstQuestionIndex + 1)
    let after = reply.substring(firstQuestionIndex + 1)
    
    // 删除后续的问号
    after = after.replace(/[？?]/g, '。')
    
    reply = before + after
  }

  return reply
}

/**
 * 语气词添加规则
 * 允许自然地带入语气词
 */
export function applyToneWordRules(reply: string): string {
  // 不在句首或句尾添加语气词，而是让模型自己生成
  // 这里只做清理：移除过多的语气词

  const toneWords = ['……', '嗯', '哈哈', '好呀', '欸', '哦', '啊']

  // 辅助函数：转义正则表达式特殊字符
  function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  for (const word of toneWords) {
    const escapedWord = escapeRegex(word)
    
    // 处理连续重复：如"哈哈哈哈" → "哈哈"
    // 匹配3次以上连续的语气词
    const consecutivePattern = new RegExp(`(${escapedWord}){3,}`, 'g')
    reply = reply.replace(consecutivePattern, word)
    
    // 处理分隔重复：如"嗯……嗯……嗯……" → "嗯……"
    // 匹配3次以上语气词，中间可以有任意字符（非贪婪匹配）
    const separatedPattern = new RegExp(`(${escapedWord}.*?){3,}`, 'g')
    reply = reply.replace(separatedPattern, word)
  }

  return reply
}

/**
 * 减少感叹号和重复词
 */
export function applyPunctuationControl(reply: string): string {
  // 减少连续感叹号（最多2个）
  reply = reply.replace(/!{3,}/g, '!!')
  reply = reply.replace(/！{3,}/g, '！！')

  // 减少重复词（3次以上）
  reply = reply.replace(/(.)\1{3,}/g, '$1$1$1')

  return reply
}

/**
 * 获取所有启用的规则
 */
export function getAllRules(): ReplyRule[] {
  return [
    {
      id: 'length',
      name: '长度控制',
      enabled: true,
      apply: applyLengthControl
    },
    {
      id: 'deletion',
      name: '删除规则',
      enabled: true,
      apply: applyDeletionRules
    },
    {
      id: 'replacement',
      name: '替换规则',
      enabled: true,
      apply: applyReplacementRules
    },
    {
      id: 'question',
      name: '提问控制',
      enabled: true,
      apply: applyQuestionControl
    },
    {
      id: 'tone',
      name: '语气词规则',
      enabled: true,
      apply: applyToneWordRules
    },
    {
      id: 'punctuation',
      name: '标点控制',
      enabled: true,
      apply: applyPunctuationControl
    }
  ]
}
