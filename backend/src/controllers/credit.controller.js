import { validateCreateCredit, validateCreditListQuery } from '../validators/credit.validator.js';
import * as creditService from '../services/credit.service.js';

export async function createCreditEntry(req, res, next) {
  try {
    const { errors, value } = validateCreateCredit(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const { entry, created } = await creditService.createCreditEntry(req.user, value);
    // 201 = newly saved, 200 = this was a retry of something already saved
    res.status(created ? 201 : 200).json({ entry, alreadyRecorded: !created });
  } catch (err) {
    next(err);
  }
}

export async function listCreditEntries(req, res, next) {
  try {
    const { errors, value } = validateCreditListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const result = await creditService.listCreditEntries(req.user, value);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}