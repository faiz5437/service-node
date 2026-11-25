import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';

/**
 * Format respons yang sama dengan backend Yii:
 * { meta: { code, success, message, timestamp }, data, pagination?, errors? }
 */
function payload({ success, code, message, data = null, errors = null, pagination = null }) {
  const body = {
    meta: {
      code,
      success,
      message,
      timestamp: new Date().toISOString(),
    },
    data,
  };

  if (pagination) body.pagination = pagination;
  if (errors) body.errors = errors;

  return body;
}

export const ResponseHelper = {
  success(res, data = null, message = Messages.SUCCESS, code = HttpStatus.OK) {
    return res.status(code).json(payload({ success: true, code, message, data }));
  },

  created(res, data = null, message = Messages.CREATED) {
    return this.success(res, data, message, HttpStatus.CREATED);
  },

  accepted(res, data = null, message = Messages.ACCEPTED) {
    return this.success(res, data, message, HttpStatus.ACCEPTED);
  },

  paginated(res, rows, { page, perPage, total }, message = Messages.FETCHED) {
    const pagination = {
      page,
      per_page: perPage,
      total,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    };
    return res.status(HttpStatus.OK).json(payload({ success: true, code: HttpStatus.OK, message, data: rows, pagination }));
  },

  error(res, message = Messages.SERVER_ERROR, code = HttpStatus.INTERNAL_SERVER_ERROR, errors = null) {
    return res.status(code).json(payload({ success: false, code, message, errors }));
  },

  payload,
};
