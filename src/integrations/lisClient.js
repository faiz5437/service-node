import { config } from '../config/index.js';
import { APIHelper } from '../helpers/apiHelper.js';

const lis = APIHelper.create({
  baseURL: config.lis.baseURL,
  headers: { 'X-API-Key': config.lis.apiKey },
  timeout: 5000,
  retries: 0,
});

/**
 * Client ke Laboratory Information System (LIS) eksternal.
 * Retry diatur oleh outbox worker (dengan jeda bertahap), bukan di sini.
 */
export const lisClient = {
  async kirimOrder(event) {
    const { data } = await lis.post('/orders', event.payload, { headers: { 'Idempotency-Key': event.id } });
    return data;
  },
};
