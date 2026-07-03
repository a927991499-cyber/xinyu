import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// 身份证校验
function validateIdNumber(id: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(id)) return false
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const check = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) sum += parseInt(id[i]) * w[i]
  return check[sum % 11] === id[17].toUpperCase()
}

// 检查实名状态
export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "无效token" }, { status: 401 })
  }
  const db = getDb()
  const user = db.prepare("SELECT id_verified FROM users WHERE user_id = ?").get(userId) as any
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 })
  return NextResponse.json({ success: true, id_verified: user.id_verified === 1 })
}

// 提交实名
export async function POST(request: NextRequest) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "")
  let userId = ""
  try { userId = Buffer.from(token, "base64").toString("utf-8") } catch {
    return NextResponse.json({ error: "无效token" }, { status: 401 })
  }

  const { realName, idNumber } = await request.json()
  if (!realName || !idNumber) return NextResponse.json({ error: "请填写完整信息" }, { status: 400 })
  if (!/^[\u4e00-\u9fa5]{2,20}$/.test(realName)) return NextResponse.json({ error: "姓名格式不正确" }, { status: 400 })
  if (!validateIdNumber(idNumber)) return NextResponse.json({ error: "身份证号格式不正确" }, { status: 400 })

  const db = getDb()
  const existing = db.prepare("SELECT id_verified FROM users WHERE user_id = ?").get(userId) as any
  if (!existing) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

  db.prepare("UPDATE users SET real_name = ?, id_number = ?, id_verified = 1 WHERE user_id = ?")
    .run(realName, idNumber, userId)

  return NextResponse.json({ success: true })
}
