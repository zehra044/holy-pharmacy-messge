import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { JWT_SECRET } from '../config/env.js';

function unauthorized(message = 'Authentication required') {
  const err = new Error(message);
  err.status = 401;
  return err;
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw unauthorized();
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    // Check the user still exists and is still active.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, businessId: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw unauthorized('Invalid or expired token');
    }

    // Use the database values, not the token's, so role changes apply immediately.
    req.user = { id: user.id, businessId: user.businessId, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const err = new Error('You do not have permission to do this');
      err.status = 403;
      return next(err);
    }
    next();
  };
}