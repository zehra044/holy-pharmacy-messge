import { Router } from 'express';
import * as creditController from '../controllers/credit.controller.js';
import { requireAuth ,requireRole} from '../middleware/auth.js';

import * as reversalController from '../controllers/reversal.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', creditController.createCreditEntry);
router.get('/', creditController.listCreditEntries);
router.post('/:id/reverse', requireRole('OWNER', 'MANAGER'), reversalController.reverseCreditEntry);
export default router;