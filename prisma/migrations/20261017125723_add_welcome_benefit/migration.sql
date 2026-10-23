-- CreateEnum
CREATE TYPE "WelcomeBenefitStatus" AS ENUM ('RESERVED', 'USED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "welcomeDiscount" INTEGER;

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "welcomeDiscount" INTEGER;

-- CreateTable
CREATE TABLE "WelcomeBenefit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "WelcomeBenefitStatus" NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelcomeBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeBenefit_userId_key" ON "WelcomeBenefit"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeBenefit_orderId_key" ON "WelcomeBenefit"("orderId");

-- AddForeignKey
ALTER TABLE "WelcomeBenefit" ADD CONSTRAINT "WelcomeBenefit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelcomeBenefit" ADD CONSTRAINT "WelcomeBenefit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

