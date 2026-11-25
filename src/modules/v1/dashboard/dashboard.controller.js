import { Messages } from '../../../constants/messages.js';
import { ResponseHelper } from '../../../helpers/response.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async ringkasan(req, res) {
    ResponseHelper.success(res, await dashboardService.ringkasan(req.validated.query), Messages.FETCHED);
  },

  async kunjunganPerPoli(req, res) {
    ResponseHelper.success(res, await dashboardService.kunjunganPerPoli(req.validated.query), Messages.FETCHED);
  },

  async tren(req, res) {
    ResponseHelper.success(res, await dashboardService.tren(req.validated.query), Messages.FETCHED);
  },

  async tindakan(req, res) {
    ResponseHelper.success(res, await dashboardService.tindakanTerbanyak(req.validated.query), Messages.FETCHED);
  },

  async obat(req, res) {
    ResponseHelper.success(res, await dashboardService.penggunaanObat(req.validated.query), Messages.FETCHED);
  },

  async rincian(req, res) {
    const filter = req.validated.query;
    const { rows, total } = await dashboardService.rincian(filter);
    ResponseHelper.paginated(res, rows, { page: filter.page, perPage: filter.per_page, total });
  },

  async refresh(_req, res) {
    await dashboardService.refreshRekap();
    ResponseHelper.success(res, null, Messages.DASHBOARD_REFRESHED);
  },
};
