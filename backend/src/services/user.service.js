import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';

export async function createUser(actor, { fullName, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          businessId: actor.businessId,
          fullName,
          email,
          passwordHash,
          role,
        },
        select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
      });

      await tx.auditLog.create({
        data: {
          businessId: actor.businessId,
          userId: actor.id,
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: user.id,
          after: { fullName: user.fullName, email: user.email, role: user.role },
        },
      });

      return user;
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const conflict = new Error('Email already in use');
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }
}
export async function listUsers(actor, filters = {}) {
  return prisma.user.findMany({
    where: {
      businessId: actor.businessId,
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    },
    select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function deactivateUser(actor, targetId) {
  if (targetId === actor.id) {
    const err = new Error('You cannot deactivate your own account');
    err.status = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    // Filtering by businessId means another business's user simply "doesn't exist".
    const user = await tx.user.findFirst({
      where: { id: targetId, businessId: actor.businessId },
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (!user.isActive) {
      return user; // already deactivated, nothing to do
    }

    const updated = await tx.user.update({
      where: { id: user.id },
      data: { isActive: false },
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });

    await tx.auditLog.create({
      data: {
        businessId: actor.businessId,
        userId: actor.id,
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: user.id,
        before: { isActive: true },
        after: { isActive: false },
      },
    });

    return updated;
  });
}