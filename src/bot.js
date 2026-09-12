const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
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

function hexColor(value) {
  const hex = String(value || '').match(/^#?([0-9a-f]{6})$/i);
  return hex ? parseInt(hex[1], 16) : 0x5865F2;
}

async function makeCard(member, guild, settings) {
  const title = clampText(fill(settings.welcome_card_text, member, guild), 'أهلاً وسهلاً', 80)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sub = clampText(fill(settings.welcome_card_subtext, member, guild), member.user.username, 80)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const guildName = guild.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const avatar = member.user.displayAvatarURL({ extension: 'png', size: 256 });
  const svg = `<svg width="1200" height="420" viewBox="0 0 1200 420" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#5865F2"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs>
    <rect width="1200" height="420" rx="36" fill="#111827"/>
    <rect width="1200" height="420" rx="36" fill="url(#g)" opacity="0.30"/>
    <circle cx="185" cy="210" r="104" fill="#ffffff" opacity="0.12"/>
    <text x="345" y="155" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${title}</text>
    <text x="345" y="225" font-family="Arial, sans-serif" font-size="34" fill="#E5E7EB">${sub}</text>
    <text x="345" y="285" font-family="Arial, sans-serif" font-size="23" fill="#C7D2FE">${guildName}</text>
    <text x="345" y="332" font-family="Arial, sans-serif" font-size="20" fill="#D1D5DB">عضو رقم ${guild.memberCount}</text>
  </svg>`;
  const avatarBuffer = await fetch(avatar).then(r => r.arrayBuffer());
  const circle = Buffer.from(`<svg width="208" height="208" xmlns="http://www.w3.org/2000/svg"><clipPath id="c"><circle cx="104" cy="104" r="104"/></clipPath><image width="208" height="208" href="data:image/png;base64,${Buffer.from(avatarBuffer).toString('base64')}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/></svg>`);
  return sharp(Buffer.from(svg)).composite([{ input: circle, left: 81, top: 106 }]).png().toBuffer();
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
        .setColor(hexColor(settings.welcome_embed_color))
        .setThumbnail(member.displayAvatarURL({ extension: 'png', size: 256 }))
        .setTimestamp()];
    }

    if (settings.welcome_card_enabled) {
      const image = await makeCard(member, member.guild, settings);
      payload.files = [new AttachmentBuilder(image, { name: 'welcome.png' })];
      const embed = payload.embeds?.[0] || new EmbedBuilder().setColor(hexColor(settings.welcome_embed_color));
      embed.setImage('attachment://welcome.png');
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

module.exports = { client, startBot, PermissionFlagsBits };
