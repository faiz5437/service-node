import { AppError } from '../errors/AppError.js';

/**
 * Lolos jika user memiliki salah satu permission. Nama permission sama dengan RBAC di Yii.
 */
export const authorize = (...permissions) => (req, _res, next) => {
  const owned = req.user?.permissions ?? [];
  return permissions.some((permission) => owned.includes(permission)) ? next() : next(AppError.forbidden());
};
