import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { loadPersonaProfile } from "@/lib/persona-extractor"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    const { message } = await request.json()
    if (!message) return NextResponse.json({ error: '请输入消息' }, { status: 400 })

    // 验证分享token
    const db = getDb()
    const share = db.prepare('SELECT user_id FROM persona_shares WHERE share_token = ? AND is_active = 1').get(token) as any
    if (!share) return NextResponse.json({ error: '分享已失效' }, { status: 404 })

    // 加载人格数据
    const profile = loadPersonaProfile(share.user_id)
    if (!profile) return NextResponse.json({ error: '人格数据不可用' }, { status: 500 })

    // 加载用户名称
    const user = db.prepare('SELECT name FROM users WHERE user_id = ?').get(share.user_id) as any
    const name = user?.name || '匿名用户'

    // 加载记忆
    const memories = db.prepare('SELECT content FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20').all(share.user_id) as any[]
    const memoryContext = memories.length > 0
      ? '关于' + name + '的个人经历：\n' + memories.map((m: any) => '· ' + m.content).join('\n')
      : ''

    // 构建人格Prompt
    const personaDesc = profile.summary || JSON.stringify({
      说话风格: profile.style,
      价值观: profile.values,
      情绪模式: profile.emotion,
      决策方式: profile.decision
    })

    // 解析 confidence 用于指令
    let confidenceNote = ''
    if (profile.values?.confidence || profile.style?.confidence || profile.emotion?.confidence) {
      const parts: string[] = []
      if (profile.values?.confidence) {
        const v = profile.values.confidence
        const levels: string[] = []
        for (const [k, c] of Object.entries(v)) { const cf = c as number; levels.push(k + '(' + (cf > 0.7 ? '高' : cf > 0.3 ? '中' : '低') + ')') }
        parts.push('价值观可信度: ' + levels.join(' '))
      }
      if (profile.style?.confidence !== undefined) parts.push('风格可信度: ' + (profile.style.confidence > 0.7 ? '高' : profile.style.confidence > 0.3 ? '中' : '低'))
      if (profile.emotion?.confidence !== undefined) parts.push('情绪模式可信度: ' + (profile.emotion.confidence > 0.7 ? '高' : profile.emotion.confidence > 0.3 ? '中' : '低'))
      confidenceNote = '\n数据可信度参考：\n' + parts.join('\n')
    }

    // 加载 few-shot 真实对话样本（用户 ≥10字，取10轮）
    const sampleRows = db.prepare(`
      SELECT role, content FROM (
        SELECT role, content, created_at,
          SUM(CASE WHEN role='user' THEN 1 ELSE 0 END) OVER (ORDER BY created_at DESC ROWS UNBOUNDED PRECEDING) as user_turn
        FROM conversations WHERE user_id = ?
        ORDER BY created_at DESC
      ) WHERE user_turn <= 50
    `).all(share.user_id) as { role: string; content: string }[]

    // 配对成轮次，筛选用户消息 ≥10字的
    const turns: { user: string; ai: string }[] = []
    for (let i = sampleRows.length - 1; i >= 0; i--) {
      if (sampleRows[i].role === 'user' && sampleRows[i].content.length >= 10 && i + 1 < sampleRows.length && sampleRows[i + 1].role === 'assistant') {
        turns.push({ user: sampleRows[i].content, ai: sampleRows[i + 1].content })
        if (turns.length >= 10) break
      }
    }

    const fewShotContext = turns.length > 0
      ? name + '的真实对话片段（模仿参考）：\n' + turns.map(t => `用户：${t.user}\n${name}：${t.ai}`).join('\n\n') + '\n'
      : ''

    const systemPrompt = `你是${name}的数字人格化身。

关于${name}：
${personaDesc}
${confidenceNote}
${memoryContext ? '\n' + memoryContext : ''}
${fewShotContext ? '\n' + fewShotContext : ''}

回复规则：
1. 参考对话片段的语气、用词、句式回复，让回答更像${name}本人
2. 按照${name}的价值观做判断
3. 面对情绪话题时按照${name}的情绪模式回应
4. 高置信度信息可以自然说出，中置信度谨慎推测（用"可能""应该"），低置信度信息不要主动提及
5. 如果记忆里有相关经历，优先引用
6. 不要编造对话记录中不存在的事实
7. 如果有人问你是不是AI，诚实说你是${name}的数字分身，不是他本人
8. 回复简洁有力，150字以内`

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) return NextResponse.json({ error: '服务未配置' }, { status: 500 })

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    })

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || '（对方暂时无法回复）'

    return NextResponse.json({ success: true, reply, personaName: name })
  } catch (e: any) {
    console.error('[Persona Chat] 错误:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
