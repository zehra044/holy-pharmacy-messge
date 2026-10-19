import { normalizePhone } from '../utils/phone.js';

function cleanName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function validateCreateCustomer(body) {
  const errors = [];
  const name = cleanName(body?.name);
  const phone = normalizePhone(body?.phone);
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';

  if (!name) errors.push('Name is required');
  if (name.length > 120) errors.push('Name must be 120 characters or fewer');
  if (!phone) errors.push('A valid phone number is required');
  if (notes.length > 500) errors.push('Notes must be 500 characters or fewer');

  return { errors, value: { name, phone, notes: notes || null } };
}

export function validateUpdateCustomer(body) {
  const errors = [];
  const value = {};

  if (body?.name !== undefined) {
    const name = cleanName(body.name);
    if (!name || name.length > 120) errors.push('Name must be 1 to 120 characters');
    else value.name = name;
  }

  if (body?.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (!phone) errors.push('A valid phone number is required');
    else value.phone = phone;
  }

  if (body?.notes !== undefined) {
    if (body.notes === null) {
      value.notes = null;
    } else if (typeof body.notes === 'string' && body.notes.trim().length <= 500) {
      value.notes = body.notes.trim() || null;
    } else {
      errors.push('Notes must be text of 500 characters or fewer');
    }
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('Provide at least one field to update: name, phone or notes');
  }

  return { errors, value };
}

export function validateListQuery(query) {
  const errors = [];

  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) errors.push('page must be a whole number, 1 or higher');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    errors.push('limit must be a whole number from 1 to 100');
  }

  // Default: active customers only. "all" returns both.
  let isActive = true;
  if (query.isActive === 'false') isActive = false;
  else if (query.isActive === 'all') isActive = undefined;
  else if (query.isActive !== undefined && query.isActive !== 'true') {
    errors.push('isActive must be "true", "false" or "all"');
  }

  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';

  return { errors, value: { page, limit, isActive, search } };
}