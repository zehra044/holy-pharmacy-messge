import { Prisma } from '@prisma/client';
import { isUuid } from '../utils/uuid.js';
import { MAX_PAYMENT_AMOUNT, MAX_BACKDATE_DAYS } from '../config/env.js';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'];
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function validateCreatePayment(body) {
  const errors = [];

  const customerId = body?.customerId;
  const idempotencyKey = body?.idempotencyKey;
  if (!isUuid(customerId)) errors.push('customerId must be a valid id');
  if (!isUuid(idempotencyKey)) errors.push('idempotencyKey must be a UUID');

  let amount = null;
  const isTextOrNumber = typeof body?.amount === 'string' || typeof body?.amount === 'number';
  const raw = isTextOrNumber ? String(body.amount).trim() : '';
  if (!AMOUNT_PATTERN.test(raw)) {
    errors.push('amount must be a positive number with at most 2 decimals');
  } else {
    const dec = new Prisma.Decimal(raw);
    if (dec.lte(0)) errors.push('amount must be greater than zero');
    else if (dec.gt(MAX_PAYMENT_AMOUNT)) errors.push(`amount cannot exceed ${MAX_PAYMENT_AMOUNT}`);
    else amount = dec.toFixed(2);
  }

  let method = 'CASH';
  if (body?.method !== undefined && body.method !== null) {
    const m = typeof body.method === 'string' ? body.method.trim().toUpperCase() : '';
    if (!METHODS.includes(m)) errors.push(`method must be one of: ${METHODS.join(', ')}`);
    else method = m;
  }

  let paymentDate = null;
  if (body?.paymentDate !== undefined && body.paymentDate !== null) {
    const d = typeof body.paymentDate === 'string' ? new Date(body.paymentDate) : new Date(NaN);
    const now = Date.now();
    if (Number.isNaN(d.getTime())) {
      errors.push('paymentDate must be a valid date, like 2026-10-15');
    } else if (d.getTime() > now + CLOCK_SKEW_MS) {
      errors.push('paymentDate cannot be in the future');
    } else if (d.getTime() < now - MAX_BACKDATE_DAYS * DAY_MS) {
      errors.push(`paymentDate cannot be more than ${MAX_BACKDATE_DAYS} days in the past`);
    } else {
      paymentDate = d;
    }
  }

  return { errors, value: { customerId, idempotencyKey, amount, method, paymentDate } };
}

export function validatePaymentListQuery(query) {
  const errors = [];
  if (!isUuid(query.customerId)) errors.push('customerId is required and must be a valid id');

  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) errors.push('page must be a whole number, 1 or higher');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    errors.push('limit must be a whole number from 1 to 100');
  }

  return { errors, value: { customerId: query.customerId, page, limit } };
}