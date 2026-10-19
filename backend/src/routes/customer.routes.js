import { Router } from 'express';
import * as customerController from '../controllers/customer.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth); // every customer route needs a logged-in user

router.post('/', customerController.createCustomer);
router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);
router.patch('/:id', customerController.updateCustomer);
router.get('/:id/balance', customerController.getCustomerBalance);

router.patch('/:id/deactivate', requireRole('OWNER', 'MANAGER'), customerController.deactivateCustomer);
router.patch('/:id/reactivate', requireRole('OWNER', 'MANAGER'), customerController.reactivateCustomer);

export default router;