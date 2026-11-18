import { isUuid } from '../utils/uuid.js';
import { MAX_REMINDER_BATCH } from '../config/env.js';

const STATUSES = ['PREPARED', 'SENT', 'DELIVERED', 'FAILED'];
const REPORTABLE = ['SENT', 'DELIVERED', 'FAILED']; // the app cannot set PREPARED

export function validatePrepareReminders(body) {
  const errors = [];

  if (!isUuid(body?.templateId)) errors.push('templateId must be a valid id');

  let customerIds = [];
  if (!Array.isArray(body?.customerIds) || body.customerIds.length === 0) {
    errors.push('customerIds must be a non-empty list');
  } else if (body.customerIds.length > MAX_REMINDER_BATCH) {
    errors.push(`customerIds cannot contain more than ${MAX_REMINDER_BATCH} customers`);
  } else if (!body.customerIds.every(isUuid)) {
    errors.push('every customerId must be a valid id');
  } else {
    customerIds = [...new Set(body.customerIds)]; // drop duplicates
  }

  let force = false;
  if (body?.force !== undefined) {
    if (typeof body.force !== 'boolean') errors.push('force must be true or false');
    else force = body.force;
  }

  return { errors, value: { templateId: body?.templateId, customerIds, force } };
}

export function validateStatusUpdate(body) {
  const errors = [];

  const status = typeof body?.status === 'string' ? body.status.trim().toUpperCase() : '';
  if (!REPORTABLE.includes(status)) {
    errors.push(`status must be one of: ${REPORTABLE.join(', ')}`);
  }

  let failureReason = null;
  if (body?.failureReason !== undefined && body.failureReason !== null) {
    if (typeof body.failureReason !== 'string' || body.failureReason.trim().length > 255) {
      errors.push('failureReason must be text of 255 characters or fewer');
    } else {
      failureReason = body.failureReason.trim() || null;
    }
  }

  return { errors, value: { status, failureReason } };
}

export function validateReminderListQuery(query) {
  const errors = [];

  if (query.customerId !== undefined && !isUuid(query.customerId)) {
    errors.push('customerId must be a valid id');
  }

  let status;
  if (query.status !== undefined) {
    const s = String(query.status).toUpperCase();
    if (!STATUSES.includes(s)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
    else status = s;
  }

  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) errors.push('page must be a whole number, 1 or higher');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    errors.push('limit must be a whole number from 1 to 100');
  }

  return { errors, value: { customerId: query.customerId, status, page, limit } };
}