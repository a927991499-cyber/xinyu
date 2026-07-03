/**
 * 记忆系统 V2 - 统一导出
 * 4层记忆架构：事实 / 关系 / 情绪 / 成长
 */

// ─── 类型导出 ──────────────────────────────────────────────

export type {
  UserMemory,
  MemoryType,
  MemoryLayer,
  MemoryExtraction,
  MemoryFilterResult,
  MemoryRecallResult,
  MemoryScores,
  MemoryStorageData,
  RelationshipLevel,
  RelationshipTier,
  RelationshipMemory,
  GrowthMemory,
  EmotionLabel,
  GoalStatus,
  TopicDetection,
} from './types'

export { calcMemoryScore, migrateV1toV2 } from './types'

// ─── 函数导出 ──────────────────────────────────────────────

// 提取器（已废弃 V2，统一使用 @/lib/memory-extractor）
// 不再导出 extractMemories / extractMemoriesLocal

// 存储
export { loadMemories, storeMemories, deleteMemory, clearMemories } from './storage'

// 召回
export {
  filterMemory,
  recallMemories,
  detectTopic,
  isMemoryHit,
  buildMemoryContextV1,
} from './recall'

// 关系
export {
  calculateRelationshipLevel,
  getRelationshipDescription,
  getRelationshipName,
  loadRelationshipParams,
  updateInteractionCount,
} from './relationship'
