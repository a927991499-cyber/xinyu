"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Send, Image, Mic, X } from "lucide-react"

interface ChatInputProps {
  onSend?: (text: string) => void
  onRequestImage?: () => void
  isGeneratingImage?: boolean
  onVoiceMessage?: (audioBlob: Blob, duration: number) => void
}

export function ChatInput({ onSend, onRequestImage, isGeneratingImage, onVoiceMessage }: ChatInputProps) {
  const [text, setText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [cancelHint, setCancelHint] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const touchStartY = useRef<number>(0)
  const hasText = text.trim().length > 0

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // 自动选择合适的音频格式
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg'
        } else {
          mimeType = ''
        }
      }
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
        
        if (audioBlob.size === 0) {
          setIsRecording(false)
          setRecordingTime(0)
          return
        }
        
        // 回调父组件（显示语音消息 + 后台识别）
        if (onVoiceMessage) {
          onVoiceMessage(audioBlob, recordingTime)
        }
        
        // 停止所有音频轨道
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        
        setIsRecording(false)
        setRecordingTime(0)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setCancelHint(false)
      
      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error("无法访问麦克风:", error)
      alert("无法访问麦克风，请检查权限设置")
    }
  }, [onVoiceMessage, recordingTime])

  // 停止录音（发送）
  const stopRecordingAndSend = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  // 停止录音（取消）
  const stopRecordingAndCancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // 取消时，onstop 里不回调父组件
      mediaRecorderRef.current.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        setIsRecording(false)
        setRecordingTime(0)
      }
      mediaRecorderRef.current.stop()
    } else {
      setIsRecording(false)
      setRecordingTime(0)
    }
  }, [])

  // 指针按下（统一处理鼠标和触摸）
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    touchStartY.current = e.clientY
    
    // 捕获指针，确保后续事件都在这个按钮上触发
    if (e.target instanceof HTMLElement) {
      e.target.setPointerCapture(e.pointerId)
    }
    
    startRecording()
  }, [startRecording])

  // 指针移动（检测上滑取消）
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isRecording) return
    
    const diffY = touchStartY.current - e.clientY
    
    // 上滑超过50px，显示取消提示
    if (diffY > 50) {
      setCancelHint(true)
    } else {
      setCancelHint(false)
    }
  }, [isRecording])

  // 指针松开
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isRecording) return
    
    if (cancelHint) {
      // 取消录音
      stopRecordingAndCancel()
    } else {
      // 发送录音
      stopRecordingAndSend()
    }
  }, [isRecording, cancelHint, stopRecordingAndCancel, stopRecordingAndSend])

  // 指针取消（离开按钮区域）
  const handlePointerCancel = useCallback(() => {
    if (isRecording) {
      stopRecordingAndCancel()
    }
  }, [isRecording, stopRecordingAndCancel])

  function handleSend() {
    if (!hasText) return
    onSend?.(text.trim())
    setText("")
  }

  return (
    <div className="relative z-10 px-4 pb-4 pt-2">
      {/* 录音状态提示（顶部显示） */}
      {isRecording && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-center gap-4 px-4 py-3">
            {/* 波形动画 */}
            <div className="flex items-center gap-0.5">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-red-500 animate-pulse"
                  style={{
                    height: `${Math.random() * 20 + 8}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            
            {/* 计时器 */}
            <div className="text-lg font-bold text-foreground tabular-nums">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </div>
            
            {/* 取消提示 */}
            <div className={`text-sm ${cancelHint ? "text-red-500" : "text-muted-foreground"}`}>
              {cancelHint ? "松开取消" : "松开发送，上滑取消"}
            </div>
          </div>
        </div>
      )}

      {/* 第1行：功能按钮 */}
      <div className="mb-2 flex items-center px-1">
        {/* 📷 拍小雪 */}
        <div className="relative inline-flex shrink-0">
          <button
            type="button"
            aria-label="拍小雪"
            draggable="false"
            onClick={onRequestImage}
            onContextMenu={(e) => e.preventDefault()}
            disabled={isGeneratingImage}
            className="flex items-center gap-1.5 rounded-full bg-primary/80 px-3 py-1.5 text-[13px] text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none"
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              touchAction: 'none',
            } as React.CSSProperties}
          >
            <Image className="size-3.5" />
            <span>拍小雪</span>
          </button>
          {/* 发图中... 浮动提示 */}
          {isGeneratingImage && (
            <div className="absolute left-1/2 -top-7 -translate-x-1/2 whitespace-nowrap animate-pulse rounded bg-black/70 px-2 py-0.5 text-xs text-white">
              发图中...
            </div>
          )}
        </div>
      </div>

      {/* 第2行：语音按钮 + 输入框 + 发送按钮 */}
      <div className="flex items-center gap-3 rounded-full bg-card px-4 py-2.5 shadow-sm">
        {/* 🎤 语音输入（长按录音） */}
        <button
          type="button"
          aria-label="语音输入"
          draggable="false"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full shadow-sm transition-all duration-200 select-none ${
            isRecording 
              ? "bg-red-500 text-white scale-105 animate-pulse" 
              : "bg-card/80 text-foreground active:scale-90"
          }`}
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'none',
          } as React.CSSProperties}
        >
          <Mic className="size-4" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend()
          }}
          placeholder="和小雪聊点什么吧…"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <button
          type="button"
          aria-label="发送"
          onClick={handleSend}
          disabled={!hasText}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}
