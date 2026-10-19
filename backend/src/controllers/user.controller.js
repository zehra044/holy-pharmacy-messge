import { validateCreateUser } from '../validators/user.validator.js';
import * as userService from '../services/user.service.js';
import { isUuid } from '../utils/uuid.js';
export async function createUser(req, res, next) {
  try {
    const { errors, value } = validateCreateUser(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const user = await userService.createUser(req.user, value);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    const { isActive } = req.query;

    if (isActive !== undefined && isActive !== 'true' && isActive !== 'false') {
      return res.status(400).json({ error: 'isActive must be "true" or "false"' });
    }

    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true'; // query values are strings, so convert
    }

    const users = await userService.listUsers(req.user, filters);
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}

export async function deactivateUser(req, res, next) {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const user = await userService.deactivateUser(req.user, req.params.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}