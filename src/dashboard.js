const express = require('express');
const session = require('express-session');
const path = require('node:path');
const crypto = require('node:crypto');
const { config } = require('./config');
const { client } = require('./bot');
const { getGuild, saveGuild, SQLiteStore } = require('./db');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(process.cwd(), 'public'), { maxAge: config.nodeEnv === 'production' ? '1d' : 0 }));
app.use(session({
  store: new SQLiteStore(),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'prosulibra.sid',
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 86_400_000
  }
}));

function oauthState() { return crypto.randomBytes(24).toString('hex'); }
function discordAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: 'identify guilds',
    state
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

async function discordFetch(pathname, accessToken, options = {}) {
  const response = await fetch(`https://discord.com/api/v10${pathname}`, {
    ...options,
    headers: { authorization: `Bearer ${accessToken}`, ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function refreshOAuth(req) {
  if (!req.session.refreshToken) return false;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: req.session.refreshToken
  });
  const response = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', body });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) return false;
  req.session.accessToken = data.access_token;
  if (data.refresh_token) req.session.refreshToken = data.refresh_token;
  req.session.oauthExpiresAt = Date.now() + Number(data.expires_in || 604800) * 1000;
  return true;
}

async function api(req, pathname) {
  if (!req.session.accessToken) throw new Error('unauthorized');
  let result = await discordFetch(pathname, req.session.accessToken);
  if (result.response.status === 401 && await refreshOAuth(req)) {
    result = await discordFetch(pathname, req.session.accessToken);
  }
  if (!result.response.ok) throw new Error(`Discord API ${result.response.status}`);
  return result.body;
}

function csrf(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  return req.session.csrf;
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'not_logged_in' });
  next();
}

function canManage(userGuild) {
  if (!userGuild) return false;
  if (userGuild.owner) return true;
  const permissions = BigInt(userGuild.permissions || '0');
  return (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
}

async function manageableGuild(req, guildId) {
  const guilds = await api(req, '/users/@me/guilds');
  const found = guilds.find(g => g.id === guildId);
  if (!canManage(found)) return null;
  const botGuild = client.guilds.cache.get(guildId);
  if (!botGuild) return { id: guildId, name: found.name, icon: found.icon, botPresent: false };
  return {
    id: guildId,
    name: botGuild.name,
    icon: botGuild.icon,
    botPresent: true,
    memberCount: botGuild.memberCount,
    roles: botGuild.roles.cache
      .filter(r => r.id !== guildId && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name }))
      .slice(0, 100),
    channels: botGuild.channels.cache
      .filter(c => c.isTextBased() && !c.isThread() && c.viewable)
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map(c => ({ id: c.id, name: c.name }))
      .slice(0, 100)
  };
}

app.get('/healthz', (_req, res) => res.json({ ok: true, bot_ready: client.isReady(), guilds: client.guilds.cache.size }));
app.get('/auth/login', (req, res) => {
  const state = oauthState();
  req.session.oauthState = state;
  res.redirect(discordAuthUrl(state));
});
app.get('/auth/callback', async (req, res) => {
  try {
    if (!req.query.code || !req.query.state || req.query.state !== req.session.oauthState) return res.status(400).send('OAuth state is invalid.');
    delete req.session.oauthState;
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: config.redirectUri
    });
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', body });
    const tokens = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !tokens?.access_token) return res.status(502).send('Discord OAuth token exchange failed.');
    const userResult = await discordFetch('/users/@me', tokens.access_token);
    if (!userResult.response.ok) return res.status(502).send('Discord user lookup failed.');
    req.session.user = userResult.body;
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token || null;
    req.session.oauthExpiresAt = Date.now() + Number(tokens.expires_in || 604800) * 1000;
    csrf(req);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('[OAUTH]', error);
    res.status(500).send('OAuth login failed.');
  }
});
app.get('/auth/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

app.get('/', (req, res) => res.render('index', { config, user: req.session.user || null }));
app.get('/dashboard', requireLogin, (req, res) => res.render('dashboard', { config, user: req.session.user, csrf: csrf(req) }));

app.get('/api/me', requireLogin, (req, res) => res.json({ user: req.session.user, csrf: csrf(req) }));
app.get('/api/guilds', requireLogin, async (req, res) => {
  try {
    const guilds = await api(req, '/users/@me/guilds');
    const output = guilds.filter(canManage).map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      botPresent: Boolean(client.guilds.cache.get(g.id)),
      owner: Boolean(g.owner)
    }));
    res.json(output);
  } catch (error) { res.status(401).json({ error: 'discord_session_expired' }); }
});

app.get('/api/guilds/:guildId', requireLogin, async (req, res) => {
  try {
    const guild = await manageableGuild(req, req.params.guildId);
    if (!guild) return res.status(403).json({ error: 'no_permission' });
    res.json({ guild, settings: getGuild(req.params.guildId) });
  } catch (error) { res.status(500).json({ error: 'failed_to_load_guild' }); }
});

app.post('/api/guilds/:guildId/settings', requireLogin, async (req, res) => {
  try {
    if (req.get('X-CSRF-Token') !== req.session.csrf) return res.status(403).json({ error: 'csrf' });
    const guild = await manageableGuild(req, req.params.guildId);
    if (!guild) return res.status(403).json({ error: 'no_permission' });
    if (!guild.botPresent) return res.status(409).json({ error: 'bot_not_in_guild' });

    const body = req.body || {};
    const bool = key => body[key] === true || body[key] === 'true' || body[key] === '1';
    const allowedChannels = new Set(guild.channels.map(c => c.id));
    const allowedRoles = new Set(guild.roles.map(r => r.id));
    const settings = {
      welcome_enabled: bool('welcome_enabled') ? 1 : 0,
      welcome_channel_id: allowedChannels.has(body.welcome_channel_id) ? body.welcome_channel_id : null,
      welcome_message: String(body.welcome_message || '').slice(0, 2000) || getGuild(req.params.guildId).welcome_message,
      welcome_embed_enabled: bool('welcome_embed_enabled') ? 1 : 0,
      welcome_embed_title: String(body.welcome_embed_title || '').slice(0, 256) || 'عضو جديد! 👋',
      welcome_embed_description: String(body.welcome_embed_description || '').slice(0, 4096) || '{user} مرحبا بك في {server}! 🎉',
      welcome_embed_color: /^#[0-9a-f]{6}$/i.test(String(body.welcome_embed_color || '')) ? body.welcome_embed_color : '#5865F2',
      welcome_card_enabled: bool('welcome_card_enabled') ? 1 : 0,
      welcome_card_text: String(body.welcome_card_text || '').slice(0, 80) || 'أهلاً وسهلاً',
      welcome_card_subtext: String(body.welcome_card_subtext || '').slice(0, 80) || '{username}',
      auto_role_id: allowedRoles.has(body.auto_role_id) ? body.auto_role_id : null,
      leave_enabled: bool('leave_enabled') ? 1 : 0,
      leave_channel_id: allowedChannels.has(body.leave_channel_id) ? body.leave_channel_id : null,
      leave_message: String(body.leave_message || '').slice(0, 2000) || 'غادر {username} السيرفر. نتمنى له التوفيق! 👋'
    };
    res.json({ ok: true, settings: saveGuild(req.params.guildId, settings) });
  } catch (error) {
    console.error('[SETTINGS]', error);
    res.status(500).json({ error: 'save_failed' });
  }
});

app.get('/api/invite', requireLogin, (_req, res) => {
  const permissions = String((1n << 10n) | (1n << 11n) | (1n << 14n) | (1n << 15n) | (1n << 16n) | (1n << 28n));
  const params = new URLSearchParams({ client_id: config.clientId, permissions, scope: 'bot applications.commands' });
  res.json({ url: `https://discord.com/oauth2/authorize?${params}` });
});

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'server_error' }); });

module.exports = { app };
