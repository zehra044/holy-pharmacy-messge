-- This is an empty migration.

ALTER TABLE "CreditEntry"
  ADD CONSTRAINT "CreditEntry_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amount_positive" CHECK ("amount" > 0);