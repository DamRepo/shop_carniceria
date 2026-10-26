-- Sistema de puntos (fase 1): solo aditivo. No modifica ni borra nada existente.
--
-- ROLLBACK (manual, solo si hace falta revertir esta migración):
--   DROP TABLE IF EXISTS "PointsReservationAllocation";
--   DROP TABLE IF EXISTS "PointsReservation";
--   DROP TABLE IF EXISTS "PointsMovement";
--   DROP TABLE IF EXISTS "PointsLot";
--   DROP TYPE IF EXISTS "PointsReservationStatus";
--   DROP TYPE IF EXISTS "PointsMovementType";
--   ALTER TABLE "Order" DROP COLUMN IF EXISTS "pointsRedeemed",
--     DROP COLUMN IF EXISTS "pointsDiscount",
--     DROP COLUMN IF EXISTS "pointsEarned";
--   ALTER TABLE "CheckoutSession" DROP COLUMN IF EXISTS "pointsRedeemed",
--     DROP COLUMN IF EXISTS "pointsDiscount";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261026120000_add_loyalty_points';

-- CreateEnum
CREATE TYPE "PointsReservationStatus" AS ENUM ('RESERVED', 'USED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PointsMovementType" AS ENUM ('EARN', 'RESERVE', 'SETTLE', 'RELEASE', 'RESTORE', 'REVOKE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pointsDiscount" INTEGER,
ADD COLUMN     "pointsEarned" INTEGER,
ADD COLUMN     "pointsRedeemed" INTEGER;

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "pointsDiscount" INTEGER,
ADD COLUMN     "pointsRedeemed" INTEGER;

-- CreateTable
CREATE TABLE "PointsLot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "earned" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "sourceOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "status" "PointsReservationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsReservationAllocation" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "PointsReservationAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "PointsMovementType" NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PointsLot_sourceOrderId_key" ON "PointsLot"("sourceOrderId");

-- CreateIndex
CREATE INDEX "PointsLot_userId_expiresAt_idx" ON "PointsLot"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PointsLot_expiresAt_idx" ON "PointsLot"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointsReservation_orderId_key" ON "PointsReservation"("orderId");

-- CreateIndex
CREATE INDEX "PointsReservation_userId_idx" ON "PointsReservation"("userId");

-- CreateIndex
CREATE INDEX "PointsReservationAllocation_lotId_idx" ON "PointsReservationAllocation"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsReservationAllocation_reservationId_lotId_key" ON "PointsReservationAllocation"("reservationId", "lotId");

-- CreateIndex
CREATE INDEX "PointsMovement_userId_createdAt_idx" ON "PointsMovement"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointsMovement_orderId_type_key" ON "PointsMovement"("orderId", "type");

-- AddForeignKey
ALTER TABLE "PointsLot" ADD CONSTRAINT "PointsLot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLot" ADD CONSTRAINT "PointsLot_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsReservation" ADD CONSTRAINT "PointsReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsReservation" ADD CONSTRAINT "PointsReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsReservationAllocation" ADD CONSTRAINT "PointsReservationAllocation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "PointsReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsReservationAllocation" ADD CONSTRAINT "PointsReservationAllocation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "PointsLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsMovement" ADD CONSTRAINT "PointsMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsMovement" ADD CONSTRAINT "PointsMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

