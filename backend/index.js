require('dotenv').config();
const { initSentry } = require('./helpers/sentry-init');
initSentry();

const mongoose = require('mongoose');
const { startServer } = require('./server');

if (require.main === module) {
  const { server } = startServer();

  const shutdown = async (signal) => {
    try {
      console.log(`\n${signal} recebido. Encerrando...`);
      await mongoose.connection.close();
    } catch (e) {
      console.error('Erro fechando Mongo:', e.message);
    } finally {
      server.close(() => process.exit(0));
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
