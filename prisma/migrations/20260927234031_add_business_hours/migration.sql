-- CreateTable
CREATE TABLE "BusinessHours" (
    "dayOfWeek" INTEGER NOT NULL,
    "openMorning" TEXT,
    "closeMorning" TEXT,
    "openAfternoon" TEXT,
    "closeAfternoon" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("dayOfWeek")
);

-- Horario vigente al crear la tabla (el mismo que el respaldo fijo de lib/business-hours.ts).
-- ON CONFLICT: reaplicar no pisa lo que se haya editado desde el admin.
INSERT INTO "BusinessHours" ("dayOfWeek", "openMorning", "closeMorning", "openAfternoon", "closeAfternoon", "isClosed", "updatedAt")
VALUES
  (0, '08:30', '13:00', NULL,    NULL,    false, CURRENT_TIMESTAMP),
  (1, '07:30', '13:00', '16:00', '21:00', false, CURRENT_TIMESTAMP),
  (2, '07:30', '13:00', '16:00', '21:00', false, CURRENT_TIMESTAMP),
  (3, '07:30', '13:00', '16:00', '21:00', false, CURRENT_TIMESTAMP),
  (4, '07:30', '13:00', '16:00', '21:00', false, CURRENT_TIMESTAMP),
  (5, '07:30', '13:00', '16:00', '21:00', false, CURRENT_TIMESTAMP),
  (6, '07:30', '13:00', '16:00', '21:00', false, CURRENT_TIMESTAMP)
ON CONFLICT ("dayOfWeek") DO NOTHING;
