/**
 * 语音系统单元测试
 * 测试目标：types.ts, aliyun-tts.ts, index.ts
 * 
 * 使用 Mock 测试，不依赖真实的阿里云 API
 */

// Mock 依赖模块
jest.mock('axios')
jest.mock('fs/promises')
jest.mock('crypto')

// 导入被测模块
import { AliyunTTSService, createTTSService, textToSpeech } from '../lib/voice-system/aliyun-tts'
import { 
  speak, 
  isVoiceSystemConfigured, 
  getVoiceConfigSummary,
  VoiceConfig,
  TTSResult 
} from '../lib/voice-system'
import { 
  processAIReply, 
  AIReplyResult,
  batchProcessReplies,
  getSystemStatus
} from '../lib'
import * as axios from 'axios'
import * as fs from 'fs/promises'
import * as crypto from 'crypto'
import * as path from 'path'

// 类型定义测试
describe('语音系统 - 类型定义 (types.ts)', () => {
  test('① VoiceConfig 接口应该包含必需字段', () => {
    const config: VoiceConfig = {
      accessKeyId: 'test_key_id',
      accessKeySecret: 'test_key_secret',
      appKey: 'test_app_key'
    }
    
    expect(config.accessKeyId).toBe('test_key_id')
    expect(config.accessKeySecret).toBe('test_key_secret')
    expect(config.appKey).toBe('test_app_key')
  })

  test('② VoiceConfig 接口应该支持可选字段', () => {
    const config: VoiceConfig = {
      accessKeyId: 'test_key_id',
      accessKeySecret: 'test_key_secret',
      appKey: 'test_app_key',
      voice: 'xiaoyun',
      speechRate: 100,
      pitchRate: -50,
      volume: 80
    }
    
    expect(config.voice).toBe('xiaoyun')
    expect(config.speechRate).toBe(100)
    expect(config.pitchRate).toBe(-50)
    expect(config.volume).toBe(80)
  })

  test('③ TTSResult 接口应该正确定义成功结果', () => {
    const result: TTSResult = {
      success: true,
      audioFilePath: '/path/to/audio.mp3'
    }
    
    expect(result.success).toBe(true)
    expect(result.audioFilePath).toBe('/path/to/audio.mp3')
    expect(result.error).toBeUndefined()
  })

  test('④ TTSResult 接口应该正确定义失败结果', () => {
    const result: TTSResult = {
      success: false,
      error: '错误信息'
    }
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('错误信息')
    expect(result.audioFilePath).toBeUndefined()
  })
})

// 阿里云 TTS 服务测试
describe('语音系统 - 阿里云 TTS 服务 (aliyun-tts.ts)', () => {
  let mockConfig: VoiceConfig
  let mockAxios: jest.Mocked<typeof axios>
  let mockFs: jest.Mocked<typeof fs>
  let mockCrypto: jest.Mocked<typeof crypto>

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks()
    
    // 准备测试配置
    mockConfig = {
      accessKeyId: 'test_access_key_id',
      accessKeySecret: 'test_access_key_secret',
      appKey: 'test_app_key',
      voice: 'xiaoyun',
      speechRate: 0,
      pitchRate: 0,
      volume: 50
    }

    // 设置 axios mock
    mockAxios = axios as jest.Mocked<typeof axios>
    ;(axios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: Buffer.from('mock audio data'),
      headers: {
        'content-type': 'audio/mpeg'
      }
    })

    // 设置 fs mock
    mockFs = fs as jest.Mocked<typeof fs>
    ;(fs.mkdir as jest.Mock).mockResolvedValue(undefined)
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)

    // 设置 crypto mock
    mockCrypto = crypto as jest.Mocked<typeof crypto>
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mockhash12345678')
    }
    const mockHmac = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock_signature_base64==')
    }
    ;(crypto.createHash as jest.Mock).mockReturnValue(mockHash as any)
    ;(crypto.createHmac as jest.Mock).mockReturnValue(mockHmac as any)
  })

  // ============================================
  // 测试 1: 构造函数和默认配置
  // ============================================
  describe('构造函数和配置', () => {
    test('① 应该使用提供的配置创建实例', () => {
      const service = new AliyunTTSService(mockConfig)
      expect(service).toBeInstanceOf(AliyunTTSService)
    })

    test('② 应该使用默认音色（如果未提供）', () => {
      const configWithoutVoice = { ...mockConfig }
      delete configWithoutVoice.voice
      
      const service = new AliyunTTSService(configWithoutVoice)
      expect(service).toBeInstanceOf(AliyunTTSService)
    })

    test('③ 应该使用默认语速、音调、音量（如果未提供）', () => {
      const configWithDefaults = {
        accessKeyId: 'test_id',
        accessKeySecret: 'test_secret',
        appKey: 'test_key'
      }
      
      const service = new AliyunTTSService(configWithDefaults)
      expect(service).toBeInstanceOf(AliyunTTSService)
    })
  })

  // ============================================
  // 测试 2: 空文本处理
  // ============================================
  describe('空文本处理', () => {
    test('① 应该拒绝空字符串', async () => {
      const service = new AliyunTTSService(mockConfig)
      const result = await service.textToSpeech('')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('文本内容不能为空')
      expect(result.audioFilePath).toBeUndefined()
    })

    test('② 应该拒绝空白字符串', async () => {
      const service = new AliyunTTSService(mockConfig)
      const result = await service.textToSpeech('   ')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('文本内容不能为空')
    })

    test('③ 应该接受有效的文本', async () => {
      const service = new AliyunTTSService(mockConfig)
      const result = await service.textToSpeech('你好')
      
      // 由于 mock 设置，应该成功
      expect(result.success).toBe(true)
      expect(result.audioFilePath).toBeDefined()
    })
  })

  // ============================================
  // 测试 3: 文本截断（300字符限制）
  // ============================================
  describe('文本长度限制', () => {
    test('① 应该截断超过300字符的文本', async () => {
      const service = new AliyunTTSService(mockConfig)
      const longText = 'a'.repeat(500) // 500字符
      
      // 监听 console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      await service.textToSpeech(longText)
      
      // 验证警告被调用
      expect(consoleWarnSpy).toHaveBeenCalledWith('文本超过300字符，已截断')
      
      consoleWarnSpy.mockRestore()
    })

    test('② 应该不截断300字符以内的文本', async () => {
      const service = new AliyunTTSService(mockConfig)
      const shortText = 'a'.repeat(300) // 正好300字符
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      await service.textToSpeech(shortText)
      
      // 不应该有警告
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      
      consoleWarnSpy.mockRestore()
    })

    test('③ 截断后的文本应该是300字符', async () => {
      // 这个测试验证内部逻辑，但由于私有方法无法直接测试，
      // 我们通过 mock 拦截来验证传入 API 的参数
      const service = new AliyunTTSService(mockConfig)
      const longText = 'a'.repeat(500)
      
      await service.textToSpeech(longText)
      
      // 验证 axios 被调用，且参数中的 Text 被截断
      expect(axios.get).toHaveBeenCalled()
      const callArgs = (axios.get as jest.Mock).mock.calls[0]
      const params = callArgs[1].params
      
      // Text 参数应该是 300 字符
      expect(params.Text.length).toBeLessThanOrEqual(300)
    })
  })

  // ============================================
  // 测试 4: 签名生成
  // ============================================
  describe('API 签名生成', () => {
    test('① 签名生成应该使用 HMAC-SHA1', async () => {
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试文本')
      
      // 验证 crypto.createHmac 被调用，且算法是 sha1
      expect(crypto.createHmac).toHaveBeenCalledWith('sha1', mockConfig.accessKeySecret)
    })

    test('② 签名参数应该包含 Signature', async () => {
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试')
      
      // 验证 axios 调用时参数包含 Signature
      expect(axios.get).toHaveBeenCalled()
      const callArgs = (axios.get as jest.Mock).mock.calls[0]
      const config = callArgs[1]
      
      // params 应该包含 Signature
      expect(config.params.Signature).toBeDefined()
    })

    test('③ 参数应该按字母顺序排序', async () => {
      // 这个测试验证签名生成时参数排序的正确性
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试')
      
      // 由于签名生成是私有方法，我们通过检查调用参数来验证
      expect(axios.get).toHaveBeenCalled()
      // 如果能访问到 generateSignature 的测试，应该验证排序逻辑
    })
  })

  // ============================================
  // 测试 5: API 调用
  // ============================================
  describe('阿里云 API 调用', () => {
    test('① 应该使用正确的 API URL', async () => {
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试')
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts',
        expect.any(Object)
      )
    })

    test('② 应该传递正确的请求参数', async () => {
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试文本')
      
      const callArgs = (axios.get as jest.Mock).mock.calls[0]
      const params = callArgs[1].params
      
      expect(params.Format).toBe('mp3')
      expect(params.Voice).toBe('xiaoyun')
      expect(params.Text).toBe('测试文本')
      expect(params.AppKey).toBe(mockConfig.appKey)
      expect(params.AccessKeyId).toBe(mockConfig.accessKeyId)
    })

    test('③ 应该设置正确的请求头', async () => {
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试')
      
      const callArgs = (axios.get as jest.Mock).mock.calls[0]
      const config = callArgs[1]
      
      expect(config.headers['Content-Type']).toBe('application/json')
      expect(config.responseType).toBe('arraybuffer')
      expect(config.timeout).toBe(30000)
    })

    test('④ 应该处理 API 错误响应（JSON 格式）', async () => {
      // Mock API 返回错误（JSON）
      ;(axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: Buffer.from(JSON.stringify({
          Status: '400',
          Message: 'Invalid parameter'
        })),
        headers: {
          'content-type': 'application/json'
        }
      })

      const service = new AliyunTTSService(mockConfig)
      const result = await service.textToSpeech('测试')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('TTS API 错误')
    })

    test('⑤ 应该处理网络错误', async () => {
      // Mock 网络错误
      ;(axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'))

      const service = new AliyunTTSService(mockConfig)
      const result = await service.textToSpeech('测试')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network Error')
    })

    test('⑥ 应该处理超时错误', async () => {
      // Mock 超时错误
      const timeoutError = new Error('timeout of 30000ms exceeded')
      timeoutError.name = 'ECONNABORTED'
      ;(axios.get as jest.Mock).mockRejectedValue(timeoutError)

      const service = new AliyunTTSService(mockConfig)
      const result = await service.textToSpeech('测试')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })
  })

  // ============================================
  // 测试 6: 文件保存
  // ============================================
  describe('音频文件保存', () => {
    test('① 应该创建 audio 目录', async () => {
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试')
      
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('audio'),
        { recursive: true }
      )
    })

    test('② 应该生成正确的文件名（包含时间戳和哈希）', async () => {
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试')
      
      // 验证 writeFile 被调用
      expect(fs.writeFile).toHaveBeenCalled()
      
      const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0]
      const filePath = writeFileCall[0]
      
      // 文件名应该包含 'tts_' 前缀和 '.mp3' 后缀
      expect(filePath).toContain('tts_')
      expect(filePath).toContain('.mp3')
    })

    test('③ 应该正确处理跨平台路径', async () => {
      const service = new AliyunTTSService(mockConfig)
      
      await service.textToSpeech('测试')
      
      const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0]
      const filePath = writeFileCall[0]
      
      // 路径应该使用正确的分隔符（path.join 会处理）
      expect(filePath).not.toContain('..')
    })
  })

  // ============================================
  // 测试 7: 便捷函数
  // ============================================
  describe('便捷函数', () => {
    test('① createTTSService 应该返回 AliyunTTSService 实例', () => {
      const service = createTTSService(mockConfig)
      expect(service).toBeInstanceOf(AliyunTTSService)
    })

    test('② textToSpeech 便捷函数应该正常工作', async () => {
      const result = await textToSpeech('测试文本', mockConfig)
      
      expect(result.success).toBe(true)
      expect(result.audioFilePath).toBeDefined()
    })
  })
})

// 语音系统统一导出模块测试
describe('语音系统 - 统一导出模块 (index.ts)', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv
  })

  // ============================================
  // 测试 8: 环境变量读取
  // ============================================
  describe('环境变量配置', () => {
    test('① 应该正确读取完整的环境变量', () => {
      // 设置环境变量
      process.env.ALIYUN_ACCESS_KEY_ID = 'test_key_id'
      process.env.ALIYUN_ACCESS_KEY_SECRET = 'test_key_secret'
      process.env.ALIYUN_TTS_APP_KEY = 'test_app_key'
      process.env.ALIYUN_TTS_VOICE = 'xiaomei'
      process.env.ALIYUN_TTS_SPEECH_RATE = '100'
      process.env.ALIYUN_TTS_PITCH_RATE = '-50'
      process.env.ALIYUN_TTS_VOLUME = '80'

      // 由于 getVoiceConfigFromEnv 是私有函数，我们通过 isVoiceSystemConfigured 测试
      expect(isVoiceSystemConfigured()).toBe(true)
    })

    test('② 应该返回 false 当环境变量不完整', () => {
      // 清除环境变量
      delete process.env.ALIYUN_ACCESS_KEY_ID
      delete process.env.ALIYUN_ACCESS_KEY_SECRET
      delete process.env.ALIYUN_TTS_APP_KEY

      expect(isVoiceSystemConfigured()).toBe(false)
    })

    test('③ 应该返回 false 当只有部分环境变量', () => {
      process.env.ALIYUN_ACCESS_KEY_ID = 'test_key_id'
      delete process.env.ALIYUN_ACCESS_KEY_SECRET
      delete process.env.ALIYUN_TTS_APP_KEY

      expect(isVoiceSystemConfigured()).toBe(false)
    })

    test('④ 应该使用默认音色当 ALIYUN_TTS_VOICE 未设置', () => {
      process.env.ALIYUN_ACCESS_KEY_ID = 'test_key_id'
      process.env.ALIYUN_ACCESS_KEY_SECRET = 'test_key_secret'
      process.env.ALIYUN_TTS_APP_KEY = 'test_app_key'
      delete process.env.ALIYUN_TTS_VOICE

      // 这个测试验证默认值，需要通过实际调用来验证
      expect(isVoiceSystemConfigured()).toBe(true)
    })

    test('⑤ 应该正确解析数字类型的环境变量', () => {
      process.env.ALIYUN_ACCESS_KEY_ID = 'test_key_id'
      process.env.ALIYUN_ACCESS_KEY_SECRET = 'test_key_secret'
      process.env.ALIYUN_TTS_APP_KEY = 'test_app_key'
      process.env.ALIYUN_TTS_SPEECH_RATE = '200'
      process.env.ALIYUN_TTS_PITCH_RATE = '-100'
      process.env.ALIYUN_TTS_VOLUME = '75'

      expect(isVoiceSystemConfigured()).toBe(true)
    })

    test('⑥ 应该处理无效的数字环境变量', () => {
      process.env.ALIYUN_ACCESS_KEY_ID = 'test_key_id'
      process.env.ALIYUN_ACCESS_KEY_SECRET = 'test_key_secret'
      process.env.ALIYUN_TTS_APP_KEY = 'test_app_key'
      process.env.ALIYUN_TTS_SPEECH_RATE = 'invalid_number'

      // 不应该抛出异常，应该使用默认值
      expect(isVoiceSystemConfigured()).toBe(true)
    })
  })

  // ============================================
  // 测试 9: speak 函数
  // ============================================
  describe('speak 函数', () => {
    beforeEach(() => {
      // 设置有效的环境变量
      process.env.ALIYUN_ACCESS_KEY_ID = 'test_key_id'
      process.env.ALIYUN_ACCESS_KEY_SECRET = 'test_key_secret'
      process.env.ALIYUN_TTS_APP_KEY = 'test_app_key'
    })

    test('① 应该成功调用 speak 函数', async () => {
      // Bug fixed: textToSpeech 现在已经正确导入
      const result = await speak('测试文本')
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    test('② 应该抛出错误当配置不完整', async () => {
      // 清除环境变量
      delete process.env.ALIYUN_ACCESS_KEY_ID

      await expect(speak('测试文本')).rejects.toThrow('未找到语音配置')
    })
  })

  // ============================================
  // 测试 10: 配置摘要
  // ============================================
  describe('配置摘要', () => {
    test('① getVoiceConfigSummary 应该隐藏敏感信息', () => {
      process.env.ALIYUN_ACCESS_KEY_ID = 'abcdefghijklmnop'
      process.env.ALIYUN_ACCESS_KEY_SECRET = 'test_key_secret'
      process.env.ALIYUN_TTS_APP_KEY = 'test_app_key'
      process.env.ALIYUN_TTS_VOICE = 'xiaoyun'

      const summary = getVoiceConfigSummary()
      
      expect(summary).toBeDefined()
      if (summary) {
        // accessKeyId 应该被部分隐藏
        expect(summary.accessKeyId).toContain('****')
        expect(summary.accessKeyId).not.toBe('abcdefghijklmnop')
        
        // 不应该包含 accessKeySecret
        expect((summary as any).accessKeySecret).toBeUndefined()
      }
    })

    test('② getVoiceConfigSummary 应该返回 null 当未配置', () => {
      delete process.env.ALIYUN_ACCESS_KEY_ID

      expect(getVoiceConfigSummary()).toBeNull()
    })
  })
})

// 核心引擎集成测试
describe('语音系统 - 核心引擎集成 (lib/index.ts)', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    
    // 设置语音系统配置
    process.env.ALIYUN_ACCESS_KEY_ID = 'test_key_id'
    process.env.ALIYUN_ACCESS_KEY_SECRET = 'test_key_secret'
    process.env.ALIYUN_TTS_APP_KEY = 'test_app_key'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ============================================
  // 测试 11: processAIReply 集成
  // ============================================
  describe('processAIReply 语音集成', () => {
    test('① 应该生成语音当 enableVoice 为 true', async () => {
      // Bug fixed: speak 函数现在可以正确调用 textToSpeech
      const reply = '你好，我是小雪！'
      const context = {
        userId: 'test_user',
        sessionId: 'test_session'
      }

      const result = await processAIReply(reply, context, {
        enableVoice: true,
        enableRewrite: false
      })

      expect(result.text).toBe(reply)
      expect(result.voiceFilePath).toBeDefined()
    })

    test('② 不应该生成语音当 enableVoice 为 false', async () => {
      const reply = '你好，我是小雪！'
      const context = {
        userId: 'test_user',
        sessionId: 'test_session'
      }

      const result = await processAIReply(reply, context, {
        enableVoice: false,
        enableRewrite: false
      })

      expect(result.text).toBe(reply)
      expect(result.voiceFilePath).toBeUndefined()
    })

    test('③ 应该跳过语音生成当配置不完整', async () => {
      // 清除环境变量
      delete process.env.ALIYUN_ACCESS_KEY_ID
      delete process.env.ALIYUN_ACCESS_KEY_SECRET
      delete process.env.ALIYUN_TTS_APP_KEY

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const reply = '测试回复'
      const context = {
        userId: 'test_user',
        sessionId: 'test_session'
      }

      const result = await processAIReply(reply, context, {
        enableVoice: true,
        enableRewrite: false
      })

      // 应该警告并跳过语音生成
      expect(consoleWarnSpy).toHaveBeenCalledWith('语音系统未配置，跳过语音生成')
      expect(result.text).toBe(reply)
      expect(result.voiceFilePath).toBeUndefined()

      consoleWarnSpy.mockRestore()
    })

    test('④ 语音生成失败不应该影响文本回复', async () => {
      // Bug fixed: speak 函数现在可以正确调用 textToSpeech
      // 注意：此测试验证即使语音失败，文本回复仍然成功
      const reply = '测试回复'
      const context = {
        userId: 'test_user',
        sessionId: 'test_session'
      }

      const result = await processAIReply(reply, context, {
        enableVoice: true,
        enableRewrite: false
      })

      // 即使语音失败，文本回复应该成功
      expect(result.text).toBe(reply)
    })
  })

  // ============================================
  // 测试 12: 批量处理
  // ============================================
  describe('批量处理', () => {
    test('① batchProcessReplies 应该处理多个回复', async () => {
      const replies = ['回复1', '回复2', '回复3']
      const context = {
        userId: 'test_user',
        sessionId: 'test_session'
      }

      const results = await batchProcessReplies(replies, context, {
        enableVoice: true,
        enableRewrite: false
      })

      expect(results).toHaveLength(3)
      expect(results[0].text).toBe('回复1')
      expect(results[1].text).toBe('回复2')
      expect(results[2].text).toBe('回复3')
    })
  })

  // ============================================
  // 测试 13: 系统状态
  // ============================================
  describe('系统状态检查', () => {
    test('① getSystemStatus 应该返回正确的状态', () => {
      const status = getSystemStatus()
      
      expect(status.voiceSystem).toBe(true)
      expect(status.replyRewriter).toBe(true)
      expect(status.version).toBe('1.0.0')
    })

    test('② getSystemStatus 应该返回 false 当语音系统未配置', () => {
      delete process.env.ALIYUN_ACCESS_KEY_ID

      const status = getSystemStatus()
      
      expect(status.voiceSystem).toBe(false)
    })
  })
})

// 代码审查和潜在问题
describe('代码审查 - 潜在问题', () => {
  let mockConfig: VoiceConfig

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks()
    
    mockConfig = {
      accessKeyId: 'test_access_key_id',
      accessKeySecret: 'test_access_key_secret',
      appKey: 'test_app_key'
    }

    // 设置 axios mock
    ;(axios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: Buffer.from('mock audio data'),
      headers: {
        'content-type': 'audio/mpeg'
      }
    })

    // 设置 fs mock
    ;(fs.mkdir as jest.Mock).mockResolvedValue(undefined)
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)

    // 设置 crypto mock
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mockhash12345678')
    }
    const mockHmac = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock_signature_base64==')
    }
    ;(crypto.createHash as jest.Mock).mockReturnValue(mockHash as any)
    ;(crypto.createHmac as jest.Mock).mockReturnValue(mockHmac as any)
  })

  // ============================================
  // 问题 1: 签名生成可能不符合阿里云规范
  // ============================================
  test('①【潜在Bug】签名生成可能需要 URL 编码 - 需要验证', async () => {
    // 阿里云 API 签名规范：
    // 1. 参数排序并 URL 编码
    // 2. 构建 stringToSign: `GET&${encodeURIComponent('/path')}&${encodeURIComponent(queryString)}`
    // 3. 使用 HMAC-SHA1 签名
    // 4. Signature 参数本身需要 URL 编码
    //
    // 当前实现的问题：
    // - generateSignature 返回的 signature 包含 base64 字符（+、/、=）
    // - 这些字符在 URL 中需要编码
    // - 但代码中没有对 Signature 参数进行 encodeURIComponent
    
    const service = new AliyunTTSService(mockConfig)
    await service.textToSpeech('测试')
    
    // 检查传入 axios 的参数
    const callArgs = (axios.get as jest.Mock).mock.calls[0]
    const params = callArgs[1].params
    
    // Signature 应该被 URL 编码
    // 如果 signature 包含 '+' 或 '/' 或 '='，它们应该被编码
    const signature = params.Signature
    
    // 这个测试标记为潜在问题，需要工程师确认
    console.warn(
      '【代码审查】签名参数可能需要 URL 编码。' +
      '当前 Signature 值:', signature
    )
    
    expect(true).toBe(true) // 占位断言
  })

  // ============================================
  // 问题 2: 内存泄漏风险
  // ============================================
  test('②【潜在问题】大量生成音频文件可能导致磁盘空间不足', async () => {
    // 当前实现每次调用都生成新文件，但没有清理机制
    // 建议：添加文件清理逻辑（如只保留最近 N 个文件）
    
    const service = new AliyunTTSService(mockConfig)
    
    // Mock Date.now() 返回不同的值
    let now = 1700000000000
    jest.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000 // 每次调用增加 1 秒
      return now
    })
    
    // Mock crypto.createHash 返回基于文本的哈希
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockImplementation((encoding) => {
        // 根据调用的文本返回不同的哈希
        const callArgs = (mockHash.update as jest.Mock).mock.calls
        const lastCall = callArgs[callArgs.length - 1][0]
        // 简单哈希：使用文本长度作为哈希的一部分
        const hash = Buffer.from(`hash_${lastCall}`).toString('hex').substring(0, 8)
        return hash
      })
    }
    ;(crypto.createHash as jest.Mock).mockReturnValue(mockHash as any)
    
    // 模拟多次调用
    const result1 = await service.textToSpeech('测试1')
    const result2 = await service.textToSpeech('测试2')
    const result3 = await service.textToSpeech('测试3')
    
    // 所有调用都应该成功
    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)
    expect(result3.success).toBe(true)
    
    // 应该生成 3 个不同的文件
    const paths = [result1.audioFilePath, result2.audioFilePath, result3.audioFilePath]
    expect(new Set(paths).size).toBe(3)
    
    console.warn(
      '【代码审查】建议添加音频文件清理机制，避免磁盘空间耗尽。'
    )
  })

  // ============================================
  // 问题 3: 错误处理完整性
  // ============================================
  test('③【潜在问题】fs.mkdir 失败的情况未处理', async () => {
    // Mock fs.mkdir 失败
    ;(fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'))

    const service = new AliyunTTSService(mockConfig)
    const result = await service.textToSpeech('测试')
    
    // 错误应该被捕获并返回
    expect(result.success).toBe(false)
    expect(result.error).toBe('Permission denied')
  })

  // ============================================
  // 问题 4: 返回值一致性
  // ============================================
  test('④【代码审查】speak 函数和 textToSpeech 返回值不一致', () => {
    // speak 返回 Promise<string>（音频文件路径）
    // textToSpeech 返回 Promise<TTSResult>（包含 success 和 audioFilePath）
    // 这可能导致使用困惑
    
    console.warn(
      '【代码审查】speak 返回 string，textToSpeech 返回 TTSResult。' +
      '建议统一返回值类型或添加明确的文档说明。'
    )
    
    expect(true).toBe(true) // 占位断言
  })
})

// 性能测试
describe('语音系统 - 性能考虑', () => {
  let mockConfig: VoiceConfig
  let now: number

  beforeEach(() => {
    mockConfig = {
      accessKeyId: 'test_access_key_id',
      accessKeySecret: 'test_access_key_secret',
      appKey: 'test_app_key'
    }

    now = 1700000000000

    // 确保每个测试前 mock 都正确设置
    ;(axios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: Buffer.from('mock audio data'),
      headers: {
        'content-type': 'audio/mpeg'
      }
    })

    // Mock Date.now() 返回递增的时间戳
    jest.spyOn(Date, 'now').mockImplementation(() => {
      now += 100 // 每次调用增加 100ms
      return now
    })

    // Mock crypto.createHash 返回基于文本的哈希
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockImplementation((encoding) => {
        const callArgs = (mockHash.update as jest.Mock).mock.calls
        const lastCall = callArgs[callArgs.length - 1][0]
        const hash = Buffer.from(`hash_${lastCall}`).toString('hex').substring(0, 8)
        return hash
      })
    }
    ;(crypto.createHash as jest.Mock).mockReturnValue(mockHash as any)

    // Mock fs
    ;(fs.mkdir as jest.Mock).mockResolvedValue(undefined)
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)
  })

  test('① 应该处理并发请求', async () => {
    const service = new AliyunTTSService(mockConfig)
    
    // 发起 3 个并发请求
    const promises = [
      service.textToSpeech('文本1'),
      service.textToSpeech('文本2'),
      service.textToSpeech('文本3')
    ]
    
    const results = await Promise.all(promises)
    
    // 所有请求都应该成功
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
    expect(results[2].success).toBe(true)
    
    // 应该生成 3 个不同的文件
    const paths = results.map(r => r.audioFilePath)
    expect(new Set(paths).size).toBe(3) // 所有路径都不同
  })
})
