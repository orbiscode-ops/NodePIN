/**
 * NodePIN — Database Module
 * D1 (SQLite) operations for servers, nodes, and auth.
 */

import { encrypt, decrypt } from './crypto.js';

// ── ID Generation ──

function generateId() {
  return crypto.randomUUID();
}

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════

export async function getAuthConfig(db) {
  const { results } = await db.prepare('SELECT * FROM auth_config WHERE id = 1').all();
  return results[0] || null;
}

export async function setupAuth(db, passwordHash, sessionSecret) {
  await db.prepare(
    `INSERT INTO auth_config (id, password_hash, session_secret)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET password_hash = ?, session_secret = ?, updated_at = datetime('now')`
  ).bind(passwordHash, sessionSecret, passwordHash, sessionSecret).run();
}

export async function updatePassword(db, passwordHash) {
  await db.prepare(
    `UPDATE auth_config SET password_hash = ?, updated_at = datetime('now') WHERE id = 1`
  ).bind(passwordHash).run();
}

// ══════════════════════════════════════════
// SERVERS
// ══════════════════════════════════════════

export async function listServers(db) {
  const { results } = await db.prepare(
    `SELECT id, name, host, port, username, auth_type, status, last_checked_at, created_at, updated_at
     FROM servers ORDER BY created_at DESC`
  ).all();
  return results;
}

export async function getServer(db, id) {
  return await db.prepare(
    `SELECT id, name, host, port, username, auth_type, auth_credential, auth_iv, auth_tag,
            status, last_checked_at, created_at, updated_at
     FROM servers WHERE id = ?`
  ).bind(id).first();
}

export async function getServerWithDecryptedCredential(db, id, encryptionKey) {
  const server = await getServer(db, id);
  if (!server) return null;

  const credential = await decrypt(
    { ciphertext: server.auth_credential, iv: server.auth_iv, tag: server.auth_tag },
    encryptionKey
  );

  return { ...server, credential };
}

export async function createServer(db, { name, host, port, username, authType, credential }, encryptionKey) {
  const id = generateId();
  const encrypted = await encrypt(credential, encryptionKey);

  await db.prepare(
    `INSERT INTO servers (id, name, host, port, username, auth_type, auth_credential, auth_iv, auth_tag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, host, port || 22, username || 'root', authType, encrypted.ciphertext, encrypted.iv, encrypted.tag).run();

  return { id };
}

export async function updateServer(db, id, updates, encryptionKey) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.host !== undefined) { fields.push('host = ?'); values.push(updates.host); }
  if (updates.port !== undefined) { fields.push('port = ?'); values.push(updates.port); }
  if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
  if (updates.authType !== undefined) { fields.push('auth_type = ?'); values.push(updates.authType); }
  if (updates.credential !== undefined) {
    const encrypted = await encrypt(updates.credential, encryptionKey);
    fields.push('auth_type = ?'); values.push(updates.authType || 'password');
    fields.push('auth_credential = ?'); values.push(encrypted.ciphertext);
    fields.push('auth_iv = ?'); values.push(encrypted.iv);
    fields.push('auth_tag = ?'); values.push(encrypted.tag);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE servers SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();
}

export async function updateServerStatus(db, id, status) {
  await db.prepare(
    `UPDATE servers SET status = ?, last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).bind(status, id).run();
}

export async function deleteServer(db, id) {
  await db.prepare('DELETE FROM servers WHERE id = ?').bind(id).run();
}

// ══════════════════════════════════════════
// NODES
// ══════════════════════════════════════════

export async function listNodes(db, serverId) {
  const query = serverId
    ? 'SELECT * FROM nodes WHERE server_id = ? ORDER BY created_at DESC'
    : 'SELECT n.*, s.name as server_name FROM nodes n LEFT JOIN servers s ON n.server_id = s.id ORDER BY n.created_at DESC';

  const stmt = serverId
    ? db.prepare(query).bind(serverId)
    : db.prepare(query);

  const { results } = await stmt.all();
  return results;
}

export async function getNode(db, id) {
  return await db.prepare(
    'SELECT n.*, s.name as server_name FROM nodes n LEFT JOIN servers s ON n.server_id = s.id WHERE n.id = ?'
  ).bind(id).first();
}

export async function createNode(db, { serverId, name, protocol, port, configPath, ipAddress }) {
  const id = generateId();

  await db.prepare(
    `INSERT INTO nodes (id, server_id, name, protocol, port, config_path, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, serverId, name, protocol, port || null, configPath || null, ipAddress || null).run();

  return { id };
}

export async function updateNode(db, id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.protocol !== undefined) { fields.push('protocol = ?'); values.push(updates.protocol); }
  if (updates.port !== undefined) { fields.push('port = ?'); values.push(updates.port); }
  if (updates.configPath !== undefined) { fields.push('config_path = ?'); values.push(updates.configPath); }
  if (updates.ipAddress !== undefined) { fields.push('ip_address = ?'); values.push(updates.ipAddress); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE nodes SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values).run();
}

export async function deleteNode(db, id) {
  await db.prepare('DELETE FROM nodes WHERE id = ?').bind(id).run();
}

// ══════════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════════

export async function getDashboardStats(db) {
  const serverCount = await db.prepare('SELECT COUNT(*) as count FROM servers').first();
  const nodeCount = await db.prepare('SELECT COUNT(*) as count FROM nodes').first();
  const onlineServers = await db.prepare("SELECT COUNT(*) as count FROM servers WHERE status = 'online'").first();
  const runningNodes = await db.prepare("SELECT COUNT(*) as count FROM nodes WHERE status = 'running'").first();

  const byProtocol = await db.prepare(
    `SELECT protocol, COUNT(*) as count, 
            SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
     FROM nodes GROUP BY protocol`
  ).all();

  return {
    servers: { total: serverCount.count, online: onlineServers.count },
    nodes: { total: nodeCount.count, running: runningNodes.count },
    byProtocol: byProtocol.results
  };
}
