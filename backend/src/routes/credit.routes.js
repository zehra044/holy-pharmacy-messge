import { Router } from 'express';
import * as creditController from '../controllers/credit.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', creditController.createCreditEntry);
router.get('/', creditController.listCreditEntries);

export default router;