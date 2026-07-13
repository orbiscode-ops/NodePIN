-- NodePIN D1 Migration
-- Sentinel Node Management Dashboard

-- Authentication
CREATE TABLE IF NOT EXISTS auth_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  session_secret TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Servers (remote VPS machines)
CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL DEFAULT 'root',
  auth_type TEXT NOT NULL CHECK (auth_type IN ('password', 'key')),
  auth_credential TEXT NOT NULL,  -- AES-256-GCM encrypted
  auth_iv TEXT NOT NULL,          -- Initialization vector
  auth_tag TEXT NOT NULL,         -- Authentication tag
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown', 'error')),
  last_checked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Sentinel Nodes (v2ray / wireguard / openvpn)
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('v2ray', 'wireguard', 'openvpn')),
  port INTEGER,
  config_path TEXT,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('running', 'stopped', 'error', 'unknown')),
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nodes_server_id ON nodes(server_id);
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
-- NodePIN D1 Migration
-- Sentinel Node Management Dashboard

-- Authentication
CREATE TABLE IF NOT EXISTS auth_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  session_secret TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Servers (remote VPS machines)
CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL DEFAULT 'root',
  auth_type TEXT NOT NULL CHECK (auth_type IN ('password', 'key')),
  auth_credential TEXT NOT NULL,  -- AES-256-GCM encrypted
  auth_iv TEXT NOT NULL,          -- Initialization vector
  auth_tag TEXT NOT NULL,         -- Authentication tag
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown', 'error')),
  last_checked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Sentinel Nodes (v2ray / wireguard / openvpn)
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('v2ray', 'wireguard', 'openvpn')),
  port INTEGER,
  config_path TEXT,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('running', 'stopped', 'error', 'unknown')),
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nodes_server_id ON nodes(server_id);
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
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
