/**
 * 语音功能使用示例
 * 展示如何在小雪AI伴侣中使用阿里云TTS语音输出功能
 */

import { speak, textToSpeech, createTTSService, isVoiceSystemConfigured } from '../lib/voice-system'
import { processAIReply } from '../lib'

// ============================================
// 示例 1: 快速使用（从环境变量读取配置）
// ============================================

/**
 * 最简单的使用方式
 * 需要先在 .env.local 中配置阿里云密钥
 */
async function example1SimpleUsage() {
  console.log('=== 示例 1: 快速使用 ===')

  // 检查语音系统是否已配置
  if (!isVoiceSystemConfigured()) {
    console.error('语音系统未配置，请先设置环境变量')
    return
  }

  try {
    // 直接调用 speak 函数，返回音频文件路径
    const audioPath = await speak('你好，我是小雪，很高兴认识你！')
    console.log('语音文件已生成:', audioPath)
  } catch (error) {
    console.error('语音合成失败:', error)
  }
}

// ============================================
// 示例 2: 使用自定义配置
// ============================================

/**
 * 使用自定义配置（不依赖环境变量）
 */
async function example2CustomConfig() {
  console.log('\n=== 示例 2: 自定义配置 ===')

  // 自定义语音配置
  const config = {
    accessKeyId: 'YOUR_ACCESS_KEY_ID',
    accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
    appKey: 'YOUR_APP_KEY',
    voice: 'xiaoyun', // 甜美活泼女声
    speechRate: 0,     // 正常语速
    pitchRate: 0,      // 正常音调
    volume: 50          // 正常音量
  }

  try {
    // 使用 textToSpeech 函数
    const result = await textToSpeech('今天天气真好，我们一起出去玩吧！', config)
    
    if (result.success && result.audioFilePath) {
      console.log('语音文件已生成:', result.audioFilePath)
    } else {
      console.error('语音合成失败:', result.error)
    }

    // 使用 TTS 服务类
    const service = createTTSService(config)
    const result2 = await service.textToSpeech('你今天过得怎么样？')
    
    if (result2.success && result2.audioFilePath) {
      console.log('语音文件已生成:', result2.audioFilePath)
    }
  } catch (error) {
    console.error('语音合成失败:', error)
  }
}

// ============================================
// 示例 3: 集成到核心引擎
// ============================================

/**
 * 在核心引擎中使用语音输出
 */
async function example3IntegratedWithCoreEngine() {
  console.log('\n=== 示例 3: 集成到核心引擎 ===')

  // 模拟 AI 生成的回复
  const aiReply = '谢谢你陪我聊天，我感到很开心！'

  // 对话上下文
  const context = {
    userId: 'user_001',
    sessionId: 'session_123',
    history: [
      { role: 'user' as const, content: '你好，小雪！' },
      { role: 'assistant' as const, content: '你好！很高兴见到你~' }
    ],
    memory: {
      'user_name': '小明',
      'user_preference': '喜欢可爱的对话风格'
    },
    relationshipLevel: 30
  }

  try {
    // 处理 AI 回复，启用语音输出
    const result = await processAIReply(aiReply, context, {
      enableVoice: true,  // 启用语音输出
      enableRewrite: true  // 启用回复重写
    })

    console.log('文本回复:', result.text)
    
    if (result.voiceFilePath) {
      console.log('语音文件:', result.voiceFilePath)
    } else {
      console.log('未生成语音文件')
    }
  } catch (error) {
    console.error('处理失败:', error)
  }
}

// ============================================
// 示例 4: 不同音色效果
// ============================================

/**
 * 展示不同音色效果
 */
async function example4DifferentVoices() {
  console.log('\n=== 示例 4: 不同音色 ===')

  const text = '你好，这是一段测试语音。'

  // 不同音色配置
  const voices = [
    { name: 'xiaoyun', desc: '甜美活泼女声（默认）' },
    { name: 'xiaogang', desc: '稳重男声' },
    { name: 'xiaomei', desc: '温柔女声' },
    { name: 'xiaoyu', desc: '知性女声' }
  ]

  for (const voice of voices) {
    console.log(`\n尝试音色: ${voice.desc}`)
    
    const config = {
      accessKeyId: 'YOUR_ACCESS_KEY_ID',
      accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
      appKey: 'YOUR_APP_KEY',
      voice: voice.name
    }

    try {
      const result = await textToSpeech(text, config)
      if (result.success && result.audioFilePath) {
        console.log(`✓ ${voice.name} 语音文件:`, result.audioFilePath)
      }
    } catch (error) {
      console.log(`✗ ${voice.name} 失败:`, error)
    }
  }
}

// ============================================
// 示例 5: 调整语速和音调
// ============================================

/**
 * 调整语速和音调效果
 */
async function example5AdjustSpeechAndPitch() {
  console.log('\n=== 示例 5: 调整语速和音调 ===')

  const config = {
    accessKeyId: 'YOUR_ACCESS_KEY_ID',
    accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
    appKey: 'YOUR_APP_KEY',
    voice: 'xiaoyun'
  }

  // 不同语速效果
  const speechRates = [
    { value: -200, desc: '慢速' },
    { value: 0, desc: '正常' },
    { value: 200, desc: '快速' }
  ]

  for (const rate of speechRates) {
    const testConfig = { ...config, speechRate: rate.value }
    
    try {
      const result = await textToSpeech(`这是${rate.desc}语速的测试`, testConfig)
      if (result.success && result.audioFilePath) {
        console.log(`✓ ${rate.desc}语速:`, result.audioFilePath)
      }
    } catch (error) {
      console.error(`✗ ${rate.desc}语速失败:`, error)
    }
  }
}

// ============================================
// 示例 6: 错误处理
// ============================================

/**
 * 展示错误处理和重试机制
 */
async function example6ErrorHandling() {
  console.log('\n=== 示例 6: 错误处理 ===')

  // 场景 1: 配置不完整
  console.log('\n场景 1: 配置不完整')
  try {
    await speak('测试文本')
  } catch (error) {
    console.log('预期的错误:', error instanceof Error ? error.message : error)
  }

  // 场景 2: 文本为空
  console.log('\n场景 2: 文本为空')
  const config = {
    accessKeyId: 'YOUR_ACCESS_KEY_ID',
    accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
    appKey: 'YOUR_APP_KEY'
  }

  const result = await textToSpeech('', config)
  console.log('空文本结果:', result)
}

// ============================================
// 主函数：运行所有示例
// ============================================

/**
 * 运行所有示例
 */
async function main() {
  console.log('小雪AI伴侣 - 语音功能使用示例\n')

  // 根据需要取消注释要运行的示例
  
  // await example1SimpleUsage()
  // await example2CustomConfig()
  // await example3IntegratedWithCoreEngine()
  // await example4DifferentVoices()
  // await example5AdjustSpeechAndPitch()
  // await example6ErrorHandling()

  console.log('\n所有示例运行完成！')
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
  main().catch(console.error)
}

// 导出示例函数，供其他模块使用
export {
  example1SimpleUsage,
  example2CustomConfig,
  example3IntegratedWithCoreEngine,
  example4DifferentVoices,
  example5AdjustSpeechAndPitch,
  example6ErrorHandling
}
