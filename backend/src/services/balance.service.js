import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';

const ZERO = new Prisma.Decimal(0);

// Balance = POSTED credits - POSTED payments, for many customers in two queries.
// Reversed records are excluded because we only count status POSTED.
export async function getBalances(businessId, customerIds) {
  const balances = new Map(customerIds.map((id) => [id, ZERO]));
  if (customerIds.length === 0) return balances;

  const where = { businessId, customerId: { in: customerIds }, status: 'POSTED' };

  const [credits, payments] = await Promise.all([
    prisma.creditEntry.groupBy({ by: ['customerId'], where, _sum: { amount: true } }),
    prisma.payment.groupBy({ by: ['customerId'], where, _sum: { amount: true } }),
  ]);

  for (const row of credits) {
    balances.set(row.customerId, balances.get(row.customerId).plus(row._sum.amount ?? ZERO));
  }
  for (const row of payments) {
    balances.set(row.customerId, balances.get(row.customerId).minus(row._sum.amount ?? ZERO));
  }

  return balances;
}

export function formatMoney(decimal) {
  return decimal.toFixed(2);
}

export async function getBalanceDetail(businessId, customerId) {
  const where = { businessId, customerId, status: 'POSTED' };

  const [credits, payments, business] = await Promise.all([
    prisma.creditEntry.aggregate({ where, _sum: { amount: true } }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
    prisma.business.findUnique({ where: { id: businessId }, select: { currency: true } }),
  ]);

  const totalCredit = credits._sum.amount ?? ZERO;
  const totalPayments = payments._sum.amount ?? ZERO;

  return {
    customerId,
    currency: business.currency,
    totalCredit: formatMoney(totalCredit),
    totalPayments: formatMoney(totalPayments),
    balance: formatMoney(totalCredit.minus(totalPayments)),
  };
}