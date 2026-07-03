/**
 * 短信验证码缓存（共享模块）
 * 
 * 注意：生产环境需要用Redis或其他共享存储
 */

// 验证码缓存
const codeCache = new Map<string, { code: string; expire: number }>()

/**
 * 保存验证码
 */
export function saveCode(phone: string, code: string, ttl: number = 5 * 60 * 1000): void {
  codeCache.set(phone, {
    code,
    expire: Date.now() + ttl
  })
}

/**
 * 验证验证码
 */
export function verifyCode(phone: string, code: string): boolean {
  const cached = codeCache.get(phone)
  if (!cached || cached.expire < Date.now()) {
    return false // 验证码已过期
  }

  if (cached.code !== code) {
    return false // 验证码错误
  }

  // 验证成功，删除缓存
  codeCache.delete(phone)
  return true
}

/**
 * 获取验证码（用于调试）
 */
export function getCode(phone: string): string | null {
  const cached = codeCache.get(phone)
  if (!cached || cached.expire < Date.now()) {
    return null
  }
  return cached.code
}
