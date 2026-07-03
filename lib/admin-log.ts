/**
 * 管理操作日志
 */
import { getDb } from "@/lib/db"

export function initLogTable() {
  const db = getDb()
  db.exec(`CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user TEXT DEFAULT 'admin',
    action TEXT NOT NULL,
    target TEXT,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`)
}

export function logAction(action: string, target?: string, detail?: string) {
  try {
    initLogTable()
    getDb().prepare("INSERT INTO admin_logs (action, target, detail) VALUES (?,?,?)").run(action, target || "", detail || "")
  } catch {}
}

export function getLogs(limit = 50) {
  try {
    return getDb().prepare("SELECT * FROM admin_logs ORDER BY id DESC LIMIT ?").all(limit) as any[]
  } catch { return [] }
}
