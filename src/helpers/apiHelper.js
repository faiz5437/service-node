import { config } from '../config/index.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { ExternalServiceError } from '../errors/AppError.js';

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);
const RETRYABLE_STATUS = new Set([HttpStatus.TOO_MANY_REQUESTS, HttpStatus.BAD_GATEWAY, HttpStatus.SERVICE_UNAVAILABLE, HttpStatus.GATEWAY_TIMEOUT]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * HTTP client untuk komunikasi ke sistem luar.
 *
 *   await APIHelper.get('/data', { params: { page: 1 } });
 *   await APIHelper.post('/orders', payload);
 *
 *   const lis = APIHelper.create({ baseURL: 'https://lis.example.com', headers: { 'X-API-Key': '...' } });
 *   await lis.post('/orders', payload, { timeout: 5000 });
 *
 * Retry otomatis hanya untuk method idempotent (atau bila header Idempotency-Key dikirim),
 * pada kegagalan jaringan, timeout, dan status 429/502/503/504.
 */
export class APIHelper {
  constructor({ baseURL = '', headers = {}, timeout = 10000, retries = 2, retryDelay = 300 } = {}) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.headers = headers;
    this.timeout = timeout;
    this.retries = retries;
    this.retryDelay = retryDelay;
  }

  static create(options) {
    return new APIHelper(options);
  }

  static get(url, options) {
    return defaultClient.get(url, options);
  }

  static post(url, body, options) {
    return defaultClient.post(url, body, options);
  }

  static put(url, body, options) {
    return defaultClient.put(url, body, options);
  }

  static patch(url, body, options) {
    return defaultClient.patch(url, body, options);
  }

  static delete(url, options) {
    return defaultClient.delete(url, options);
  }

  get(url, options = {}) {
    return this.request('GET', url, options);
  }

  post(url, body, options = {}) {
    return this.request('POST', url, { ...options, body });
  }

  put(url, body, options = {}) {
    return this.request('PUT', url, { ...options, body });
  }

  patch(url, body, options = {}) {
    return this.request('PATCH', url, { ...options, body });
  }

  delete(url, options = {}) {
    return this.request('DELETE', url, options);
  }

  async request(method, url, { params, body, headers = {}, timeout = this.timeout, retries } = {}) {
    const target = this.buildUrl(url, params);
    const allHeaders = { Accept: 'application/json', ...this.headers, ...headers };
    const canRetry = IDEMPOTENT_METHODS.has(method) || Object.keys(allHeaders).some((h) => h.toLowerCase() === 'idempotency-key');
    const maxAttempts = 1 + (canRetry ? retries ?? this.retries : 0);

    if (body !== undefined && !(body instanceof FormData)) {
      allHeaders['Content-Type'] = 'application/json';
    }

    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.send(method, target, allHeaders, body, timeout);
      } catch (error) {
        lastError = error;
        const retryable = error.upstreamStatus === null || RETRYABLE_STATUS.has(error.upstreamStatus);
        if (attempt === maxAttempts || !retryable) break;
        await sleep(this.retryDelay * 2 ** (attempt - 1));
      }
    }

    throw lastError;
  }

  async send(method, url, headers, body, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = error.name === 'AbortError';
      throw new ExternalServiceError(
        timedOut ? Messages.UPSTREAM_TIMEOUT : Messages.UPSTREAM_UNAVAILABLE,
        timedOut ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.SERVICE_UNAVAILABLE,
        { url }
      );
    } finally {
      clearTimeout(timer);
    }

    const data = await this.parse(response);

    if (!response.ok) {
      const upstreamMessage = data?.meta?.message ?? data?.message;
      const status = response.status >= 500 ? HttpStatus.BAD_GATEWAY : response.status;
      throw new ExternalServiceError(upstreamMessage ?? Messages.UPSTREAM_ERROR, status, {
        upstreamStatus: response.status,
        upstreamBody: data,
        url,
      });
    }

    return { status: response.status, data, headers: Object.fromEntries(response.headers) };
  }

  async parse(response) {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  buildUrl(url, params) {
    const full = /^https?:\/\//i.test(url) ? url : `${this.baseURL}/${url.replace(/^\/+/, '')}`;
    if (!params) return full;

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, value);
    });

    const qs = query.toString();
    return qs ? `${full}${full.includes('?') ? '&' : '?'}${qs}` : full;
  }
}

const defaultClient = new APIHelper({ baseURL: config.externalApiUrl });
