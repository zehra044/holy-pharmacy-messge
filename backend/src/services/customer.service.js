import prisma from '../config/prisma.js';
import { getBalances, formatMoney,getBalanceDetail } from './balance.service.js';

const customerSelect = {
  id: true,
  name: true,
  phone: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function attachBalance(actor, customer) {
  const balances = await getBalances(actor.businessId, [customer.id]);
  return { ...customer, balance: formatMoney(balances.get(customer.id)) };
}

function translateConflict(err) {
  if (err.code === 'P2002') {
    return httpError(409, 'A customer with this phone number already exists (it may be deactivated)');
  }
  return err;
}

export async function createCustomer(actor, { name, phone, notes }) {
  try {
    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: { businessId: actor.businessId, name, phone, notes },
        select: customerSelect,
      });

      await tx.auditLog.create({
        data: {
          businessId: actor.businessId,
          userId: actor.id,
          action: 'CUSTOMER_CREATED',
          entityType: 'Customer',
          entityId: created.id,
          after: { name, phone, notes },
        },
      });

      return created;
    });
    return { ...customer, balance: '0.00' };
  } catch (err) {
    throw translateConflict(err);
  }
}

export async function listCustomers(actor, { page, limit, isActive, search }) {
  const where = {
    businessId: actor.businessId,
    ...(isActive !== undefined && { isActive }),
  };

  if (search) {
    // Typing "061234" should find "+25261234...", so drop a leading 0 for the phone match.
    const phoneTerm = search.replace(/[\s\-().]/g, '').replace(/^0/, '');
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      ...(phoneTerm ? [{ phone: { contains: phoneTerm } }] : []),
    ];
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      select: customerSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const balances = await getBalances(actor.businessId, customers.map((c) => c.id));

  return {
    customers: customers.map((c) => ({ ...c, balance: formatMoney(balances.get(c.id)) })),
    page,
    limit,
    total,
  };
}
export async function getCustomerBalance(actor, id) {
  const customer = await prisma.customer.findFirst({
    where: { id, businessId: actor.businessId },
    select: { id: true },
  });
  if (!customer) throw httpError(404, 'Customer not found');
  return getBalanceDetail(actor.businessId, id);
}
export async function getCustomer(actor, id) {
  const customer = await prisma.customer.findFirst({
    where: { id, businessId: actor.businessId },
    select: customerSelect,
  });
  if (!customer) throw httpError(404, 'Customer not found');
  return attachBalance(actor, customer);
}

export async function updateCustomer(actor, id, changes) {
  try {
    const customer = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({
        where: { id, businessId: actor.businessId },
        select: customerSelect,
      });
      if (!existing) throw httpError(404, 'Customer not found');

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

      const updated = await tx.customer.update({
        where: { id: existing.id },
        data: after,
        select: customerSelect,
      });

      await tx.auditLog.create({
        data: {
          businessId: actor.businessId,
          userId: actor.id,
          action: 'CUSTOMER_UPDATED',
          entityType: 'Customer',
          entityId: existing.id,
          before,
          after,
        },
      });

      return updated;
    });
    return attachBalance(actor, customer);
  } catch (err) {
    throw translateConflict(err);
  }
}

export async function setCustomerActive(actor, id, isActive) {
  const customer = await prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findFirst({
      where: { id, businessId: actor.businessId },
      select: customerSelect,
    });
    if (!existing) throw httpError(404, 'Customer not found');
    if (existing.isActive === isActive) return existing; // already in that state

    const updated = await tx.customer.update({
      where: { id: existing.id },
      data: { isActive },
      select: customerSelect,
    });

    await tx.auditLog.create({
      data: {
        businessId: actor.businessId,
        userId: actor.id,
        action: isActive ? 'CUSTOMER_REACTIVATED' : 'CUSTOMER_DEACTIVATED',
        entityType: 'Customer',
        entityId: existing.id,
        before: { isActive: existing.isActive },
        after: { isActive },
      },
    });

    return updated;
  });
  return attachBalance(actor, customer);
}