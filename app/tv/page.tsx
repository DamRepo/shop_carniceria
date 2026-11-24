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
// ?t= multiplica todos los tiempos. En producción solo puede enlentecer.
const TIME_SCALE_RANGE = { production: [1, 3], development: [0.5, 3] } as const;

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseQrSeconds(value: string | undefined): number {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return DEFAULT_QR_SECONDS;
  return Math.min(MAX_QR_SECONDS, Math.max(MIN_QR_SECONDS, Math.round(n)));
}

/** ?t=: 1 por defecto; fuera de rango se ajusta al límite (producción 1–3, desarrollo 0,5–3). */
function parseTimeScale(value: string | undefined, devTools: boolean): number {
  const [min, max] = devTools ? TIME_SCALE_RANGE.development : TIME_SCALE_RANGE.production;
  const n = Number(value?.replace(",", "."));
  if (!value || !Number.isFinite(n)) return 1;
  return Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
}

export default async function TvPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!isTvEnabled()) notFound();

  const params = await searchParams;
  const qrSeconds = parseQrSeconds(firstParam(params.qr));

  // ?debug es una herramienta de revisión: en producción se ignora.
  const devTools = process.env.NODE_ENV !== "production";
  const debug = devTools && params.debug !== undefined;
  const timeScale = parseTimeScale(firstParam(params.t), devTools);
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
      timeScale={timeScale}
      debug={debug}
      fullscreen={fullscreen}
      mock={mockData !== null}
    />
  );
}

/* ─── Datos de ejemplo (?mock=1, solo desarrollo) ─────────────────────────────
 * Van acá y no en un archivo aparte a propósito: el trazado del build standalone
 * copia cualquier archivo importado, aunque el import esté en una rama muerta.
 *
 * Las fotos son las que el cliente subió desde el admin (Cloudinary, el mismo
 * origen que usa la tienda), con nombres reales y precios inventados: sirven para
 * ver el diseño con fotos reales cuando la base local no tiene imágenes. Nada sale
 * de /public. Hay un producto sin imagen y otro con una URL rota para ver el placeholder.
 */
function buildMockTvData(): TvData {
  const cdn = (path: string) => `https://res.cloudinary.com/dku7noipe/image/upload/${path}`;

  function product(id: string, name: string, image: string | null, price: number, oldPrice: number | null = null) {
    const discountPercent = oldPrice !== null ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
    const item: TvProduct = { id: `mock-${id}`, name, image, price, oldPrice, discountPercent };
    return item;
  }

  const offers: TvProduct[] = [
    product("o1", "2 Kg Hamburguesa de pollo", cdn("v1777849553/shop_carniceria/products/u0lchbdzqlj2jirul3mg.png"), 1_500_000, 1_800_000),
    product("o2", "2 Kg Milanesas de Cerdo", cdn("v1777849140/shop_carniceria/products/ynpmdep062yhvql01e5m.png"), 1_800_000, 2_100_000),
    product("o3", "2 Kg Milanesa de Pollo", cdn("v1776847779/shop_carniceria/products/fcowywy5loviziwf4w6o.jpg"), 1_900_000, 2_260_000),
    product("o4", "2 Kg Costeletas de Cerdo", cdn("v1776599183/shop_carniceria/products/ttqcei4etqhi1ncvgn5i.png"), 1_800_000, 2_040_000),
    product("o5", "2 Kg Muslo Pollo CALISA", cdn("v1776847852/shop_carniceria/products/wtuqgcywhaoenxggang2.jpg"), 1_000_000, 1_100_000),
    product("o6", "Hamburguesas caseras x 4 (sin foto)", null, 649_900, 749_900),
    product("o7", "Producto con foto rota", cdn("v1/shop_carniceria/products/no-existe-tv-mock.png"), 989_900, 1_149_900),
    product("o8", "Papa x 2 kg", cdn("v1776596083/shop_carniceria/products/xsxvc0fwjzbrpunwlokn.jpg"), 399_900, 450_000),
    product("o9", "Huevo Blanco Maple 30U.", cdn("v1777903013/shop_carniceria/products/kfsxqqzbewcka8jshgs6.jpg"), 549_900, 600_000),
  ];

  const featured: TvProduct[] = [
    product("f1", "Picaña o Tapa de Cuadril", cdn("v1776109365/shop_carniceria/products/keqrl7cu2ljgtygdtmir.png"), 2_100_000),
    product("f2", "Salame de Cordero EL NEGRO", cdn("v1776846017/shop_carniceria/products/l1ycug1mxo2ksdbk7yvb.png"), 572_000),
    product("f3", "Bola de Lomo en Bifes por Kg.", cdn("v1776112391/shop_carniceria/products/lwgjfvmrmvmk7sww0nud.jpg"), 2_100_000),
    product(
      "f4",
      "Fernet Branca Edición Limitada Mundial 750 Ml.",
      cdn("v1779473043/shop_carniceria/products/th9qtngkuqqifeudlrkz.webp"),
      2_390_000
    ),
    product("f5", "Salame Picado Grueso EL NEGRO", cdn("v1776845611/shop_carniceria/products/isfeu2ar9dv6slk1mkvo.png"), 664_000),
  ];

  const combos: TvCombo[] = [
    {
      id: "mock-c1",
      name: "Combo milanesas para la semana",
      images: [
        cdn("v1777849140/shop_carniceria/products/ynpmdep062yhvql01e5m.png"),
        cdn("v1776847779/shop_carniceria/products/fcowywy5loviziwf4w6o.jpg"),
      ],
      price: 3_499_900,
      oldPrice: 3_999_900,
      discountPercent: 13,
    },
    {
      id: "mock-c2",
      name: "Combo picada El Negro",
      images: [cdn("v1776846017/shop_carniceria/products/l1ycug1mxo2ksdbk7yvb.png")],
      price: 1_099_900,
      oldPrice: null,
      discountPercent: null,
    },
    {
      id: "mock-c3",
      name: "Combo sin foto",
      images: [],
      price: 1_499_900,
      oldPrice: 1_699_900,
      discountPercent: 12,
    },
  ];

  return { offers, featured, combos, hours: FALLBACK_STORE_HOURS };
}
