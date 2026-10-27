-- Sistema de puntos: restricciones CHECK como red de seguridad en la base.
-- Solo aditivo: no crea ni borra columnas ni datos. Si alguna fila existente
-- no cumpliera, la migración falla entera y no queda nada a medias.
--
-- Prisma no representa CHECK en schema.prisma; viven solo en la base.
--
-- ORDEN: va después de 20261026120000_add_loyalty_points. El código no
-- depende de estas restricciones, así que se pueden aplicar antes o después
-- de subir el código, y sacarlas no requiere volver atrás el código.
--
-- PointsMovement.points admite 0 a propósito: revocar un lote ya usado entero
-- deja un movimiento REVOKE de 0 puntos.
--
-- ROLLBACK (manual, solo si hace falta revertir esta migración):
--   ALTER TABLE "PointsLot" DROP CONSTRAINT IF EXISTS "PointsLot_earned_positive_check",
--     DROP CONSTRAINT IF EXISTS "PointsLot_remaining_range_check";
--   ALTER TABLE "PointsReservation" DROP CONSTRAINT IF EXISTS "PointsReservation_points_positive_check";
--   ALTER TABLE "PointsReservationAllocation" DROP CONSTRAINT IF EXISTS "PointsReservationAllocation_points_positive_check";
--   ALTER TABLE "PointsMovement" DROP CONSTRAINT IF EXISTS "PointsMovement_points_nonnegative_check";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261026130000_points_check_constraints';

-- Lote: lo ganado es positivo y lo que queda nunca es negativo ni supera lo ganado.
ALTER TABLE "PointsLot"
  ADD CONSTRAINT "PointsLot_earned_positive_check" CHECK ("earned" > 0),
  ADD CONSTRAINT "PointsLot_remaining_range_check" CHECK ("remaining" >= 0 AND "remaining" <= "earned");

-- Canje y su reparto por lote: siempre una cantidad positiva.
ALTER TABLE "PointsReservation"
  ADD CONSTRAINT "PointsReservation_points_positive_check" CHECK ("points" > 0);

ALTER TABLE "PointsReservationAllocation"
  ADD CONSTRAINT "PointsReservationAllocation_points_positive_check" CHECK ("points" > 0);

-- Movimientos: la cantidad nunca es negativa (el tipo indica el sentido).
ALTER TABLE "PointsMovement"
  ADD CONSTRAINT "PointsMovement_points_nonnegative_check" CHECK ("points" >= 0);
