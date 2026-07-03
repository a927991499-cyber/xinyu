/**
 * Layer 1: 情绪 & 意图识别层
 *
 * 输入：用户文本
 * 输出：{ emotion, intent, urgency, topic }
 *
 * 支持两种模式：
 * - keyword（默认）：本地关键词匹配，零延迟
 * - llm：调用 DeepSeek 分类，更准确但有网络延迟
 *
 * 架构位置：全链路第1层
 * 用户输入 → ① 本层 → ② 数字大脑 → ③ 文本导演 → ④ TTS
 */

import { Emotion } from '@/lib/emotion/state-machine'

// ═══════════════════════════════════════════════════════
// 输出类型
// ═══════════════════════════════════════════════════════

export interface Layer1Output {
  /** 用户情绪（映射到 CosyVoice emotion 参数） */
  emotion: Emotion
  /** 用户意图 */
  intent: '分享' | '求安慰' | '闲聊' | '求建议' | '吐槽' | '汇报'
  /** 紧急程度 */
  urgency: 'low' | 'medium' | 'high'
  /** 话题分类 */
  topic: '工作' | '情感' | '生活' | '技术' | '健康' | '随机'
  /** 置信度 */
  confidence: number
}

// ═══════════════════════════════════════════════════════
// 关键词匹配器（默认模式，零延迟）
// ═══════════════════════════════════════════════════════

const INTENT_PATTERNS: Record<string, { intent: Layer1Output['intent']; keywords: string[] }> = {
  '分享':    { intent: '分享',  keywords: ['今天', '我去了', '我吃了', '我买了', '我做了', '看到', '遇到', '发现', '收到了', '拿到了'] },
  '求安慰':  { intent: '求安慰', keywords: ['安慰', '抱抱', '陪我', '难受', '不开心', '好累', '撑不住', '想哭', '崩溃'] },
  '求建议':  { intent: '求建议', keywords: ['怎么办', '你觉得', '帮我', '建议', '怎么选', '该不该', '要不要', '怎么处理'] },
  '吐槽':    { intent: '吐槽',  keywords: ['气死', '无语', '受不了', '讨厌', '烦', '神经病', '有毒', '离谱', '凭什么'] },
  '汇报':    { intent: '汇报',  keywords: ['我辞职', '我买房', '我赚了', '我升职', '我分手', '我脱单', '考过了', '通过了'] },
  '闲聊':    { intent: '闲聊',  keywords: ['在吗', '嗨', '哈喽', '你好', '晚安', '早安', '睡觉', '吃饭'] },
}

const TOPIC_PATTERNS: Record<string, string[]> = {
  '工作': ['工作', '加班', '辞职', '老板', '同事', '开会', '项目', '汇报', '升职', '面试', '工资', '跳槽'],
  '情感': ['喜欢', '爱', '分手', '恋爱', '对象', '男朋友', '女朋友', '暧昧', '想你', '想念', '孤独'],
  '生活': ['吃饭', '做饭', '健身', '跑步', '买菜', '打扫', '搬家', '购物', '旅行', '天气'],
  '技术': ['代码', 'bug', '产品', 'AI', '开发', '设计', '服务器', '部署', 'API', '前端', '后端'],
  '健康': ['累', '困', '疼', '病', '医院', '药', '失眠', '焦虑', '压力', '头晕', '感冒'],
}

const EMOTION_KEYWORDS: [Emotion, string[], number][] = [
  // [情绪, 关键词列表, 基础置信度]
  // 注意：顺序影响优先级，cry/angry 等强烈情绪应该放在前面

  // 强烈情绪（高优先级）
  ['cry',   ['哭', '哭泣', '流泪', '呜呜', '哇哇', '抽泣', '抹眼泪', '泪流满面'], 0.85],
  ['angry', ['生气', '愤怒', '气死', '讨厌', '烦死了', '滚', '恶心', '恨', '恼火'], 0.80],

  // 正面情绪
  ['happy',    ['哈哈', '嘻嘻', '开心', '高兴', '快乐', '好棒', '太好了', '笑死', '不错', '喜欢', '爱了', '愉快', '兴奋'], 0.8],
  ['expect',   ['期待', '希望', '盼望', '等不及', '好想', '好期待'], 0.75],
  ['surprised', ['惊讶', '惊呆', '不敢相信', '哇', '天哪', '没想到', '居然'], 0.78],

  // 负面/低落情绪
  ['sad',   ['难过', '伤心', '委屈', '崩溃', '撑不住', '失落', '沮丧', '不开心', '不高兴', '悲伤'], 0.85],
  ['soft',  ['伤心', '低落', '心情不好', '难过', '心碎'], 0.70],

  // 温柔/关心情绪
  ['care',  ['累', '疲惫', '困', '辛苦', '疼', '不舒服', '失眠', '焦虑', '压力', '担心', '心疼'], 0.75],
  ['gentle', ['温柔', '轻声', '慢慢说', '不急', '没关系', '没事'], 0.70],

  // 思念/害羞
  ['miss',  ['想你', '想念', '好久不见', '梦见', '你在干嘛', '什么时候', '思念'], 0.8],
  ['shy',   ['害羞', '不好意思', '脸红', '可爱', '撒娇', '抱抱', '贴贴', '羞涩'], 0.75],

  // 特殊状态
  ['sleep',    ['困', '想睡', '睡觉', '好困', '眯一会儿', '眼皮打架'], 0.72],
  ['thinking', ['思考', '想想', '让我想想', '嗯...', '那个...', '犹豫'], 0.65],
  ['whisper', ['悄悄说', '小声', '别让别人听见', '告诉你个秘密', '耳语'], 0.70],
  ['calm',    ['平静', '没事', '还好', '一般', '还行', '不影响'], 0.60],

  // 默认
  ['idle',  ['嗯', '哦', '好', '知道了', '行', '可以', '哦哦', '嗯嗯'], 0.5],
]

/**
 * 关键词模式：快速分类（默认模式）
 */
export function classifyByKeywords(text: string): Layer1Output {
  const msg = text.toLowerCase().trim()

  // ── 意图检测 ──
  let intent: Layer1Output['intent'] = '闲聊'
  let intentScore = 0
  for (const { intent: i, keywords } of Object.values(INTENT_PATTERNS)) {
    for (const kw of keywords) {
      if (msg.includes(kw)) {
        if (intentScore < 1) { intent = i; intentScore = 1 }
        break
      }
    }
  }

  // ── 话题检测 ──
  let topic: Layer1Output['topic'] = '随机'
  for (const [t, keywords] of Object.entries(TOPIC_PATTERNS)) {
    for (const kw of keywords) {
      if (msg.includes(kw)) {
        topic = t as Layer1Output['topic']
        break
      }
    }
    if (topic !== '随机') break
  }

  // ── 情绪检测 ──
  let emotion: Emotion = 'idle'
  let confidence = 0.4
  for (const [emo, keywords, baseConf] of EMOTION_KEYWORDS) {
    for (const kw of keywords) {
      if (msg.includes(kw)) {
        emotion = emo
        confidence = baseConf
        break
      }
    }
    if (emotion !== 'idle') break
  }

  // ── 紧急程度 ──
  let urgency: Layer1Output['urgency'] = 'low'
  const urgentWords = ['急', '快', '马上', '立刻', '现在', '救命', '怎么办', '崩溃']
  if (urgentWords.some(w => msg.includes(w))) urgency = 'medium'
  if (msg.includes('救命') || msg.includes('崩溃')) urgency = 'high'

  return { emotion, intent, urgency, topic, confidence }
}

/**
 * LLM 模式：调用 DeepSeek 进行精确分类
 * 在 API key 可用时使用，延迟约 300-500ms
 */
export async function classifyByLLM(text: string, apiKey: string): Promise<Layer1Output> {
  const systemPrompt = `你是一个情绪和意图分类器。分析用户消息，输出 JSON。

## 情绪 (emotion):
- 强烈情绪: "cry"(哭泣) | "angry"(生气)
- 正面情绪: "happy"(开心) | "expect"(期待) | "surprised"(惊讶)
- 负面情绪: "sad"(伤心) | "soft"(柔和/低落)
- 温柔情绪: "care"(关心) | "gentle"(温和)
- 思念/害羞: "miss"(想念) | "shy"(害羞)
- 特殊状态: "sleep"(困倦) | "thinking"(思考) | "whisper"(耳语) | "calm"(平静)
- 默认: "idle"(空闲)

## 意图 (intent): "分享" | "求安慰" | "闲聊" | "求建议" | "吐槽" | "汇报"
## 紧急度 (urgency): "low" | "medium" | "high"
## 话题 (topic): "工作" | "情感" | "生活" | "技术" | "健康" | "随机"
## 置信度 (confidence): 0.0~1.0

只输出 JSON，不要解释。`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    })

    const data = await response.json() as any
    const content = data?.choices?.[0]?.message?.content || ''

    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        emotion: parsed.emotion || 'idle',
        intent: parsed.intent || '闲聊',
        urgency: parsed.urgency || 'low',
        topic: parsed.topic || '随机',
        confidence: parsed.confidence || 0.5,
      }
    }
  } catch (e) {
    console.error('[Layer1] LLM classification failed:', e)
  }

  // 兜底：关键词分类
  return classifyByKeywords(text)
}
