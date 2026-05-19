-- DropIndex
DROP INDEX "Order_transferCode_idx";

-- DropIndex
DROP INDEX "Order_transferStatus_idx";

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "estrellas" INTEGER,
    "encontro" BOOLEAN,
    "compraria" TEXT,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
