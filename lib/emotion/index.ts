/**
 * 情绪状态机 - 统一导出
 */

// 类型导出
export type { Emotion, EmotionState, EmotionTransitionResult } from './state-machine'

// 类和函数导出
export { 
  EmotionStateMachine, 
  canTransition, 
  getEmotionName, 
  getEmotionEmoji 
} from './state-machine'

export { 
  EmotionTriggerDetector, 
  createTriggerDetector, 
  detectEmotion,
  detectAIEmotion 
} from './triggers'

export { 
  getTransitionRules, 
  findTransitionRule, 
  getTransitionPath,
  isValidTransition,
  getSuggestedDuration
} from './transitions'
