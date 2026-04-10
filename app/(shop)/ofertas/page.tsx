import type { Metadata } from "next";
import OfertasClient from "./OfertasClient";

export const metadata: Metadata = {
  title: "Ofertas de la semana",
  description:
    "Aprovechá las ofertas semanales con precios especiales en carnes, pollo y embutidos. Tiempo limitado.",
  openGraph: {
    title: "Ofertas de la semana | Carnicería El Negro",
    url: "/ofertas",
  },
  alternates: {
    canonical: "/ofertas",
  },
};

export default function OfertasPage() {
  return <OfertasClient />;
}
