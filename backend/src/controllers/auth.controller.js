import { validateLogin } from '../validators/auth.validator.js';
import * as authService from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    const { errors, value } = validateLogin(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const result = await authService.login(value.email, value.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
export async function me(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}