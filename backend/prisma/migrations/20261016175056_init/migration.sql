-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PREPARED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditEntry" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RecordStatus" NOT NULL DEFAULT 'POSTED',
    "idempotencyKey" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedById" UUID,
    "reversalReason" TEXT,

    CONSTRAINT "CreditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RecordStatus" NOT NULL DEFAULT 'POSTED',
    "idempotencyKey" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedById" UUID,
    "reversalReason" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "templateId" UUID,
    "sentById" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "balanceSnapshot" DECIMAL(12,2) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PREPARED',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- CreateIndex
CREATE INDEX "Customer_businessId_name_idx" ON "Customer"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_businessId_phone_key" ON "Customer"("businessId", "phone");

-- CreateIndex
CREATE INDEX "CreditEntry_customerId_status_idx" ON "CreditEntry"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CreditEntry_businessId_idempotencyKey_key" ON "CreditEntry"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_customerId_status_idx" ON "Payment"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_businessId_idempotencyKey_key" ON "Payment"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "MessageTemplate_businessId_idx" ON "MessageTemplate"("businessId");

-- CreateIndex
CREATE INDEX "ReminderLog_businessId_customerId_createdAt_idx" ON "ReminderLog"("businessId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_createdAt_idx" ON "AuditLog"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
