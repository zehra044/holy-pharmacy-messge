import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { renderTemplate } from '../utils/template.js';
import { REMINDER_COOLDOWN_DAYS } from '../config/env.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const COUNTS_TOWARD_WINDOW = ['PREPARED', 'SENT', 'DELIVERED']; // FAILED does not block a retry
const ZERO = new Prisma.Decimal(0);

// newStatus -> statuses it may come from
const TRANSITIONS = {
  SENT: ['PREPARED'],
  DELIVERED: ['SENT'],
  FAILED: ['PREPARED', 'SENT'],
};

const reminderSelect = {
  id: true,
  customerId: true,
  message: true,
  balanceSnapshot: true,
  status: true,
  failureReason: true,
  createdAt: true,
  sentAt: true,
  customer: { select: { id: true, name: true, phone: true } },
  sentBy: { select: { id: true, fullName: true } },
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function serialize(reminder) {
  return { ...reminder, balanceSnapshot: reminder.balanceSnapshot.toFixed(2) };
}

function skipped(customerId, customerName, reason, detail, extra = {}) {
  return { customerId, customerName, outcome: 'SKIPPED', reason, detail, ...extra };
}

// One customer = one short transaction, so one problem never undoes the others.
async function prepareOne(actor, template, currency, customerId, force) {
  return prisma.$transaction(async (tx) => {
    // Two requests for the same customer at the same instant would both pass
    // the "recently reminded?" check below. The lock makes the second one wait
    // until the first commits, so it then sees the first one's row.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${actor.businessId + ':' + customerId}::text))`;

    const customer = await tx.customer.findFirst({
      where: { id: customerId, businessId: actor.businessId },
      select: { id: true, name: true, phone: true, isActive: true },
    });
    if (!customer) return skipped(customerId, null, 'NOT_FOUND', 'Customer not found');
    if (!customer.isActive) {
      return skipped(customerId, customer.name, 'DEACTIVATED', 'Customer is deactivated');
    }

    const where = { businessId: actor.businessId, customerId, status: 'POSTED' };
    const credits = await tx.creditEntry.aggregate({ where, _sum: { amount: true } });
    const payments = await tx.payment.aggregate({ where, _sum: { amount: true } });
    const balance = (credits._sum.amount ?? ZERO).minus(payments._sum.amount ?? ZERO);

    if (balance.lte(0)) {
      return skipped(customerId, customer.name, 'NO_BALANCE', 'Customer has no outstanding balance');
    }

    if (!force) {
      const recent = await tx.reminderLog.findFirst({
        where: {
          businessId: actor.businessId,
          customerId,
          status: { in: COUNTS_TOWARD_WINDOW },
          createdAt: { gte: new Date(Date.now() - REMINDER_COOLDOWN_DAYS * DAY_MS) },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true },
      });
      if (recent) {
        return skipped(
          customerId,
          customer.name,
          'RECENTLY_REMINDED',
          `Already reminded within the last ${REMINDER_COOLDOWN_DAYS} days`,
          { existingReminderId: recent.id, lastReminderAt: recent.createdAt }
        );
      }
    }

    const message = renderTemplate(template.body, {
      customer_name: customer.name,
      balance: balance.toFixed(2),
      currency,
    });

    const reminder = await tx.reminderLog.create({
      data: {
        businessId: actor.businessId,
        customerId,
        templateId: template.id,
        sentById: actor.id,
        message,
        balanceSnapshot: balance,
      },
      select: { id: true, status: true, message: true, createdAt: true },
    });

    return {
      customerId,
      customerName: customer.name,
      outcome: 'PREPARED',
      phone: customer.phone,
      balance: balance.toFixed(2),
      reminder,
    };
  });
}

export async function prepareReminders(actor, { templateId, customerIds, force }) {
  if (force && actor.role !== 'OWNER' && actor.role !== 'MANAGER') {
    throw httpError(403, 'Only the Owner or a Manager can remind a customer again inside the waiting period');
  }

  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, businessId: actor.businessId },
    select: { id: true, body: true, isActive: true },
  });
  if (!template) throw httpError(404, 'Template not found');
  if (!template.isActive) throw httpError(400, 'Template is deactivated');

  const business = await prisma.business.findUnique({
    where: { id: actor.businessId },
    select: { currency: true },
  });

  const results = [];
  for (const customerId of customerIds) {
    results.push(await prepareOne(actor, template, business.currency, customerId, force));
  }
  return results;
}

export async function updateReminderStatus(actor, id, { status, failureReason }) {
  const existing = await prisma.reminderLog.findFirst({
    where: { id, businessId: actor.businessId },
    select: { id: true, status: true },
  });
  if (!existing) throw httpError(404, 'Reminder not found');

  const load = async () =>
    serialize(await prisma.reminderLog.findUnique({ where: { id }, select: reminderSelect }));

  // Reporting the same status twice (a retry) is harmless.
  if (existing.status === status) return load();

  if (!TRANSITIONS[status].includes(existing.status)) {
    throw httpError(409, `A reminder cannot change from ${existing.status} to ${status}`);
  }

  // The update only matches if the status is still what we just read.
  const result = await prisma.reminderLog.updateMany({
    where: { id, businessId: actor.businessId, status: existing.status },
    data: {
      status,
      ...(status === 'SENT' && { sentAt: new Date() }),
      ...(status === 'FAILED' && { failureReason }),
    },
  });
  if (result.count === 0) {
    throw httpError(409, 'The reminder status changed in the meantime. Reload and try again.');
  }

  return load();
}

export async function listReminders(actor, { customerId, status, page, limit }) {
  const where = {
    businessId: actor.businessId,
    ...(customerId && { customerId }),
    ...(status && { status }),
  };

  const [total, reminders] = await Promise.all([
    prisma.reminderLog.count({ where }),
    prisma.reminderLog.findMany({
      where,
      select: reminderSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { reminders: reminders.map(serialize), page, limit, total };
}