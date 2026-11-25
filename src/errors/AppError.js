import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';

export class AppError extends Error {
  constructor(message, statusCode = HttpStatus.INTERNAL_SERVER_ERROR, errors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message = Messages.BAD_REQUEST, errors = null) {
    return new AppError(message, HttpStatus.BAD_REQUEST, errors);
  }

  static unauthorized(message = Messages.UNAUTHORIZED) {
    return new AppError(message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = Messages.FORBIDDEN) {
    return new AppError(message, HttpStatus.FORBIDDEN);
  }

  static notFound(message = Messages.NOT_FOUND) {
    return new AppError(message, HttpStatus.NOT_FOUND);
  }

  static conflict(message = Messages.CONFLICT, errors = null) {
    return new AppError(message, HttpStatus.CONFLICT, errors);
  }

  static validation(errors, message = Messages.VALIDATION_FAILED) {
    return new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, errors);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message, statusCode, { upstreamStatus = null, upstreamBody = null, url = null } = {}) {
    super(message, statusCode);
    this.name = 'ExternalServiceError';
    this.upstreamStatus = upstreamStatus;
    this.upstreamBody = upstreamBody;
    this.url = url;
  }
}
