import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { requireAuth,requireRole } from '../middleware/auth.js';
import * as reversalController from '../controllers/reversal.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', paymentController.createPayment);
router.get('/', paymentController.listPayments);
router.post('/:id/reverse', requireRole('OWNER', 'MANAGER'), reversalController.reversePayment);
export default router;