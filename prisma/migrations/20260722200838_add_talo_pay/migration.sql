-- AlterEnum
ALTER TYPE "CheckoutSessionStatus" ADD VALUE 'WAITING_TALO';

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'TALO_PAY';

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "taloAlias" TEXT,
ADD COLUMN     "taloCvu" TEXT,
ADD COLUMN     "taloExpiresAt" TIMESTAMP(3),
ADD COLUMN     "taloPaymentId" TEXT,
ADD COLUMN     "taloStatus" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "taloAlias" TEXT,
ADD COLUMN     "taloCvu" TEXT,
ADD COLUMN     "taloExpiresAt" TIMESTAMP(3),
ADD COLUMN     "taloPaymentId" TEXT,
ADD COLUMN     "taloStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_taloPaymentId_key" ON "CheckoutSession"("taloPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_taloPaymentId_key" ON "Order"("taloPaymentId");
