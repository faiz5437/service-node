import { config } from '../config/index.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { AppError, ExternalServiceError } from '../errors/AppError.js';
import { ResponseHelper } from '../helpers/response.js';
import { logger } from '../utils/logger.js';

export function notFound(req, _res, next) {
  next(new AppError(Messages.ROUTE_NOT_FOUND, HttpStatus.NOT_FOUND));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  if (error.type === 'entity.parse.failed') {
    return ResponseHelper.error(res, Messages.PAYLOAD_INVALID_JSON, HttpStatus.BAD_REQUEST);
  }

  if (error instanceof ExternalServiceError) {
    logger.warn('Layanan eksternal gagal', { url: error.url, status: error.upstreamStatus, message: error.message });
    return ResponseHelper.error(res, error.message, error.statusCode, error.upstreamBody?.errors ?? null);
  }

  if (error instanceof AppError) {
    return ResponseHelper.error(res, error.message, error.statusCode, error.errors);
  }

  logger.error('Unhandled error', { path: req.originalUrl, message: error.message, stack: error.stack });

  const detail = config.env === 'production' ? null : { detail: error.message };
  return ResponseHelper.error(res, Messages.SERVER_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, detail);
}
