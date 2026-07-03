import { NextRequest, NextResponse } from "next/server"
import { loadPersonaProfile, extractPersona, calculateGrowthScore, getGrowthStage } from "@/lib/persona-extractor"
import { generatePersonaSummary, getWeakDimensions, createSnapshot } from "@/lib/persona-summarizer"
import { getDb } from "@/lib/db"

// 获取人格画像
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    let userId: string
    try { userId = Buffer.from(token, 'base64').toString('utf-8') }
    catch { return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 }) }
    if (!userId || userId.length < 5) return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 })

    let profile = loadPersonaProfile(userId)
    if (!profile) {
      return NextResponse.json({
        success: true,
        hasProfile: false,
        personaScore: 0,
        stage: '初识自己',
        stageIcon: '🌱',
        canCreate: false,
        message: '还没有人格数据，多和小雪聊天吧～'
      })
    }

    let canCreate = false
    const weakDimensions = getWeakDimensions(userId)

    // 维度解锁状态（10子任务 × 7维度 = 70总标签）
    const getConf = (n: any) => typeof n === 'number' ? Math.round(n * 100) : 0
    const valsConf = profile.values?.confidence || {}
    const dimensions = {
      speaking_style: {
        label: '说话风格', icon: '💬',
        progress: getConf(profile.style?.confidence),
        sub: [
          { label: '表达方式', done: !!(profile.style?.style) },
          { label: '句子习惯', done: !!(profile.style?.sentence_length) },
          { label: '正式程度', done: !!(profile.style?.formality) },
          { label: '幽默感', done: (profile.style?.confidence || 0) > 0.4 },
          { label: '口头禅', done: (profile.style?.emoji_rate || 0) > 0.3 },
          { label: '爱用反问', done: !!(profile.style?.style && profile.style.style !== 'mixed') },
          { label: '情绪词频率', done: (profile.style?.emoji_rate || 0) > 0.1 },
          { label: '主动vs被动', done: !!(profile.style?.formality && profile.style.formality !== 'casual') },
          { label: '描述细节', done: !!(profile.style?.sentence_length && profile.style.sentence_length !== 'short') },
          { label: '话题节奏', done: (profile.style?.confidence || 0) > 0.5 },
        ]
      },
      interests: {
        label: '兴趣爱好', icon: '🎯',
        progress: Math.min(100, (profile.interests?.length || 0) * 15),
        sub: [
          { label: '至少1项兴趣', done: (profile.interests?.length || 0) >= 1 },
          { label: '聊过2项以上', done: (profile.interests?.length || 0) >= 2 },
          { label: '3项以上', done: (profile.interests?.length || 0) >= 3 },
          { label: '深度聊过某话题', done: (profile.interests || []).some((i: any) => i.score > 60) },
          { label: '文化偏好', done: (profile.interests?.length || 0) >= 4 },
          { label: '娱乐偏好', done: (profile.interests?.length || 0) >= 5 },
          { label: '社交偏好', done: (profile.interests || []).some((i: any) => /社交|朋友|聚会/.test(i.topic)) },
          { label: '视野广度', done: (profile.interests?.length || 0) >= 6 },
          { label: '兴趣稳定性', done: !!(profile.interests || []).find((i: any) => i.mentions >= 2) },
          { label: '变化频率', done: (profile.interests?.length || 0) >= 7 },
        ]
      },
      emotion: {
        label: '情绪模式', icon: '😌',
        progress: getConf(profile.emotion?.confidence),
        sub: [
          { label: '压力应对', done: !!(profile.emotion?.stress_response) },
          { label: '开心表达', done: !!(profile.emotion?.happy_response) },
          { label: '难过处理', done: !!(profile.emotion?.sad_response) },
          { label: '生气处理', done: !!(profile.emotion?.angry_response) },
          { label: '焦虑表现', done: (profile.emotion?.confidence || 0) > 0.4 },
          { label: '吐槽频率', done: !!(profile.emotion?.stress_response && profile.emotion.stress_response === 'vent') },
          { label: '情绪稳定性', done: (profile.emotion?.confidence || 0) > 0.5 },
          { label: '共情力', done: !!(profile.emotion?.happy_response && profile.emotion.happy_response === 'share') },
          { label: '情感外露', done: !!(profile.emotion?.confidence && getConf(profile.emotion?.confidence) > 40) },
          { label: '恢复速度', done: (profile.emotion?.confidence || 0) > 0.6 },
        ]
      },
      values: {
        label: '价值观', icon: '🧭',
        progress: Math.round((valsConf.career + valsConf.family + valsConf.freedom + valsConf.money + valsConf.love) / 5 * 80),
        sub: [
          { label: '事业观', done: valsConf.career > 0.2 },
          { label: '家庭观', done: valsConf.family > 0.2 },
          { label: '金钱观', done: valsConf.money > 0.2 },
          { label: '消费观', done: valsConf.money > 0.4 },
          { label: '社交观', done: valsConf.family > 0.4 || valsConf.freedom > 0.4 },
          { label: '时间观', done: valsConf.career > 0.5 },
          { label: '自由观', done: valsConf.freedom > 0.3 },
          { label: '爱情观', done: valsConf.love > 0.3 },
          { label: '健康观', done: valsConf.family > 0.5 },
          { label: '自我成长', done: valsConf.career > 0.3 && valsConf.freedom > 0.3 },
        ]
      },
      decision: {
        label: '决策习惯', icon: '⚡',
        progress: getConf(profile.decision?.confidence),
        sub: [
          { label: '行动vs规划', done: !!(profile.decision?.style) },
          { label: '风险偏好', done: !!(profile.decision?.style && profile.decision.style !== 'conservative') },
          { label: '冲动vs谨慎', done: (profile.decision?.confidence || 0) > 0.3 },
          { label: '纠结程度', done: !!(profile.decision?.confidence && getConf(profile.decision?.confidence) > 40) },
          { label: '信息收集', done: (profile.decision?.confidence || 0) > 0.5 },
          { label: '他人意见', done: !!(profile.decision?.style === 'conservative') },
          { label: '底线意识', done: (profile.decision?.confidence || 0) > 0.6 },
          { label: '应急反应', done: (profile.decision?.confidence || 0) > 0.7 },
          { label: '长短期权衡', done: !!(profile.decision?.style && profile.decision.style !== 'action_first') },
          { label: '优先级排序', done: (profile.decision?.confidence || 0) > 0.8 },
        ]
      },
      relationship: {
        label: '关系观', icon: '💝',
        progress: getConf(profile.relationship?.confidence),
        sub: [
          { label: '依恋类型', done: !!(profile.relationship?.attachment_style) },
          { label: '信任速度', done: !!(profile.relationship?.trust_speed) },
          { label: '亲密距离', done: !!(profile.relationship?.emotional_dependency) },
          { label: '依赖程度', done: !!(profile.relationship?.emotional_dependency && profile.relationship.emotional_dependency !== 'low') },
          { label: '付出vs接收', done: (profile.relationship?.confidence || 0) > 0.4 },
          { label: '冲突处理', done: !!(profile.relationship?.attachment_style && profile.relationship.attachment_style !== 'disorganized') },
          { label: '社交角色', done: (profile.relationship?.confidence || 0) > 0.5 },
          { label: '独处偏好', done: !!(profile.relationship?.trust_speed === 'slow') },
          { label: '忠诚观', done: (profile.relationship?.confidence || 0) > 0.6 },
          { label: '朋友vs家人', done: (profile.relationship?.confidence || 0) > 0.7 },
        ]
      },
      experience: {
        label: '人生经历', icon: '📖',
        progress: Math.min(100, (profile.memoryGraph?.length || 0) * 12),
        sub: [
          { label: '分享过经历', done: (profile.memoryGraph?.length || 0) >= 1 },
          { label: '2件以上', done: (profile.memoryGraph?.length || 0) >= 2 },
          { label: '3件以上', done: (profile.memoryGraph?.length || 0) >= 3 },
          { label: '工作经历', done: (profile.memoryGraph || []).some((g: any) => /工作|职业|公司|创业/.test(g.topic)) },
          { label: '家庭经历', done: (profile.memoryGraph || []).some((g: any) => /家庭|父母|孩子|结婚/.test(g.topic)) },
          { label: '情感经历', done: (profile.memoryGraph || []).some((g: any) => /感情|恋爱|分手/.test(g.topic)) },
          { label: '成长节点', done: (profile.memoryGraph?.length || 0) >= 4 },
          { label: '低谷时刻', done: (profile.memoryGraph?.length || 0) >= 5 },
          { label: '成就时刻', done: (profile.memoryGraph || []).some((g: any) => g.importance > 0.6) },
          { label: '生活细节', done: (profile.memoryGraph?.length || 0) >= 6 },
        ]
      },
    }

    // 重新计算 progress（基于子任务完成数）和 canCreate
    let totalProgress = 0
    for (const dim of Object.values(dimensions) as any[]) {
      dim.progress = Math.round(dim.sub.filter((s: any) => s.done).length / dim.sub.length * 100)
      totalProgress += dim.progress
    }
    const avgProgress = Math.round(totalProgress / Object.keys(dimensions).length)
    canCreate = avgProgress >= 90

    return NextResponse.json({
      success: true,
      hasProfile: true,
      ...profile,
      personaScore: avgProgress,
      canCreate,
      dimensionCount: Object.keys(dimensions).length,
      dimensions,
      weakDimensions
    })
  } catch (e: any) {
    console.error('[Persona Profile] 错误:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// 手动触发人格提取
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    let userId: string
    try { userId = Buffer.from(token, 'base64').toString('utf-8') }
    catch { return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 }) }
    if (!userId || userId.length < 5) return NextResponse.json({ success: false, error: 'Token无效' }, { status: 401 })

    // 🔧 5分钟冷却检查
    const db = getDb()
    const profile = db.prepare('SELECT last_updated FROM persona_profile WHERE user_id = ?').get(userId) as any
    if (profile?.last_updated) {
      const elapsed = Date.now() - new Date(profile.last_updated).getTime()
      if (elapsed < 300000) {
        const remaining = Math.ceil((300000 - elapsed) / 60000)
        return NextResponse.json({ success: false, error: `请${remaining}分钟后再刷新` }, { status: 429 })
      }
    }

    const ok = await extractPersona(userId)
    if (ok) {
      await generatePersonaSummary(userId)
      createSnapshot(userId) // 自动创建月度快照
    }

    return NextResponse.json({
      success: ok,
      message: ok ? '人格提取完成' : '聊天记录不足，多和小雪聊聊吧'
    })
  } catch (e: any) {
    console.error('[Persona Profile POST] 错误:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
