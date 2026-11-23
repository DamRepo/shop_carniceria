import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FALLBACK_STORE_HOURS } from "@/lib/business-hours";
import { getTvData, isTvEnabled, type TvCombo, type TvData, type TvProduct } from "@/lib/tv-data";
import { TvClient } from "./TvClient";

// Pantalla para la tele del local. Fuera de (shop): sin header, footer, WhatsApp,
// banners ni analytics. No se enlaza desde el sitio ni va al sitemap.

// El flag y los datos se leen en cada request, nunca en el build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Pantalla del local" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: null },
};

const DEFAULT_QR_SECONDS = 90;
const MIN_QR_SECONDS = 10;
const MAX_QR_SECONDS = 1800;
const MAX_SPEED = 20;

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseQrSeconds(value: string | undefined): number {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return DEFAULT_QR_SECONDS;
  return Math.min(MAX_QR_SECONDS, Math.max(MIN_QR_SECONDS, Math.round(n)));
}

export default async function TvPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!isTvEnabled()) notFound();

  const params = await searchParams;
  const qrSeconds = parseQrSeconds(firstParam(params.qr));

  // ?speed y ?debug son herramientas de revisión: en producción se ignoran.
  const devTools = process.env.NODE_ENV !== "production";
  const speedParam = Number(firstParam(params.speed));
  const speed = devTools && Number.isFinite(speedParam) && speedParam > 1 ? Math.min(MAX_SPEED, speedParam) : 1;
  const debug = devTools && params.debug !== undefined;
  // ?fs=0 desactiva el pedido de pantalla completa (por ejemplo si la tele ya corre en modo kiosco).
  const fullscreen = firstParam(params.fs) !== "0";

  // ?mock=1: productos de ejemplo para revisar el diseño con la base vacía.
  // Comparación literal con NODE_ENV: en el build de producción el bloque y
  // buildMockTvData() se eliminan del bundle (verificado en .next/server/app/tv/page.js).
  let mockData: TvData | null = null;
  if (process.env.NODE_ENV !== "production") {
    if (firstParam(params.mock) === "1") mockData = buildMockTvData();
  }

  let initialData: TvData;
  if (mockData) {
    initialData = mockData;
  } else {
    try {
      initialData = await getTvData();
    } catch (error) {
      // La tele arranca igual (marca, videos, QR) y el refresco trae los datos cuando la base responda.
      console.error("[tv] Error cargando datos iniciales:", error);
      initialData = {
        offers: [],
        featured: [],
        combos: [],
        hours: FALLBACK_STORE_HOURS,
      };
    }
  }

  return (
    <TvClient
      initialData={initialData}
      qrSeconds={qrSeconds}
      speed={speed}
      debug={debug}
      fullscreen={fullscreen}
      mock={mockData !== null}
    />
  );
}

/* ─── Datos de ejemplo (?mock=1, solo desarrollo) ─────────────────────────────
 * Van acá y no en un archivo aparte a propósito: el trazado del build standalone
 * copia cualquier archivo importado, aunque el import esté en una rama muerta.
 * Imágenes: las de categorías que ya están en /public. Hay un producto sin imagen
 * y otro con una imagen rota para ver el placeholder.
 */
function buildMockTvData(): TvData {
  function product(
    id: string,
    name: string,
    image: string | null,
    price: number,
    oldPrice: number | null = null
  ): TvProduct {
    const discountPercent = oldPrice !== null ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
    return { id: `mock-${id}`, name, image, price, oldPrice, discountPercent };
  }

  const offers: TvProduct[] = [
    product("o1", "Asado de novillo", "/carne.png", 1_299_900, 1_549_900),
    product("o2", "Chorizo parrillero artesanal", "/embutidos.png", 899_900, 1_049_900),
    product("o3", "Pollo entero fresco", "/pollo.png", 549_900, 649_900),
    product("o4", "Milanesas de nalga rebozadas", "/elaborados.png", 1_099_900, 1_299_900),
    product("o5", "Vacío a la parrilla", "/cortes.jpg", 1_399_900, 1_599_900),
    product("o6", "Hamburguesas caseras x 4", null, 649_900, 749_900),
    product("o7", "Bondiola de cerdo", "/no-existe-imagen-rota.png", 989_900, 1_149_900),
    product("o8", "Verduras para el puchero", "/frutas_y_verduras.png", 299_900, 349_900),
    product("o9", "Patitas de pollo congeladas", "/congelados.png", 459_900, 519_900),
  ];

  const featured: TvProduct[] = [
    product("f1", "Ojo de bife madurado", "/cortes.jpg", 1_899_900),
    product("f2", "Salame de la casa", "/embutidos.png", 1_249_900),
    product("f3", "Matambre de cerdo", "/carne.png", 1_149_900, 1_299_900),
    product("f4", "Empanadas de carne cortada a cuchillo x 12", "/elaborados.png", 1_399_900),
    product("f5", "Suprema de pollo", "/pollo.png", 899_900),
  ];

  const combos: TvCombo[] = [
    {
      id: "mock-c1",
      name: "Combo parrillero para 6",
      images: ["/carne.png", "/embutidos.png"],
      price: 3_499_900,
      oldPrice: 3_999_900,
      discountPercent: 13,
    },
    {
      id: "mock-c2",
      name: "Combo milanesas + verduras",
      images: ["/caja.jpeg"],
      price: 1_899_900,
      oldPrice: null,
      discountPercent: null,
    },
    {
      id: "mock-c3",
      name: "Combo pollo para la semana",
      images: [],
      price: 1_499_900,
      oldPrice: 1_699_900,
      discountPercent: 12,
    },
  ];

  return { offers, featured, combos, hours: FALLBACK_STORE_HOURS };
}
