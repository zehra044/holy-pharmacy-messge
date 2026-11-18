import { Router } from 'express';
import * as reminderController from '../controllers/reminder.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', reminderController.prepareReminders);
router.get('/', reminderController.listReminders);
router.patch('/:id/status', reminderController.updateReminderStatus);

export default router;