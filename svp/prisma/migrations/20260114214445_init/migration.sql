-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adminWallet" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "treasuryMint" TEXT,
    "treasuryAccount" TEXT,
    "elGamalPubKey" TEXT,
    "encryptedElGamalKey" TEXT,
    "auditorPubkey" TEXT,
    "auditorName" TEXT,
    "auditorConfiguredAt" TIMESTAMP(3),
    "multisigAddress" TEXT,
    "multisigThreshold" INTEGER,
    "multisigMembers" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payee" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "privacyCashAddress" TEXT,
    "rangeStatus" TEXT NOT NULL DEFAULT 'pending',
    "rangeRiskScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "payeeId" TEXT NOT NULL,
    "amount" DECIMAL(20,9) NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'SOL',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txSignature" TEXT,
    "stealthAddress" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "ciphertext" TEXT,
    "nonce" TEXT,
    "ephemeralPubKey" TEXT,
    "computationOffset" TEXT,
    "mpcStatus" TEXT DEFAULT 'pending',
    "mpcTxSignature" TEXT,
    "mpcFinalizedAt" TIMESTAMP(3),
    "auditorSealedOutput" TEXT,
    "auditorSealedAt" TIMESTAMP(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalProposalId" TEXT,
    "approvalStatus" TEXT,
    "approvedBy" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringSchedule" TEXT,
    "nextPaymentDate" TIMESTAMP(3),
    "parentPaymentId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringPaymentTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "payeeId" TEXT NOT NULL,
    "amount" DECIMAL(20,9) NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'SOL',
    "schedule" TEXT NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringPaymentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAttestation" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "riskScore" INTEGER,
    "screenedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "pdaAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_adminWallet_key" ON "Organization"("adminWallet");

-- CreateIndex
CREATE INDEX "Payee_orgId_idx" ON "Payee"("orgId");

-- CreateIndex
CREATE INDEX "Payee_walletAddress_idx" ON "Payee"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Payee_orgId_email_key" ON "Payee"("orgId", "email");

-- CreateIndex
CREATE INDEX "Payment_orgId_idx" ON "Payment"("orgId");

-- CreateIndex
CREATE INDEX "Payment_payeeId_idx" ON "Payment"("payeeId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_mpcStatus_idx" ON "Payment"("mpcStatus");

-- CreateIndex
CREATE INDEX "Payment_isRecurring_idx" ON "Payment"("isRecurring");

-- CreateIndex
CREATE INDEX "RecurringPaymentTemplate_orgId_idx" ON "RecurringPaymentTemplate"("orgId");

-- CreateIndex
CREATE INDEX "RecurringPaymentTemplate_payeeId_idx" ON "RecurringPaymentTemplate"("payeeId");

-- CreateIndex
CREATE INDEX "RecurringPaymentTemplate_isActive_idx" ON "RecurringPaymentTemplate"("isActive");

-- CreateIndex
CREATE INDEX "RecurringPaymentTemplate_nextRunDate_idx" ON "RecurringPaymentTemplate"("nextRunDate");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceAttestation_wallet_key" ON "ComplianceAttestation"("wallet");

-- CreateIndex
CREATE INDEX "ComplianceAttestation_wallet_idx" ON "ComplianceAttestation"("wallet");

-- CreateIndex
CREATE INDEX "ComplianceAttestation_expiresAt_idx" ON "ComplianceAttestation"("expiresAt");

-- AddForeignKey
ALTER TABLE "Payee" ADD CONSTRAINT "Payee_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "Payee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringPaymentTemplate" ADD CONSTRAINT "RecurringPaymentTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringPaymentTemplate" ADD CONSTRAINT "RecurringPaymentTemplate_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "Payee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
