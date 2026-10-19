import { validateCreatePayment, validatePaymentListQuery } from '../validators/payment.validator.js';
import * as paymentService from '../services/payment.service.js';

export async function createPayment(req, res, next) {
  try {
    const { errors, value } = validateCreatePayment(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const { payment, created, balance, currency } = await paymentService.createPayment(req.user, value);
    // 201 = newly saved, 200 = a retry of something already saved
    res.status(created ? 201 : 200).json({ payment, alreadyRecorded: !created, balance, currency });
  } catch (err) {
    next(err);
  }
}

export async function listPayments(req, res, next) {
  try {
    const { errors, value } = validatePaymentListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const result = await paymentService.listPayments(req.user, value);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}