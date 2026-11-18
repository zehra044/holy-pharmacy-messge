import {
  validatePrepareReminders,
  validateStatusUpdate,
  validateReminderListQuery,
} from '../validators/reminder.validator.js';
import * as reminderService from '../services/reminder.service.js';
import { isUuid } from '../utils/uuid.js';

export async function prepareReminders(req, res, next) {
  try {
    const { errors, value } = validatePrepareReminders(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const results = await reminderService.prepareReminders(req.user, value);
    const summary = {
      prepared: results.filter((r) => r.outcome === 'PREPARED').length,
      skipped: results.filter((r) => r.outcome === 'SKIPPED').length,
    };
    res.status(200).json({ summary, results });
  } catch (err) {
    next(err);
  }
}

export async function updateReminderStatus(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid reminder id' });

    const { errors, value } = validateStatusUpdate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const reminder = await reminderService.updateReminderStatus(req.user, req.params.id, value);
    res.status(200).json({ reminder });
  } catch (err) {
    next(err);
  }
}

export async function listReminders(req, res, next) {
  try {
    const { errors, value } = validateReminderListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const result = await reminderService.listReminders(req.user, value);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}