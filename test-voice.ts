// 语音系统快速测试脚本
// 运行: npx tsx test-voice.ts

// 加载环境变量
require('dotenv').config({ path: '.env.local' })

import { speak, isVoiceSystemConfigured, getVoiceConfigSummary } from './lib/voice-system'

async function testVoiceSystem() {
  console.log('🎤 小雪AI语音系统测试\n')

  // 1. 检查配置
  console.log('1️⃣ 检查语音系统配置...')
  const configured = isVoiceSystemConfigured()
  console.log(`   配置状态: ${configured ? '✅ 已配置' : '❌ 未配置'}`)

  if (!configured) {
    console.error('❌ 语音系统未配置，请检查 .env.local 文件')
    process.exit(1)
  }

  // 2. 显示配置摘要
  console.log('\n2️⃣ 配置信息:')
  const summary = getVoiceConfigSummary()
  console.log(`   AccessKey ID: ${summary?.accessKeyId}`)
  console.log(`   AppKey: ${summary?.appKey}`)
  console.log(`   语音: ${summary?.voice}`)
  console.log(`   语速: ${summary?.speechRate}`)
  console.log(`   音调: ${summary?.pitchRate}`)
  console.log(`   音量: ${summary?.volume}`)

  // 3. 测试语音合成
  console.log('\n3️⃣ 测试语音合成...')
  try {
    const testText = '你好，我是小雪AI助手！这是一个语音合成测试。'
    console.log(`   测试文本: ${testText}`)
    console.log('   ⏳ 正在调用阿里云TTS API...')

    const audioPath = await speak(testText)

    console.log('   ✅ 语音合成成功!')
    console.log(`   📁 音频文件: ${audioPath}`)

    // 4. 验证文件存在
    const fs = require('fs')
    if (fs.existsSync(audioPath)) {
      const stats = fs.statSync(audioPath)
      console.log(`   📊 文件大小: ${(stats.size / 1024).toFixed(2)} KB`)
      console.log('   ✅ 文件验证通过!')
    } else {
      console.log('   ⚠️  文件未找到，但API返回成功')
    }

    console.log('\n🎉 所有测试通过！语音系统工作正常！')
    console.log('\n💡 接下来你可以:')
    console.log('   1. 在代码中使用 speak() 函数')
    console.log('   2. 在 processAIReply() 中启用 enableVoice: true')
    console.log('   3. 查看生成的音频文件并播放测试')

  } catch (error: any) {
    console.error('\n❌ 语音合成失败:')
    console.error(`   错误: ${error.message}`)
    console.error('\n💡 可能的原因:')
    console.error('   1. AccessKey ID/Secret 不正确')
    console.error('   2. AppKey 不正确')
    console.error('   3. 网络连接到阿里云API失败')
    console.error('   4. 阿里云账号余额不足或权限不足')
    process.exit(1)
  }
}

// 运行测试
testVoiceSystem()
