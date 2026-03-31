-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "measurementUnit" TEXT NOT NULL DEFAULT 'un',
ADD COLUMN     "unitMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1;
