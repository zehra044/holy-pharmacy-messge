import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';

export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same error for "no such email", "wrong password" and "deactivated",
  // so an attacker cannot learn which emails exist.
  const invalid = new Error('Invalid email or password');
  invalid.status = 401;

  if (!user || !user.isActive) {
    throw invalid;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw invalid;
  }

  const token = jwt.sign(
    { userId: user.id, businessId: user.businessId, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}
export async function getProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, role: true, businessId: true },
  });
}