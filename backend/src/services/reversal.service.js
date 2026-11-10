import prisma from '../config/prisma.js';
import { getBalanceDetail } from './balance.service.js';
import { MANAGER_REVERSAL_HOURS, MANAGER_REVERSAL_MAX_AMOUNT } from '../config/env.js';

const HOUR_MS = 60 * 60 * 1000;

const KINDS = {
  payment: {
    delegate: 'payment',
    label: 'payment',
    entityType: 'Payment',
    action: 'PAYMENT_REVERSED',
    extraSelect: { method: true, paymentDate: true },
  },
  credit: {
    delegate: 'creditEntry',
    label: 'credit entry',
    entityType: 'CreditEntry',
    action: 'CREDIT_ENTRY_REVERSED',
    extraSelect: { description: true, entryDate: true },
  },
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function serialize(record) {
  return { ...record, amount: record.amount.toFixed(2) };
}

// Managers may only correct recent, smaller records. The Owner handles the rest.
// The age is measured from createdAt (when it was recorded in the system),
// not from the entry date, so a backdated entry can't dodge the limit.
function checkManagerLimits(record) {
  const ageMs = Date.now() - record.createdAt.getTime();
  if (ageMs > MANAGER_REVERSAL_HOURS * HOUR_MS) {
    throw httpError(
      403,
      `Managers can only reverse records created in the last ${MANAGER_REVERSAL_HOURS} hours. Ask the Owner.`
    );
  }
  if (record.amount.gt(MANAGER_REVERSAL_MAX_AMOUNT)) {
    throw httpError(
      403,
      `Managers can only reverse amounts up to ${MANAGER_REVERSAL_MAX_AMOUNT}. Ask the Owner.`
    );
  }
}

export async function reverseRecord(kind, actor, id, reason) {
  const cfg = KINDS[kind];

  // The route already blocks employees. This second check protects us if a
  // future route forgets the middleware.
  if (actor.role !== 'OWNER' && actor.role !== 'MANAGER') {
    throw httpError(403, 'You do not have permission to do this');
  }

  const select = {
    id: true,
    customerId: true,
    amount: true,
    status: true,
    createdAt: true,
    reversedAt: true,
    reversalReason: true,
    createdBy: { select: { id: true, fullName: true } },
    reversedBy: { select: { id: true, fullName: true } },
    ...cfg.extraSelect,
  };

  const record = await prisma.$transaction(async (tx) => {
    const delegate = tx[cfg.delegate];

    const existing = await delegate.findFirst({
      where: { id, businessId: actor.businessId },
      select,
    });
    if (!existing) throw httpError(404, `${cfg.label} not found`);
    if (existing.status === 'REVERSED') {
      throw httpError(409, `This ${cfg.label} was already reversed`);
    }

    if (actor.role === 'MANAGER') checkManagerLimits(existing);

    // The update itself is the check: it only matches a row that is still
    // POSTED. If two people click at the same moment, the database lets one
    // update succeed and the other matches zero rows.
    const result = await delegate.updateMany({
      where: { id: existing.id, businessId: actor.businessId, status: 'POSTED' },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: actor.id,
        reversalReason: reason,
      },
    });
    if (result.count === 0) {
      throw httpError(409, `This ${cfg.label} was already reversed`);
    }

    await tx.auditLog.create({
      data: {
        businessId: actor.businessId,
        userId: actor.id,
        action: cfg.action,
        entityType: cfg.entityType,
        entityId: existing.id,
        before: { status: 'POSTED' },
        after: {
          status: 'REVERSED',
          reason,
          customerId: existing.customerId,
          amount: existing.amount.toFixed(2),
        },
      },
    });

    return delegate.findUnique({ where: { id: existing.id }, select });
  });

  const detail = await getBalanceDetail(actor.businessId, record.customerId);
  return { record: serialize(record), balance: detail.balance, currency: detail.currency };
}