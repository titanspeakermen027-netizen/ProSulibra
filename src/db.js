const Database = require('better-sqlite3');
const session = require('express-session');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'prosulibra.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    welcome_enabled INTEGER NOT NULL DEFAULT 1,
    welcome_channel_id TEXT,
    welcome_message TEXT NOT NULL DEFAULT 'مرحبا {user} فـ {server}! 🎉\nانت العضو رقم {memberCount}.',
    welcome_embed_enabled INTEGER NOT NULL DEFAULT 1,
    welcome_embed_title TEXT NOT NULL DEFAULT 'عضو جديد! 👋',
    welcome_embed_description TEXT NOT NULL DEFAULT '{user} مرحبا بك في {server}! 🎉',
    welcome_embed_color TEXT NOT NULL DEFAULT '#5865F2',
    welcome_card_enabled INTEGER NOT NULL DEFAULT 0,
    welcome_card_text TEXT NOT NULL DEFAULT 'أهلاً وسهلاً',
    welcome_card_subtext TEXT NOT NULL DEFAULT '{username}',
    auto_role_id TEXT,
    leave_enabled INTEGER NOT NULL DEFAULT 0,
    leave_channel_id TEXT,
    leave_message TEXT NOT NULL DEFAULT 'غادر {username} السيرفر. نتمنى له التوفيق! 👋',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
`);

const defaults = {
  guild_id: '',
  welcome_enabled: 1,
  welcome_channel_id: null,
  welcome_message: 'مرحبا {user} فـ {server}! 🎉\nانت العضو رقم {memberCount}.',
  welcome_embed_enabled: 1,
  welcome_embed_title: 'عضو جديد! 👋',
  welcome_embed_description: '{user} مرحبا بك في {server}! 🎉',
  welcome_embed_color: '#5865F2',
  welcome_card_enabled: 0,
  welcome_card_text: 'أهلاً وسهلاً',
  welcome_card_subtext: '{username}',
  auto_role_id: null,
  leave_enabled: 0,
  leave_channel_id: null,
  leave_message: 'غادر {username} السيرفر. نتمنى له التوفيق! 👋'
};

function getGuild(guildId) {
  const row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  if (!row) return { ...defaults, guild_id: guildId };
  return row;
}

function saveGuild(guildId, input) {
  const current = getGuild(guildId);
  const value = { ...current, ...input, guild_id: guildId };
  db.prepare(`
    INSERT INTO guild_settings (
      guild_id, welcome_enabled, welcome_channel_id, welcome_message,
      welcome_embed_enabled, welcome_embed_title, welcome_embed_description,
      welcome_embed_color, welcome_card_enabled, welcome_card_text,
      welcome_card_subtext, auto_role_id, leave_enabled, leave_channel_id,
      leave_message, updated_at
    ) VALUES (
      @guild_id, @welcome_enabled, @welcome_channel_id, @welcome_message,
      @welcome_embed_enabled, @welcome_embed_title, @welcome_embed_description,
      @welcome_embed_color, @welcome_card_enabled, @welcome_card_text,
      @welcome_card_subtext, @auto_role_id, @leave_enabled, @leave_channel_id,
      @leave_message, unixepoch()
    )
    ON CONFLICT(guild_id) DO UPDATE SET
      welcome_enabled=excluded.welcome_enabled,
      welcome_channel_id=excluded.welcome_channel_id,
      welcome_message=excluded.welcome_message,
      welcome_embed_enabled=excluded.welcome_embed_enabled,
      welcome_embed_title=excluded.welcome_embed_title,
      welcome_embed_description=excluded.welcome_embed_description,
      welcome_embed_color=excluded.welcome_embed_color,
      welcome_card_enabled=excluded.welcome_card_enabled,
      welcome_card_text=excluded.welcome_card_text,
      welcome_card_subtext=excluded.welcome_card_subtext,
      auto_role_id=excluded.auto_role_id,
      leave_enabled=excluded.leave_enabled,
      leave_channel_id=excluded.leave_channel_id,
      leave_message=excluded.leave_message,
      updated_at=unixepoch()
  `).run(value);
  return getGuild(guildId);
}

class SQLiteStore extends session.Store {
  get(sid, cb) {
    try {
      const row = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expire > ?').get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (error) { cb(error); }
  }
  set(sid, sess, cb) {
    try {
      const maxAge = sess.cookie?.maxAge ?? 86_400_000;
      db.prepare(`INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess, expire=excluded.expire`)
        .run(sid, JSON.stringify(sess), Date.now() + maxAge);
      cb?.(null);
    } catch (error) { cb?.(error); }
  }
  destroy(sid, cb) {
    try { db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid); cb?.(null); }
    catch (error) { cb?.(error); }
  }
  touch(sid, sess, cb) { this.set(sid, sess, cb); }
}

setInterval(() => {
  try { db.prepare('DELETE FROM sessions WHERE expire <= ?').run(Date.now()); } catch {}
}, 15 * 60 * 1000).unref();

module.exports = { db, getGuild, saveGuild, SQLiteStore };
