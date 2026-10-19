import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';

const entrySelect = {
  id: true,
  customerId: true,
  amount: true,
  description: true,
  entryDate: true,
  status: true,
  createdAt: true,
  createdBy: { select: { id: true, fullName: true } },
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function serialize(entry) {
  return { ...entry, amount: entry.amount.toFixed(2) };
}

function findByKey(businessId, idempotencyKey) {
  return prisma.creditEntry.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
    select: entrySelect,
  });
}

// Same key arrived again. Same request = return the original. Different request = refuse.
function replay(existing, input) {
  const same =
    existing.customerId === input.customerId &&
    new Prisma.Decimal(input.amount).equals(existing.amount) &&
    (existing.description ?? null) === (input.description ?? null) &&
    (!input.entryDate || existing.entryDate.getTime() === input.entryDate.getTime());

  if (!same) {
    throw httpError(409, 'This idempotencyKey was already used for a different credit entry');
  }
  return { entry: serialize(existing), created: false };
}

export async function createCreditEntry(actor, input) {
  // A retry of something already saved returns the original, even if the
  // customer has been deactivated since.
  const existing = await findByKey(actor.businessId, input.idempotencyKey);
  if (existing) return replay(existing, input);

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, businessId: actor.businessId },
        select: { id: true, isActive: true },
      });
      if (!customer) throw httpError(404, 'Customer not found');
      if (!customer.isActive) throw httpError(400, 'Customer is deactivated');

      const created = await tx.creditEntry.create({
        data: {
          businessId: actor.businessId,
          customerId: input.customerId,
          amount: input.amount,
          description: input.description,
          ...(input.entryDate && { entryDate: input.entryDate }),
          idempotencyKey: input.idempotencyKey,
          createdById: actor.id,
        },
        select: entrySelect,
      });

      await tx.auditLog.create({
        data: {
          businessId: actor.businessId,
          userId: actor.id,
          action: 'CREDIT_ENTRY_CREATED',
          entityType: 'CreditEntry',
          entityId: created.id,
          after: {
            customerId: created.customerId,
            amount: created.amount.toFixed(2),
            description: created.description,
            entryDate: created.entryDate,
          },
        },
      });

      return created;
    });

    return { entry: serialize(entry), created: true };
  } catch (err) {
    // Two identical requests arrived at the same instant: the database let one
    // win. Return the winner instead of an error.
    if (err.code === 'P2002') {
      const winner = await findByKey(actor.businessId, input.idempotencyKey);
      if (winner) return replay(winner, input);
    }
    throw err;
  }
}

export async function listCreditEntries(actor, { customerId, page, limit }) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: actor.businessId },
    select: { id: true },
  });
  if (!customer) throw httpError(404, 'Customer not found');

  const where = { businessId: actor.businessId, customerId };

  const [total, entries] = await Promise.all([
    prisma.creditEntry.count({ where }),
    prisma.creditEntry.findMany({
      where,
      select: entrySelect,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { entries: entries.map(serialize), page, limit, total };
}
export async function getCustomerBalance(actor, id) {
  const customer = await prisma.customer.findFirst({
    where: { id, businessId: actor.businessId },
    select: { id: true },
  });
  if (!customer) throw httpError(404, 'Customer not found');
  return getBalanceDetail(actor.businessId, id);
}