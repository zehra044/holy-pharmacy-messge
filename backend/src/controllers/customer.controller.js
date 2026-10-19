import {
  validateCreateCustomer,
  validateUpdateCustomer,
  validateListQuery,
} from '../validators/customer.validator.js';
import * as customerService from '../services/customer.service.js';
import { isUuid } from '../utils/uuid.js';

function invalidId(res) {
  return res.status(400).json({ error: 'Invalid customer id' });
}

export async function createCustomer(req, res, next) {
  try {
    const { errors, value } = validateCreateCustomer(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const customer = await customerService.createCustomer(req.user, value);
    res.status(201).json({ customer });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req, res, next) {
  try {
    const { errors, value } = validateListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const result = await customerService.listCustomers(req.user, value);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCustomer(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return invalidId(res);
    const customer = await customerService.getCustomer(req.user, req.params.id);
    res.status(200).json({ customer });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return invalidId(res);
    const { errors, value } = validateUpdateCustomer(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const customer = await customerService.updateCustomer(req.user, req.params.id, value);
    res.status(200).json({ customer });
  } catch (err) {
    next(err);
  }
}

export async function deactivateCustomer(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return invalidId(res);
    const customer = await customerService.setCustomerActive(req.user, req.params.id, false);
    res.status(200).json({ customer });
  } catch (err) {
    next(err);
  }
}

export async function reactivateCustomer(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return invalidId(res);
    const customer = await customerService.setCustomerActive(req.user, req.params.id, true);
    res.status(200).json({ customer });
  } catch (err) {
    next(err);
  }
}
export async function getCustomerBalance(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return invalidId(res);
    const balance = await customerService.getCustomerBalance(req.user, req.params.id);
    res.status(200).json({ balance });
  } catch (err) {
    next(err);
  }
}