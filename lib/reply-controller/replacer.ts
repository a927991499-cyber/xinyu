/**
 * 替换规则模块
 * 提供更细粒度的文本替换功能
 */

/**
 * 替换规则定义
 */
export interface ReplacementRule {
  pattern: RegExp
  replacement: string
  description: string
}

/**
 * 获取所有替换规则
 */
export function getReplacementRules(): ReplacementRule[] {
  return [
    // AI腔 → 人话
    { pattern: /辛苦了/g, replacement: '今天应该挺累', description: '替换"辛苦了"' },
    { pattern: /建议你休息/g, replacement: '先休息会', description: '替换"建议你休息"' },
    { pattern: /你很棒/g, replacement: '不容易', description: '替换"你很棒"' },
    { pattern: /希望你开心/g, replacement: '今天会慢慢过去', description: '替换"希望你开心"' },
    
    // 过于正式的问候
    { pattern: /很高兴认识你/g, replacement: '嗯，你好', description: '替换正式问候' },
    { pattern: /有什么可以帮助你/g, replacement: '怎么了', description: '替换客服式问候' },
    
    // 过于共情的表达
    { pattern: /我理解你的感受/g, replacement: '嗯', description: '简化共情表达' },
    { pattern: /如果你需要倾诉/g, replacement: '想说就说', description: '替换鼓励倾诉' },
    
    // 记忆相关（不要强调记忆）
    { pattern: /我记得你说过/g, replacement: '想起', description: '弱化记忆强调' },
    { pattern: /根据我们的对话记录/g, replacement: '', description: '删除记录强调' },
    
    // 建议类（减少指导性）
    { pattern: /建议你/g, replacement: '你可以', description: '软化建议语气' },
    { pattern: /你应该/g, replacement: '你可以', description: '软化应该语气' },
    { pattern: /你必须/g, replacement: '你或许可以', description: '软化必须语气' },

    // 鸡汤类（删除）
    { pattern: /加油/g, replacement: '', description: '删除"加油"' },
    { pattern: /你一定可以/g, replacement: '嗯', description: '删除过度鼓励' },
    { pattern: /相信你自己/g, replacement: '', description: '删除鸡汤' },
  ]
}

/**
 * 应用所有替换规则
 * @param text 原始文本
 * @returns 替换后的文本
 */
export function applyReplacements(text: string): string {
  let result = text
  const rules = getReplacementRules()

  for (const rule of rules) {
    result = result.replace(rule.pattern, rule.replacement)
  }

  // 清理空行和多余空格
  result = result.replace(/\n{3,}/g, '\n\n')
  result = result.replace(/  +/g, ' ')
  result = result.trim()

  return result
}

/**
 * 自定义替换（允许扩展）
 */
export function applyCustomReplacement(
  text: string,
  pattern: string | RegExp,
  replacement: string
): string {
  if (typeof pattern === 'string') {
    return text.replace(new RegExp(pattern, 'g'), replacement)
  }
  return text.replace(pattern, replacement)
}

/**
 * 批量替换
 */
export function applyBatchReplacements(
  text: string,
  replacements: Array<[string | RegExp, string]>
): string {
  let result = text
  for (const [pattern, replacement] of replacements) {
    result = applyCustomReplacement(result, pattern, replacement)
  }
  return result
}
