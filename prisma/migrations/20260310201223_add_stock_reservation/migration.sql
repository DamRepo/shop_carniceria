-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "reservationReleased" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "CheckoutSession_expiresAt_idx" ON "CheckoutSession"("expiresAt");
