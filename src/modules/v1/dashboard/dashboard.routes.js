import { Router } from 'express';
import { asyncHandler } from '../../../helpers/asyncHandler.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { validate } from '../../../middlewares/validate.js';
import { dashboardController as c } from './dashboard.controller.js';
import { periodeSchema, rincianSchema } from './dashboard.schema.js';

const router = Router();
const periode = validate({ query: periodeSchema });

router.use(authenticate, authorize('lihatDashboard'));

router.get('/ringkasan', periode, asyncHandler(c.ringkasan));
router.get('/kunjungan-poli', periode, asyncHandler(c.kunjunganPerPoli));
router.get('/tren', periode, asyncHandler(c.tren));
router.get('/tindakan', periode, asyncHandler(c.tindakan));
router.get('/obat', periode, asyncHandler(c.obat));
router.get('/rincian', validate({ query: rincianSchema }), asyncHandler(c.rincian));
router.post('/refresh', asyncHandler(c.refresh));

export default router;
