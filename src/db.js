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
    welcome_message TEXT NOT NULL DEFAULT 'مرحبا {user} فـ {server}! 🎉\\nانت العضو رقم {memberCount}.',
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

const migrations = {
  card_background_data: 'TEXT',
  card_background_preset: "TEXT NOT NULL DEFAULT 'midnight'",
  card_primary_color: "TEXT NOT NULL DEFAULT '#5865F2'",
  card_secondary_color: "TEXT NOT NULL DEFAULT '#8B5CF6'",
  card_text_color: "TEXT NOT NULL DEFAULT '#FFFFFF'",
  card_server_color: "TEXT NOT NULL DEFAULT '#C7D2FE'",
  card_avatar_shape: "TEXT NOT NULL DEFAULT 'circle'",
  card_avatar_size: 'INTEGER NOT NULL DEFAULT 230',
  card_avatar_border_color: "TEXT NOT NULL DEFAULT '#FFFFFF'",
  card_avatar_border_width: 'INTEGER NOT NULL DEFAULT 6',
  card_overlay_opacity: 'INTEGER NOT NULL DEFAULT 35',
  card_font_family: "TEXT NOT NULL DEFAULT 'Arial'",
  card_text_align: "TEXT NOT NULL DEFAULT 'center'",
  card_footer_text: "TEXT NOT NULL DEFAULT 'Together We Are Stronger'",
  card_show_member_count: 'INTEGER NOT NULL DEFAULT 1',
  card_show_server: 'INTEGER NOT NULL DEFAULT 1',
  card_show_join_date: 'INTEGER NOT NULL DEFAULT 0'
};
for (const [column, definition] of Object.entries(migrations)) {
  try { db.exec(`ALTER TABLE guild_settings ADD COLUMN ${column} ${definition}`); } catch (error) {
    if (!String(error.message).toLowerCase().includes('duplicate column')) throw error;
  }
}

const defaults = {
  guild_id: '',
  welcome_enabled: 1,
  welcome_channel_id: null,
  welcome_message: 'مرحبا {user} فـ {server}! 🎉\\nانت العضو رقم {memberCount}.',
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
  leave_message: 'غادر {username} السيرفر. نتمنى له التوفيق! 👋',
  card_background_data: null,
  card_background_preset: 'midnight',
  card_primary_color: '#5865F2',
  card_secondary_color: '#8B5CF6',
  card_text_color: '#FFFFFF',
  card_server_color: '#C7D2FE',
  card_avatar_shape: 'circle',
  card_avatar_size: 230,
  card_avatar_border_color: '#FFFFFF',
  card_avatar_border_width: 6,
  card_overlay_opacity: 35,
  card_font_family: 'Arial',
  card_text_align: 'center',
  card_footer_text: 'Together We Are Stronger',
  card_show_member_count: 1,
  card_show_server: 1,
  card_show_join_date: 0
};

function getGuild(guildId) {
  const row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  if (!row) return { ...defaults, guild_id: guildId };
  return { ...defaults, ...row, guild_id: guildId };
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
      leave_message, card_background_data, card_background_preset,
      card_primary_color, card_secondary_color, card_text_color, card_server_color,
      card_avatar_shape, card_avatar_size, card_avatar_border_color,
      card_avatar_border_width, card_overlay_opacity, card_font_family,
      card_text_align, card_footer_text, card_show_member_count,
      card_show_server, card_show_join_date, updated_at
    ) VALUES (
      @guild_id, @welcome_enabled, @welcome_channel_id, @welcome_message,
      @welcome_embed_enabled, @welcome_embed_title, @welcome_embed_description,
      @welcome_embed_color, @welcome_card_enabled, @welcome_card_text,
      @welcome_card_subtext, @auto_role_id, @leave_enabled, @leave_channel_id,
      @leave_message, @card_background_data, @card_background_preset,
      @card_primary_color, @card_secondary_color, @card_text_color, @card_server_color,
      @card_avatar_shape, @card_avatar_size, @card_avatar_border_color,
      @card_avatar_border_width, @card_overlay_opacity, @card_font_family,
      @card_text_align, @card_footer_text, @card_show_member_count,
      @card_show_server, @card_show_join_date, unixepoch()
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
      card_background_data=excluded.card_background_data,
      card_background_preset=excluded.card_background_preset,
      card_primary_color=excluded.card_primary_color,
      card_secondary_color=excluded.card_secondary_color,
      card_text_color=excluded.card_text_color,
      card_server_color=excluded.card_server_color,
      card_avatar_shape=excluded.card_avatar_shape,
      card_avatar_size=excluded.card_avatar_size,
      card_avatar_border_color=excluded.card_avatar_border_color,
      card_avatar_border_width=excluded.card_avatar_border_width,
      card_overlay_opacity=excluded.card_overlay_opacity,
      card_font_family=excluded.card_font_family,
      card_text_align=excluded.card_text_align,
      card_footer_text=excluded.card_footer_text,
      card_show_member_count=excluded.card_show_member_count,
      card_show_server=excluded.card_show_server,
      card_show_join_date=excluded.card_show_join_date,
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
