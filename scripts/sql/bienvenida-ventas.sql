-- Bienvenida 10%: número real de compras con descuento, para contrastar con GA4.
-- SOLO LECTURA (solo SELECT). GA4 no ve Mercado Pago ni cuenta el efectivo
-- recién al cobrarlo: esta consulta es la fuente de verdad.
-- Montos en la base en centavos; acá se pasan a pesos.

-- 1) Órdenes cobradas con descuento de bienvenida, por método de pago (+ total).
SELECT
  COALESCE("paymentMethod"::text, 'TOTAL')  AS metodo_pago,
  count(*)                                  AS ordenes,
  sum("welcomeDiscount") / 100.0            AS descuento_pesos,
  sum("total") / 100.0                      AS cobrado_pesos
FROM "Order"
WHERE "welcomeDiscount" > 0
  AND "paymentStatus" = 'PAID'
GROUP BY ROLLUP ("paymentMethod")
ORDER BY metodo_pago;

-- 2) Mismo número por día de cobro (hora Argentina), para comparar con GA4.
SELECT
  date_trunc('day', "paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires') AS dia,
  count(*)                       AS ordenes,
  sum("welcomeDiscount") / 100.0 AS descuento_pesos,
  sum("total") / 100.0           AS cobrado_pesos
FROM "Order"
WHERE "welcomeDiscount" > 0
  AND "paymentStatus" = 'PAID'
GROUP BY 1
ORDER BY 1 DESC;

-- 3) Control cruzado: bienvenidas consumidas (USED) y reservadas sin cobrar.
SELECT status, count(*) AS cantidad, sum("discountCents") / 100.0 AS descuento_pesos
FROM "WelcomeBenefit"
GROUP BY status;
