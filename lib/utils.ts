import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Emotion } from '@/lib/emotion'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 情绪 → 头像图片映射
 * 5张图覆盖9种情绪，无直接映射的用最接近的
 */
const EMOTION_AVATAR_MAP: Record<Emotion, string> = {
  happy:    '/avatar-happy.png',   // 开心
  cry:      '/avatar-cry.png',     // 哭
  shy:      '/avatar-shy.png',     // 撒娇 → 害羞
  care:     '/avatar-shy.png',     // 关心 → 撒娇(温柔)
  sad:      '/avatar-sad.png',     // 委屈 → 难过
  miss:     '/avatar-sad.png',     // 想念 → 委屈(难过)
  idle:     '/avatar-idle.png',    // 生气图当默认态(有情绪感的默认)
  sleep:    '/avatar-idle.png',    // 睡眠 → 默认
  thinking: '/avatar-idle.png',    // 思考 → 默认
}

/** 根据情绪获取对应头像路径 */
export function getEmotionAvatar(emotion?: Emotion | string | null): string {
  if (!emotion) return '/avatar-happy.png'
  return EMOTION_AVATAR_MAP[emotion as Emotion] || '/avatar-happy.png'
}
