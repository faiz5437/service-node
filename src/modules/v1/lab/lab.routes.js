import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../../config/index.js';
import { HttpStatus } from '../../../constants/httpStatus.js';
import { Messages } from '../../../constants/messages.js';
import { asyncHandler } from '../../../helpers/asyncHandler.js';
import { ResponseHelper } from '../../../helpers/response.js';
import { requireApiKey } from '../../../middlewares/apiKey.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { validate } from '../../../middlewares/validate.js';
import { labController as c } from './lab.controller.js';
import { hasilSchema, idParamSchema, orderListSchema, outboxListSchema } from './lab.schema.js';

const router = Router();

const externalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => ResponseHelper.error(res, Messages.TOO_MANY_REQUESTS, HttpStatus.TOO_MANY_REQUESTS),
});

// Endpoint untuk sistem laboratorium eksternal (autentikasi X-API-Key)
const external = Router();
external.use(externalLimiter, requireApiKey(() => config.lis.inboundApiKey));
external.get('/orders', validate({ query: orderListSchema }), asyncHandler(c.daftarOrder));
external.post('/results', validate({ body: hasilSchema }), asyncHandler(c.terimaHasil));

// Endpoint pemantauan integrasi untuk pengguna aplikasi (autentikasi JWT)
const internal = Router();
internal.use(authenticate);
internal.get('/status', authorize('prosesLab', 'lihatDashboard'), asyncHandler(c.statusIntegrasi));
internal.get('/outbox', authorize('prosesLab', 'lihatDashboard'), validate({ query: outboxListSchema }), asyncHandler(c.daftarOutbox));
internal.post('/outbox/:id/retry', authorize('kelolaMaster'), validate({ params: idParamSchema }), asyncHandler(c.ulangiOutbox));

router.use('/external', external);
router.use('/integrasi', internal);

export default router;
