import { HttpStatus } from '../../../constants/httpStatus.js';
import { Messages } from '../../../constants/messages.js';
import { ExternalServiceError } from '../../../errors/AppError.js';
import { ResponseHelper } from '../../../helpers/response.js';
import { labService } from './lab.service.js';

export const labController = {
  async daftarOrder(req, res) {
    ResponseHelper.success(res, await labService.daftarOrder(req.validated.query), Messages.FETCHED);
  },

  /**
   * D5: jika Yii tidak dapat diakses, hasil tidak di-ACK (503) sehingga sistem lab mengirim ulang.
   * Penyimpanan di Yii idempotent berdasarkan external_result_id, jadi pengiriman ulang tidak membuat data dobel.
   */
  async terimaHasil(req, res) {
    try {
      const result = await labService.teruskanHasil(req.validated.body);
      ResponseHelper.success(res, result, Messages.LAB_HASIL_DITERIMA);
    } catch (error) {
      if (error instanceof ExternalServiceError && error.statusCode >= HttpStatus.BAD_GATEWAY) {
        return ResponseHelper.error(res, Messages.LAB_HASIL_TERTUNDA, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw error;
    }
  },

  async statusIntegrasi(_req, res) {
    ResponseHelper.success(res, await labService.statusIntegrasi(), Messages.FETCHED);
  },

  async daftarOutbox(req, res) {
    const filter = req.validated.query;
    const { rows, total } = await labService.daftarOutbox(filter);
    ResponseHelper.paginated(res, rows, { page: filter.page, perPage: filter.per_page, total });
  },

  async ulangiOutbox(req, res) {
    ResponseHelper.success(res, await labService.ulangiOutbox(req.validated.params.id), Messages.OUTBOX_DIJADWALKAN);
  },
};
