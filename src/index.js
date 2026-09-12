const { app } = require('./dashboard');
const { startBot } = require('./bot');
const { config } = require('./config');

const server = app.listen(config.port, () => {
  console.log(`[WEB] ${config.botName} dashboard listening on ${config.publicUrl}`);
});

startBot().catch((error) => {
  console.error('[BOT] Failed to start:', error);
  process.exitCode = 1;
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
