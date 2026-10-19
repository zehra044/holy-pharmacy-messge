import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { getBalanceDetail } from './balance.service.js';

const paymentSelect = {
  id: true,
  customerId: true,
  amount: true,
  method: true,
  paymentDate: true,
  status: true,
  createdAt: true,
  createdBy: { select: { id: true, fullName: true } },
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function serialize(payment) {
  return { ...payment, amount: payment.amount.toFixed(2) };
}

function findByKey(businessId, idempotencyKey) {
  return prisma.payment.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
    select: paymentSelect,
  });
}

// Same key again. Same request = return the original. Different request = refuse.
function replay(existing, input) {
  const same =
    existing.customerId === input.customerId &&
    new Prisma.Decimal(input.amount).equals(existing.amount) &&
    existing.method === input.method &&
    (!input.paymentDate || existing.paymentDate.getTime() === input.paymentDate.getTime());

  if (!same) {
    throw httpError(409, 'This idempotencyKey was already used for a different payment');
  }
  return { payment: serialize(existing), created: false };
}

async function withBalance(actor, result) {
  const detail = await getBalanceDetail(actor.businessId, result.payment.customerId);
  return { ...result, balance: detail.balance, currency: detail.currency };
}

export async function createPayment(actor, input) {
  // A retry of something already saved returns the original.
  const existing = await findByKey(actor.businessId, input.idempotencyKey);
  if (existing) return withBalance(actor, replay(existing, input));

  try {
    const payment = await prisma.$transaction(async (tx) => {
      // Deactivated customers can still pay what they owe.
      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, businessId: actor.businessId },
        select: { id: true },
      });
      if (!customer) throw httpError(404, 'Customer not found');

      const created = await tx.payment.create({
        data: {
          businessId: actor.businessId,
          customerId: input.customerId,
          amount: input.amount,
          method: input.method,
          ...(input.paymentDate && { paymentDate: input.paymentDate }),
          idempotencyKey: input.idempotencyKey,
          createdById: actor.id,
        },
        select: paymentSelect,
      });

      await tx.auditLog.create({
        data: {
          businessId: actor.businessId,
          userId: actor.id,
          action: 'PAYMENT_RECORDED',
          entityType: 'Payment',
          entityId: created.id,
          after: {
            customerId: created.customerId,
            amount: created.amount.toFixed(2),
            method: created.method,
            paymentDate: created.paymentDate,
          },
        },
      });

      return created;
    });

    return withBalance(actor, { payment: serialize(payment), created: true });
  } catch (err) {
    // Two identical requests at the same instant: return the winner.
    if (err.code === 'P2002') {
      const winner = await findByKey(actor.businessId, input.idempotencyKey);
      if (winner) return withBalance(actor, replay(winner, input));
    }
    throw err;
  }
}

export async function listPayments(actor, { customerId, page, limit }) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: actor.businessId },
    select: { id: true },
  });
  if (!customer) throw httpError(404, 'Customer not found');

  const where = { businessId: actor.businessId, customerId };

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { payments: payments.map(serialize), page, limit, total };
}