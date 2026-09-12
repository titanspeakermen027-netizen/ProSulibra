# ProSulibra Welcomer

Discord welcome bot with a responsive dashboard, Discord OAuth2 login, per-server SQLite settings, a full welcome-card editor, auto-role support, and leave messages.

## Features

- Discord.js 14 bot.
- Discord OAuth2 dashboard using `identify` + `guilds`.
- Only server owners / members with Manage Server or Administrator can configure a server.
- Per-server SQLite configuration with automatic schema migration for existing databases.
- Welcome text with `{user}`, `{username}`, `{server}`, `{memberCount}`, `{mention}` placeholders.
- Optional Embed welcome message.
- Optional generated PNG welcome card rendered with Sharp.
- Full Welcome Card editor with live preview.
- Custom background image upload from the dashboard (browser-resized before storage).
- Five ready-made background presets.
- Avatar shape: circle, square, or rounded.
- Avatar size, border color, and border width controls.
- Card primary/secondary/text/server colors.
- Font and text alignment controls.
- Optional member count, server name, and join date.
- Custom footer text and background overlay opacity.
- Optional automatic role assignment.
- Leave messages.
- Anti-mention defaults using Discord `allowedMentions`.
- SQLite-backed Express sessions.
- Health endpoint at `/healthz`.

## Requirements

Node.js 20.9+ is required because this project uses the current image-processing stack for welcome cards.

## Environment

Copy `.env.example` to `.env` and fill in the Discord application values.

`DISCORD_REDIRECT_URI` must exactly match the OAuth2 redirect URI registered in the Discord Developer Portal, for example:

`https://your-domain.example/auth/callback`

For local testing:

`http://localhost:3000/auth/callback`

`SESSION_SECRET` should be a long random private value and must not be committed to GitHub.

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
4. Open **Welcome Card → محرر كارت الترحيب**.
5. Customize the message, background, avatar, colors, font, visibility options, and footer.
6. Use the live preview before saving.
7. Save. Changes are written immediately to SQLite and are used by the bot for the next member join.

## Notes

This repository is intentionally kept as one deployable Node.js service so the bot and dashboard share one configuration and database layer.
