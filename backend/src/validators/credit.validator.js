import { Prisma } from '@prisma/client';
import { isUuid } from '../utils/uuid.js';
//
import { MAX_CREDIT_AMOUNT, MAX_BACKDATE_DAYS } from '../config/env.js';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/; // digits, optional 1-2 decimals
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function validateCreateCredit(body) {
  const errors = [];

  const customerId = body?.customerId;
  const idempotencyKey = body?.idempotencyKey;
  if (!isUuid(customerId)) errors.push('customerId must be a valid id');
  if (!isUuid(idempotencyKey)) errors.push('idempotencyKey must be a UUID');

  // Validate the amount as TEXT, so no floating-point math ever touches money.
  let amount = null;
  const isTextOrNumber = typeof body?.amount === 'string' || typeof body?.amount === 'number';
  const raw = isTextOrNumber ? String(body.amount).trim() : '';
  if (!AMOUNT_PATTERN.test(raw)) {
    errors.push('amount must be a positive number with at most 2 decimals');
  } else {
    const dec = new Prisma.Decimal(raw);
    if (dec.lte(0)) errors.push('amount must be greater than zero');
    else if (dec.gt(MAX_CREDIT_AMOUNT)) errors.push(`amount cannot exceed ${MAX_CREDIT_AMOUNT}`);
    else amount = dec.toFixed(2);
  }

  let description = null;
  if (body?.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string' || body.description.trim().length > 255) {
      errors.push('description must be text of 255 characters or fewer');
    } else {
      description = body.description.trim() || null;
    }
  }

  let entryDate = null;
  if (body?.entryDate !== undefined && body.entryDate !== null) {
    const d = typeof body.entryDate === 'string' ? new Date(body.entryDate) : new Date(NaN);
    const now = Date.now();
    if (Number.isNaN(d.getTime())) {
      errors.push('entryDate must be a valid date, like 2026-10-15');
    } else if (d.getTime() > now + CLOCK_SKEW_MS) {
      errors.push('entryDate cannot be in the future');
    } else if (d.getTime() < now - MAX_BACKDATE_DAYS * DAY_MS) {
      errors.push(`entryDate cannot be more than ${MAX_BACKDATE_DAYS} days in the past`);
    } else {
      entryDate = d;
    }
  }

  return { errors, value: { customerId, idempotencyKey, amount, description, entryDate } };
}

export function validateCreditListQuery(query) {
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