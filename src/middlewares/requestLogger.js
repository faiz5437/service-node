import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Math.round(durationMs),
      user: req.user?.username,
    });
  });

  next();
}
