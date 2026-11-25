import crypto from 'node:crypto';
import { Messages } from '../constants/messages.js';
import { AppError } from '../errors/AppError.js';

const safeEqual = (a, b) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/**
 * Autentikasi untuk sistem eksternal (mesin/aplikasi laboratorium), bukan untuk user manusia.
 */
export const requireApiKey = (getExpectedKey) => (req, _res, next) => {
  const expected = getExpectedKey();
  const provided = req.get('X-API-Key') ?? '';

  if (!expected || !safeEqual(provided, expected)) {
    return next(AppError.unauthorized(Messages.API_KEY_INVALID));
  }

  return next();
};
