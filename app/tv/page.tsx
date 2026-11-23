import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FALLBACK_STORE_HOURS } from "@/lib/business-hours";
import { getTvData, isTvEnabled, type TvData } from "@/lib/tv-data";
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
  const speed =
    devTools && Number.isFinite(speedParam) && speedParam > 1 ? Math.min(MAX_SPEED, speedParam) : 1;
  const debug = devTools && params.debug !== undefined;

  let initialData: TvData;
  try {
    initialData = await getTvData();
  } catch (error) {
    // La tele arranca igual (marca, videos, QR) y el refresco trae los datos cuando la base responda.
    console.error("[tv] Error cargando datos iniciales:", error);
    initialData = { offers: [], combos: [], hours: FALLBACK_STORE_HOURS };
  }

  return <TvClient initialData={initialData} qrSeconds={qrSeconds} speed={speed} debug={debug} />;
}
