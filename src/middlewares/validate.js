import { AppError } from '../errors/AppError.js';

const formatIssues = (error) =>
  error.issues.reduce((acc, issue) => {
    const key = issue.path.join('.') || '_';
    (acc[key] ??= []).push(issue.message);
    return acc;
  }, {});

/**
 * validate({ query, body, params }) dengan schema Zod.
 * Hasil yang sudah dibersihkan disimpan di req.validated.
 */
export const validate = (schemas) => (req, _res, next) => {
  const errors = {};
  req.validated = {};

  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;

    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) {
      req.validated[part] = result.data;
    } else {
      Object.assign(errors, formatIssues(result.error));
    }
  }

  return Object.keys(errors).length ? next(AppError.validation(errors)) : next();
};
