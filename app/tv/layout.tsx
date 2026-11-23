import type { Metadata, Viewport } from "next";
import { Bebas_Neue } from "next/font/google";
import styles from "./tv.module.css";

// Tipografía de títulos del sitio (Bebas Neue) servida desde el propio servidor:
// la tele no depende de Google Fonts ni de que el sistema tenga Impact.
const displayFont = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-tv-display" });

// Layout propio de la pantalla del local: solo agrega el manifest de /tv (no el
// del resto del sitio) y fija el documento para que nunca haga scroll.

export const metadata: Metadata = {
  manifest: "/tv/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#141414",
};

// html y body se fijan acá (solo en /tv): sin scroll, sin márgenes y alto de la
// ventana visible, con el mismo color de fondo que las barras del escenario.
const DOCUMENT_CSS =
  "html,body{margin:0;padding:0;width:100%;height:100dvh;overflow:hidden;background:#141414;cursor:none}";

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{DOCUMENT_CSS}</style>
      <div className={`${displayFont.variable} ${styles.fonts}`}>{children}</div>
    </>
  );
}
