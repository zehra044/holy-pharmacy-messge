import { validateReversal } from '../validators/reversal.validator.js';
import { reverseRecord } from '../services/reversal.service.js';
import { isUuid } from '../utils/uuid.js';

async function handle(kind, req, res, next) {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const { errors, value } = validateReversal(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const result = await reverseRecord(kind, req.user, req.params.id, value.reason);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export const reversePayment = (req, res, next) => handle('payment', req, res, next);
export const reverseCreditEntry = (req, res, next) => handle('credit', req, res, next);