import { createApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './config/database.js';
import { logger } from './utils/logger.js';
import { startOutboxWorker } from './workers/outboxWorker.js';
import { startRekapRefresher } from './workers/rekapRefresher.js';

if (!config.jwt.publicKey) {
  logger.error('Public key JWT tidak ditemukan. Jalankan scripts/generate-keys.sh terlebih dahulu.');
  process.exit(1);
}

const app = createApp();
const server = app.listen(config.port, () => logger.info(`Service Node berjalan di port ${config.port}`));

const stopOutbox = startOutboxWorker();
const stopRekap = startRekapRefresher();

const shutdown = (signal) => {
  logger.info(`Menerima ${signal}, menghentikan service`);
  stopOutbox();
  stopRekap();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
