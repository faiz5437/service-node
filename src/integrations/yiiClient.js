import { config } from '../config/index.js';
import { APIHelper } from '../helpers/apiHelper.js';

const yii = APIHelper.create({
  baseURL: config.yii.baseURL,
  headers: { 'X-Service-Key': config.yii.serviceKey },
  timeout: 8000,
  retries: 2,
});

/**
 * Node tidak menyimpan hasil lab sendiri. Hasil diteruskan ke Yii yang memiliki aturan bisnisnya,
 * sehingga logika penyimpanan hasil lab hanya ada di satu tempat.
 */
export const yiiClient = {
  async kirimHasilLab(payload) {
    const idempotencyKey = `${payload.no_order}:${payload.hasil.map((h) => h.external_result_id).join(',')}`;
    const { data } = await yii.post('/internal/hasil-lab', payload, { headers: { 'Idempotency-Key': idempotencyKey } });
    return data?.data;
  },
};
