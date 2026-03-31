/*
  Warnings:

  - The values [PENDING_LOCAL] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "CheckoutSessionStatus" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "pickupDate" TIMESTAMP(3),
ADD COLUMN     "pickupNotes" TEXT,
ADD COLUMN     "pickupTimeSlot" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "mpExternalReference" TEXT,
ADD COLUMN     "mpPreferenceId" TEXT,
ADD COLUMN     "pickupDate" TIMESTAMP(3),
ADD COLUMN     "pickupNotes" TEXT,
ADD COLUMN     "pickupTimeSlot" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allowsDecimals" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPurchaseQty" DOUBLE PRECISION,
ADD COLUMN     "minPurchaseQty" DOUBLE PRECISION,
ADD COLUMN     "qtyStep" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "CheckoutSession_orderId_idx" ON "CheckoutSession"("orderId");

-- CreateIndex
CREATE INDEX "CheckoutSession_email_idx" ON "CheckoutSession"("email");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");
