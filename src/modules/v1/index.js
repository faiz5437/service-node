import { Router } from 'express';
import { ResponseHelper } from '../../helpers/response.js';
import dashboardRoutes from './dashboard/dashboard.routes.js';
import labRoutes from './lab/lab.routes.js';

/**
 * Routing API versi 1, dipasang di /api/v1 oleh app.js.
 */
const router = Router();

router.get('/health', (_req, res) => ResponseHelper.success(res, { service: 'simrs-node', version: 'v1', uptime: Math.round(process.uptime()) }));
router.use('/dashboard', dashboardRoutes);
router.use('/lab', labRoutes);

export default router;
