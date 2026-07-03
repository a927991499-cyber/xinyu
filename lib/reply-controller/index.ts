/**
 * 回复控制器 - 统一导出
 */

// 类型导出
export type { RewrittenReply } from './rewriter'

// 类和函数导出
export { 
  ReplyRewriter, 
  createRewriter, 
  rewriteReply, 
  validateReplyQuality 
} from './rewriter'

export { 
  applyLengthControl,
  applyDeletionRules,
  applyReplacementRules,
  applyQuestionControl,
  applyToneWordRules,
  applyPunctuationControl,
  getAllRules
} from './rules'

export { 
  applyReplacements, 
  applyCustomReplacement, 
  applyBatchReplacements 
} from './replacer'
