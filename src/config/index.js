import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const int = (value, fallback) => (Number.isNaN(Number.parseInt(value, 10)) ? fallback : Number.parseInt(value, 10));
const list = (value, fallback = []) => (value ? value.split(',').map((v) => v.trim()).filter(Boolean) : fallback);

function readKey(filePath) {
  const absolute = path.resolve(root, filePath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: int(process.env.PORT, 3000),
  corsOrigins: list(process.env.CORS_ORIGINS, ['http://localhost:5173']),

  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: int(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME ?? 'simrs',
    user: process.env.DB_USER ?? 'simrs_node',
    password: process.env.DB_PASSWORD ?? '',
    max: int(process.env.DB_POOL_MAX, 10),
  },

  jwt: {
    publicKey: process.env.JWT_PUBLIC_KEY ?? readKey(process.env.JWT_PUBLIC_KEY_PATH ?? 'keys/jwt-public.pem'),
    issuer: process.env.JWT_ISSUER ?? 'simrs-yii',
  },

  yii: {
    baseURL: process.env.YII_BASE_URL ?? 'http://127.0.0.1:8080/api/v1',
    serviceKey: process.env.YII_SERVICE_KEY ?? '',
  },

  lis: {
    baseURL: process.env.LIS_BASE_URL ?? 'http://127.0.0.1:4000',
    apiKey: process.env.LIS_API_KEY ?? '',
    inboundApiKey: process.env.LIS_INBOUND_API_KEY ?? '',
  },

  externalApiUrl: process.env.EXTERNAL_API_URL ?? '',

  outbox: {
    intervalMs: int(process.env.OUTBOX_INTERVAL_MS, 5000),
    maxAttempts: int(process.env.OUTBOX_MAX_ATTEMPTS, 8),
    batchSize: 10,
  },

  rekapRefreshIntervalMs: int(process.env.REKAP_REFRESH_INTERVAL_MS, 300000),
  dashboardCacheTtlMs: int(process.env.DASHBOARD_CACHE_TTL_MS, 60000),
};
