# ProSulibra Welcomer

Discord welcome bot with a responsive dashboard, Discord OAuth2 login, per-server SQLite settings, optional welcome cards, auto-role support, and leave messages.

## Features

- Discord.js 14 bot.
- Discord OAuth2 dashboard using `identify` + `guilds`.
- Only server owners / members with Manage Server or Administrator can configure a server.
- Per-server SQLite configuration.
- Welcome text with `{user}`, `{username}`, `{server}`, `{memberCount}`, `{mention}` placeholders.
- Optional Embed welcome message.
- Optional generated PNG welcome card.
- Optional automatic role assignment.
- Leave messages.
- Anti-mention defaults using Discord `allowedMentions`.
- SQLite-backed Express sessions.
- Health endpoint at `/healthz`.

## Requirements

Node.js 20.9+ is required. `discord.js` currently documents Node.js 18+ support, while this project targets Node 20.9+ because the image stack used by the welcome-card generator requires it. 

## Environment

Copy `.env.example` to `.env` and fill in the Discord application values.

`DISCORD_REDIRECT_URI` must exactly match the OAuth2 redirect URI registered in the Discord Developer Portal, for example:

`https://your-domain.example/auth/callback`

For local testing:

`http://localhost:3000/auth/callback`

## Run

```bash
npm install
npm start
```

The dashboard listens on `PORT` (default `3000`).

## Discord bot setup

Enable the `Server Members Intent` in the Discord Developer Portal. Invite the bot with the `bot` and `applications.commands` scopes and permissions needed to send messages, embed links, attach files, and manage roles if auto-role is enabled.

The bot must have a role higher than any role it is expected to assign.

## Dashboard flow

1. Open `/`.
2. Sign in with Discord.
3. Pick a server where you have Manage Server / Administrator access.
4. Configure welcome, leave, card, embed, and auto-role settings.
5. Save. Changes are written immediately to SQLite.

## Notes

This repository starts empty and is intentionally kept as one deployable Node.js service so the bot and dashboard share one configuration and database layer.
