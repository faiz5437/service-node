import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { Messages } from '../constants/messages.js';
import { AppError } from '../errors/AppError.js';

/**
 * Token diterbitkan oleh Yii (RS256). Node hanya memegang public key,
 * sehingga bisa memverifikasi token tanpa memanggil Yii dan tidak bisa membuat token palsu.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized(Messages.TOKEN_MISSING));
  }

  try {
    const payload = jwt.verify(token, config.jwt.publicKey, { algorithms: ['RS256'], issuer: config.jwt.issuer });

    req.user = {
      id: payload.sub,
      name: payload.name,
      username: payload.username,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      tenagaMedisId: payload.tenaga_medis_id ?? null,
    };

    return next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? Messages.TOKEN_EXPIRED : Messages.UNAUTHORIZED;
    return next(AppError.unauthorized(message));
  }
}
