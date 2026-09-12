const crypto = require('node:crypto');
require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('DISCORD_CLIENT_ID'),
  clientSecret: required('DISCORD_CLIENT_SECRET'),
  redirectUri: required('DISCORD_REDIRECT_URI'),
  port: Number(process.env.PORT || 3000),
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`,
  sessionSecret: required('SESSION_SECRET'),
  nodeEnv: process.env.NODE_ENV || 'development',
  botName: process.env.BOT_NAME || 'ProSulibra'
};

function randomSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { config, randomSecret };
