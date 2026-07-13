-- NodePIN D1 Schema
-- جدول السيرفرات المضافة وبيانات اتصال SSH الخاصة بكل واحد

CREATE TABLE IF NOT EXISTS servers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  ip         TEXT    NOT NULL UNIQUE,
  ssh_port   TEXT    DEFAULT '22',
  ssh_user   TEXT    DEFAULT 'root',
  ssh_key    TEXT    NOT NULL,
  created_at TEXT    DEFAULT (datetime('now'))
);

-- جدول الـ IPs الإضافية المرتبطة بكل سيرفر
CREATE TABLE IF NOT EXISTS server_ips (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id  INTEGER NOT NULL,
  ip         TEXT    NOT NULL,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- جدول الإعدادات العامة (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
