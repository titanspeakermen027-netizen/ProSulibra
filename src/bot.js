const { Client, GatewayIntentBits, Partials, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const sharp = require('sharp');
const { config } = require('./config');
const { getGuild } = require('./db');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember]
});

function clampText(value, fallback, max = 1000) {
  const text = String(value ?? fallback).trim();
  return text ? text.slice(0, max) : fallback;
}

function escapeXml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function fill(template, member, guild) {
  const values = {
    '{user}': `<@${member.id}>`,
    '{mention}': `<@${member.id}>`,
    '{username}': member.user.username,
    '{server}': guild.name,
    '{memberCount}': String(guild.memberCount)
  };
  let output = String(template || '');
  for (const [key, value] of Object.entries(values)) output = output.split(key).join(value);
  return output.replace(/@(everyone|here)/gi, '@ $1');
}

function hexColor(value, fallback = '#5865F2') {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
}

function presetColors(preset) {
  return {
    midnight: ['#10204A', '#6D3BFF'],
    ocean: ['#0369A1', '#2563EB'],
    purple: ['#5B21B6', '#A855F7'],
    crimson: ['#7F1D1D', '#DC2626'],
    forest: ['#14532D', '#16A34A']
  }[preset] || ['#10204A', '#6D3BFF'];
}

function roundRectPath(shape, x, y, w, h, radius) {
  if (shape === 'square') return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}"/>`;
}

async function makeCard(member, guild, settings) {
  const width = 900;
  const height = 1100;
  const primary = hexColor(settings.card_primary_color);
  const secondary = hexColor(settings.card_secondary_color, '#8B5CF6');
  const textColor = hexColor(settings.card_text_color, '#FFFFFF');
  const serverColor = hexColor(settings.card_server_color, '#C7D2FE');
  const avatarBorder = hexColor(settings.card_avatar_border_color, '#FFFFFF');
  const font = ['Arial', 'Verdana', 'Trebuchet MS', 'Georgia', 'system-ui'].includes(settings.card_font_family) ? settings.card_font_family : 'Arial';
  const align = settings.card_text_align === 'left' ? 'left' : settings.card_text_align === 'right' ? 'right' : 'center';
  const centerX = align === 'left' ? 105 : align === 'right' ? 795 : 450;
  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
  const avatarSize = Math.min(310, Math.max(140, Number(settings.card_avatar_size) || 230));
  const avatarBorderWidth = Math.min(18, Math.max(0, Number(settings.card_avatar_border_width) || 6));
  const avatarX = 450 - avatarSize / 2;
  const avatarY = 155;
  const radius = Math.round(avatarSize * 0.16);
  const [presetA, presetB] = presetColors(settings.card_background_preset);
  const presetGradient = `linear-gradient`;

  const title = escapeXml(fill(settings.welcome_card_text, member, guild).slice(0, 80) || 'WELCOME');
  const sub = escapeXml(fill(settings.welcome_card_subtext, member, guild).slice(0, 80) || member.user.username);
  const serverName = escapeXml(guild.name.slice(0, 70));
  const footer = escapeXml(fill(settings.card_footer_text, member, guild).slice(0, 80));
  const joinDate = member.joinedTimestamp ? new Date(member.joinedTimestamp).toLocaleDateString('ar-MA') : '';
  const avatarUrl = member.displayAvatarURL({ extension: 'png', size: 512 });
  const avatarResponse = await fetch(avatarUrl);
  if (!avatarResponse.ok) throw new Error(`Avatar download failed: ${avatarResponse.status}`);
  const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());

  const avatarClip = settings.card_avatar_shape === 'square'
    ? `<rect x="0" y="0" width="${avatarSize}" height="${avatarSize}"/>`
    : settings.card_avatar_shape === 'rounded'
      ? `<rect x="0" y="0" width="${avatarSize}" height="${avatarSize}" rx="${Math.round(avatarSize * 0.16)}" ry="${Math.round(avatarSize * 0.16)}"/>`
      : `<circle cx="${avatarSize / 2}" cy="${avatarSize / 2}" r="${avatarSize / 2}"/>`;

  const avatarSvg = Buffer.from(`<svg width="${avatarSize}" height="${avatarSize}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip">${avatarClip}</clipPath></defs><image width="${avatarSize}" height="${avatarSize}" href="data:image/png;base64,${avatarBuffer.toString('base64')}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip)"/></svg>`);

  const overlayOpacity = Math.min(0.85, Math.max(0, Number(settings.card_overlay_opacity) || 35) / 100);
  const primaryTextY = 525;
  const subTextY = 595;
  const serverTextY = 670;
  const statY = 770;
  const footerY = 1015;

  const infoLines = [];
  if (settings.card_show_server) infoLines.push(`<text x="${centerX}" y="${serverTextY}" text-anchor="${anchor}" font-family="${escapeXml(font)}, Arial, sans-serif" font-size="28" font-weight="700" fill="${serverColor}">${serverName}</text>`);
  if (settings.card_show_member_count) infoLines.push(`<text x="${centerX}" y="${statY}" text-anchor="${anchor}" font-family="${escapeXml(font)}, Arial, sans-serif" font-size="24" fill="${textColor}" opacity="0.92">عضو رقم ${escapeXml(guild.memberCount)}</text>`);
  if (settings.card_show_join_date && joinDate) infoLines.push(`<text x="${centerX}" y="${statY + 46}" text-anchor="${anchor}" font-family="${escapeXml(font)}, Arial, sans-serif" font-size="21" fill="${textColor}" opacity="0.72">تاريخ الانضمام: ${escapeXml(joinDate)}</text>`);

  const overlaySvg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="35"/></filter>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="44" fill="url(#g)" opacity="0.45"/>
    <circle cx="90" cy="120" r="170" fill="${presetA}" opacity="0.28" filter="url(#blur)"/>
    <circle cx="820" cy="970" r="250" fill="${presetB}" opacity="0.28" filter="url(#blur)"/>
    <rect x="0" y="0" width="${width}" height="${height}" fill="#050816" opacity="${overlayOpacity}"/>
    <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="38" fill="none" stroke="${primary}" stroke-width="5" opacity="0.95"/>
    ${roundRectPath('rounded', 450 - avatarSize / 2 - 14, avatarY - 14, avatarSize + 28, avatarSize + 28, radius + 14).replace('/>', ` fill="none" stroke="${avatarBorder}" stroke-width="${avatarBorderWidth}" opacity="0.96"/>`)}
    <text x="${centerX}" y="${primaryTextY}" text-anchor="${anchor}" font-family="${escapeXml(font)}, Arial, sans-serif" font-size="74" font-weight="900" fill="${textColor}">${title}</text>
    <text x="${centerX}" y="${subTextY}" text-anchor="${anchor}" font-family="${escapeXml(font)}, Arial, sans-serif" font-size="41" font-weight="700" fill="${textColor}" opacity="0.92">${sub}</text>
    ${infoLines.join('')}
    <line x1="170" y1="900" x2="730" y2="900" stroke="${primary}" stroke-width="3" opacity="0.9"/>
    <text x="${centerX}" y="${footerY}" text-anchor="${anchor}" font-family="${escapeXml(font)}, Arial, sans-serif" font-size="22" fill="${textColor}" opacity="0.78">${footer}</text>
  </svg>`;

  let imagePipeline;
  if (settings.card_background_data) {
    const match = String(settings.card_background_data).match(/^data:image\/(png|jpeg|webp);base64,(.+)$/i);
    if (match) imagePipeline = sharp(Buffer.from(match[2], 'base64')).resize(width, height, { fit: 'cover', position: 'centre' });
  }
  if (!imagePipeline) imagePipeline = sharp({ create: { width, height, channels: 4, background: '#070B18' } });

  return imagePipeline
    .composite([
      { input: Buffer.from(overlaySvg), left: 0, top: 0 },
      { input: avatarSvg, left: Math.round(avatarX), top: avatarY }
    ])
    .png()
    .toBuffer();
}

client.once('ready', () => console.log(`[BOT] Logged in as ${client.user.tag}`));

client.on('guildMemberAdd', async (member) => {
  try {
    const settings = getGuild(member.guild.id);
    if (settings.auto_role_id) {
      const role = member.guild.roles.cache.get(settings.auto_role_id);
      if (role && role.editable) await member.roles.add(role, 'ProSulibra auto-role').catch(() => null);
    }
    if (!settings.welcome_enabled || !settings.welcome_channel_id) return;
    const channel = member.guild.channels.cache.get(settings.welcome_channel_id);
    if (!channel?.isTextBased()) return;

    const content = fill(settings.welcome_message, member, member.guild).slice(0, 2000);
    const payload = { allowedMentions: { parse: [], users: [member.id] } };
    if (content) payload.content = content;

    if (settings.welcome_embed_enabled) {
      payload.embeds = [new EmbedBuilder()
        .setTitle(clampText(fill(settings.welcome_embed_title, member, member.guild), 'عضو جديد! 👋', 256))
        .setDescription(clampText(fill(settings.welcome_embed_description, member, member.guild), content || 'مرحبا!', 4096))
        .setColor(parseInt(hexColor(settings.welcome_embed_color).slice(1), 16))
        .setThumbnail(member.displayAvatarURL({ extension: 'png', size: 256 }))
        .setTimestamp()];
    }

    if (settings.welcome_card_enabled) {
      const image = await makeCard(member, member.guild, settings);
      payload.files = [new AttachmentBuilder(image, { name: 'welcome-card.png' })];
      const embed = payload.embeds?.[0] || new EmbedBuilder();
      embed.setColor(parseInt(hexColor(settings.welcome_embed_color).slice(1), 16)).setImage('attachment://welcome-card.png');
      payload.embeds = [embed];
    }
    await channel.send(payload);
  } catch (error) {
    console.error(`[WELCOME] ${member.guild.id}`, error);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    const settings = getGuild(member.guild.id);
    if (!settings.leave_enabled || !settings.leave_channel_id) return;
    const channel = member.guild.channels.cache.get(settings.leave_channel_id);
    if (!channel?.isTextBased()) return;
    const content = fill(settings.leave_message, member, member.guild).slice(0, 2000);
    await channel.send({ content, allowedMentions: { parse: [] } });
  } catch (error) { console.error(`[LEAVE] ${member.guild.id}`, error); }
});

async function startBot() { await client.login(config.token); }

module.exports = { client, startBot };
