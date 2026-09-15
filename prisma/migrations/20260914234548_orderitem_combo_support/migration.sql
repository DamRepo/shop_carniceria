-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "comboId" TEXT,
ADD COLUMN     "itemNameSnapshot" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "OrderItem_comboId_idx" ON "OrderItem"("comboId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
