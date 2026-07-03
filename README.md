# 小雪AI伴侣

一个情感化的AI对话伴侣，支持智能回复、记忆系统、情感识别和**语音输出**功能。

## ✨ 功能特性

- 🎯 **智能回复控制** - 自动调整回复长度、语气、标点符号
- 🧠 **记忆系统** - 记住用户信息、偏好、重要事件
- 💫 **情感识别** - 识别用户输入的情感状态
- 🔊 **语音输出** - 阿里云TTS语音合成，甜美女声回复（**新功能**）
- 📈 **关系进化** - 随着对话次数增加，关系等级提升

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
copy .env.local.example .env.local
```

然后编辑 `.env.local`，填写以下必填项：

#### DeepSeek API 配置

1. 访问 https://platform.deepseek.com/
2. 注册账号并创建 API Key
3. 将 API Key 填入 `DEEPSEEK_API_KEY`

#### 阿里云 TTS 语音配置（可选，如需语音功能）

1. **获取 AccessKey**
   - 登录阿里云控制台
   - 进入"访问控制" -> "用户" -> "创建用户"
   - 勾选"编程访问"，获取 AccessKey ID 和 AccessKey Secret

2. **获取 AppKey**
   - 进入"智能语音交互"控制台
   - 创建项目，获取 AppKey

3. **填写配置**
   ```env
   ALIYUN_ACCESS_KEY_ID=你的AccessKey_ID
   ALIYUN_ACCESS_KEY_SECRET=你的AccessKey_Secret
   ALIYUN_TTS_APP_KEY=你的AppKey
   ```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 查看应用。

## 📖 使用指南

### 基础使用

```typescript
import { processAIReply } from '@/lib'

// 处理 AI 回复
const result = await processAIReply(
  '谢谢你陪我聊天！',
  {
    userId: 'user_001',
    sessionId: 'session_123',
    history: [],
    memory: {},
    relationshipLevel: 30
  },
  {
    enableVoice: false,  // 是否启用语音输出
    enableRewrite: true  // 是否应用回复重写规则
  }
)

console.log(result.text)          // 文本回复
console.log(result.voiceFilePath) // 语音文件路径（如果启用了语音）
```

### 启用语音输出

```typescript
import { speak } from '@/lib/voice-system'

// 方式 1：使用便捷函数（从环境变量读取配置）
const audioPath = await speak('你好，我是小雪！')

// 方式 2：使用核心引擎
const result = await processAIReply(
  '今天天气真好！',
  context,
  { enableVoice: true }
)
// result.voiceFilePath 包含音频文件路径
```

### 自定义语音配置

```typescript
import { textToSpeech, VoiceConfig } from '@/lib/voice-system'

const config: VoiceConfig = {
  accessKeyId: 'your_access_key_id',
  accessKeySecret: 'your_access_key_secret',
  appKey: 'your_app_key',
  voice: 'xiaoyun',     // 音色：xiaoyun（甜美）、xiaogang（男声）等
  speechRate: 0,         // 语速：-500 ~ 500
  pitchRate: 0,          // 音调：-500 ~ 500
  volume: 50             // 音量：0 ~ 100
}

const result = await textToSpeech('自定义配置测试', config)
```

## 🎤 语音功能详细说明

### 支持的音色

| 音色代码 | 描述 | 适用场景 |
|---------|------|---------|
| xiaoyun | 甜美活泼女声（默认） | 日常对话、伴侣角色 |
| xiaogang | 稳重男声 | 正式场合、助手角色 |
| xiaomei | 温柔女声 | 关怀场景 |
| xiaoyu | 知性女声 | 知识问答 |
| xiaobei | 萌妹女声 | 年轻化场景 |

### 语音参数调整

- **语速（SpeechRate）**：-500（最慢）~ 500（最快），默认 0
- **音调（PitchRate）**：-500（最低）~ 500（最高），默认 0
- **音量（Volume）**：0（最小）~ 100（最大），默认 50

### 音频文件管理

- 音频文件保存位置：`audio/` 目录
- 文件命名格式：`tts_{时间戳}_{文本MD5}.mp3`
- 文件格式：MP3，采样率 16000Hz
- 文本长度限制：单次合成最多 300 字符（超出自动截断）

## 📂 项目结构

```
├── lib/                      # 核心库
│   ├── voice-system/          # 语音系统（新增）
│   │   ├── types.ts          # 类型定义
│   │   ├── aliyun-tts.ts    # 阿里云 TTS 集成
│   │   └── index.ts          # 统一导出
│   ├── emotion/              # 情感识别系统
│   ├── memory/               # 记忆系统
│   ├── reply-controller/     # 回复控制器
│   ├── index.ts              # 核心引擎（新增）
│   └── utils.ts              # 工具函数
├── examples/                 # 示例代码
│   └── voice-usage.ts        # 语音功能示例（新增）
├── app/                      # Next.js 应用目录
├── components/               # React 组件
├── public/                   # 静态资源
├── .env.local.example        # 环境变量示例（已更新）
└── README.md                 # 本文件
```

## 🧪 测试

运行单元测试：

```bash
pnpm test
```

监听模式（开发时自动运行测试）：

```bash
pnpm test:watch
```

## 📝 示例代码

完整的语音功能示例请查看 `examples/voice-usage.ts`，包含：

1. 快速使用（从环境变量读取配置）
2. 自定义配置使用
3. 集成到核心引擎
4. 不同音色效果演示
5. 调整语速和音调
6. 错误处理和边界情况

## 🔧 配置参考

### 环境变量完整列表

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| DEEPSEEK_API_KEY | ✅ | - | DeepSeek API 密钥 |
| ALIYUN_ACCESS_KEY_ID | ⭕ | - | 阿里云 AccessKey ID |
| ALIYUN_ACCESS_KEY_SECRET | ⭕ | - | 阿里云 AccessKey Secret |
| ALIYUN_TTS_APP_KEY | ⭕ | - | 阿里云 TTS AppKey |
| ALIYUN_TTS_VOICE | ❌ | xiaoyun | TTS 音色 |
| ALIYUN_TTS_SPEECH_RATE | ❌ | 0 | 语速调整 |
| ALIYUN_TTS_PITCH_RATE | ❌ | 0 | 音调调整 |
| ALIYUN_TTS_VOLUME | ❌ | 50 | 音量调整 |

✅ = 必填，⭕ = 使用语音功能时必填，❌ = 可选

## ⚠️ 常见问题

### 1. 语音合成失败，提示"未找到语音配置"

**原因**：未设置阿里云 TTS 相关的环境变量。

**解决**：
- 确认已创建 `.env.local` 文件
- 确认已填写 `ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`ALIYUN_TTS_APP_KEY`
- 重启开发服务器

### 2. 提示"阿里云 API 错误"

**原因**：阿里云密钥配置错误或权限不足。

**解决**：
- 检查 AccessKey 是否正确
- 确认阿里云账号已开通"智能语音交互"服务
- 确认 AppKey 对应的项目已启用 TTS 功能

### 3. 音频文件未生成

**原因**：可能是文件系统权限问题或磁盘空间不足。

**解决**：
- 确认应用对 `audio/` 目录有写权限
- 检查磁盘空间
- 查看控制台错误日志

## 📄 开源协议

MIT License

## 🙏 致谢

- [阿里云智能语音交互](https://www.aliyun.com/product/nls) - TTS 语音合成服务
- [DeepSeek](https://www.deepseek.com/) - AI 对话能力
- [Next.js](https://nextjs.org/) - React 应用框架

---

**开发者笔记**：

- 音频文件会占用存储空间，建议定期清理 `audio/` 目录
- 阿里云 TTS 按调用次数计费，请注意使用量
- 生产环境建议使用阿里云 STS 临时凭证，避免泄露 AccessKey Secret
