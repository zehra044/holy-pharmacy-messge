import { Router } from 'express';
import * as templateController from '../controllers/template.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Everyone can view and use templates.
router.get('/', templateController.listTemplates);
router.get('/:id', templateController.getTemplate);

// Only Owner and Manager can create or edit them.
router.post('/', requireRole('OWNER', 'MANAGER'), templateController.createTemplate);
router.patch('/:id', requireRole('OWNER', 'MANAGER'), templateController.updateTemplate);

export default router;