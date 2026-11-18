import prisma from '../config/prisma.js';

const templateSelect = {
  id: true,
  name: true,
  body: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, fullName: true } },
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function createTemplate(actor, { name, body }) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.messageTemplate.create({
      data: { businessId: actor.businessId, name, body, createdById: actor.id },
      select: templateSelect,
    });

    await tx.auditLog.create({
      data: {
        businessId: actor.businessId,
        userId: actor.id,
        action: 'TEMPLATE_CREATED',
        entityType: 'MessageTemplate',
        entityId: created.id,
        after: { name, body },
      },
    });

    return created;
  });
}

export async function listTemplates(actor, { isActive }) {
  return prisma.messageTemplate.findMany({
    where: {
      businessId: actor.businessId,
      ...(isActive !== undefined && { isActive }),
    },
    select: templateSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTemplate(actor, id) {
  const template = await prisma.messageTemplate.findFirst({
    where: { id, businessId: actor.businessId },
    select: templateSelect,
  });
  if (!template) throw httpError(404, 'Template not found');
  return template;
}

export async function updateTemplate(actor, id, changes) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.messageTemplate.findFirst({
      where: { id, businessId: actor.businessId },
      select: templateSelect,
    });
    if (!existing) throw httpError(404, 'Template not found');

    // Record only what actually changed.
    const before = {};
    const after = {};
    for (const key of Object.keys(changes)) {
      if (changes[key] !== existing[key]) {
        before[key] = existing[key];
        after[key] = changes[key];
      }
    }
    if (Object.keys(after).length === 0) return existing;

    const updated = await tx.messageTemplate.update({
      where: { id: existing.id },
      data: after,
      select: templateSelect,
    });

    await tx.auditLog.create({
      data: {
        businessId: actor.businessId,
        userId: actor.id,
        action: 'TEMPLATE_UPDATED',
        entityType: 'MessageTemplate',
        entityId: existing.id,
        before,
        after,
      },
    });

    return updated;
  });
}