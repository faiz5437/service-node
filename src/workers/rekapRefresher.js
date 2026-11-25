import { config } from '../config/index.js';
import { dashboardService } from '../modules/v1/dashboard/dashboard.service.js';
import { logger } from '../utils/logger.js';

export function startRekapRefresher() {
  const refresh = async () => {
    try {
      await dashboardService.refreshRekap();
    } catch (error) {
      logger.error('Refresh rekap harian gagal', { error: error.message });
    }
  };

  refresh();
  const timer = setInterval(refresh, config.rekapRefreshIntervalMs);
  return () => clearInterval(timer);
}
