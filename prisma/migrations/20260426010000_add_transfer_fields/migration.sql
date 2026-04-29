-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('AWAITING_PROOF', 'PENDING_REVIEW', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "transferCode"        TEXT,
ADD COLUMN "transferStatus"      "TransferStatus",
ADD COLUMN "transferProofUrl"    TEXT,
ADD COLUMN "transferConfirmedAt" TIMESTAMP(3),
ADD COLUMN "transferRejectedAt"  TIMESTAMP(3),
ADD COLUMN "transferRejectNote"  TEXT;

-- CreateIndex (unique, sparse — NULL values allowed in PostgreSQL)
CREATE UNIQUE INDEX "Order_transferCode_key" ON "Order"("transferCode");

-- CreateIndex
CREATE INDEX "Order_transferCode_idx" ON "Order"("transferCode");
CREATE INDEX "Order_transferStatus_idx" ON "Order"("transferStatus");

-- CreateTable
CREATE TABLE "TransferCodeSequence" (
    "year"       INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TransferCodeSequence_pkey" PRIMARY KEY ("year")
);
