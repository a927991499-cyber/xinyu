/**
 * Token 验证工具
 * 从 Authorization header 解析 userId
 */

export function verifyToken(request: Request): string | null {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return null
    }

    // Token 格式：Base64(userId)
    const userId = Buffer.from(token, 'base64').toString('utf-8')

    if (!userId) {
      return null
    }

    return userId
  } catch (error) {
    console.error('[Auth] Token 验证失败:', error)
    return null
  }
}
