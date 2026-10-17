import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, requireRole('OWNER'), userController.createUser);

router.get('/', requireAuth, requireRole('OWNER'), userController.listUsers);
router.patch('/:id/deactivate', requireAuth, requireRole('OWNER'), userController.deactivateUser);
export default router;