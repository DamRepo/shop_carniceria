import { NextResponse } from "next/server";
import { isTvEnabled } from "@/lib/tv-data";

// Manifest solo para la pantalla del local. Lo enlaza únicamente app/tv/layout.tsx,
// así que no cambia nada en el resto del sitio. Con el flag apagado, 404 como /tv.
export const dynamic = "force-dynamic";

const MANIFEST = {
  name: "Carnicería El Negro · Pantalla del local",
  short_name: "El Negro TV",
  // El scope "/tv" cubre /tv y /tv/... ("/tv/" dejaría afuera a start_url "/tv",
  // y el navegador ignoraría el scope).
  start_url: "/tv",
  scope: "/tv",
  display: "fullscreen",
  orientation: "landscape",
  background_color: "#141414",
  theme_color: "#141414",
  icons: [
    { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    { src: "/logo-el-negro.png", sizes: "1491x1055", type: "image/png" },
  ],
};

export function GET() {
  if (!isTvEnabled()) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(MANIFEST, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
