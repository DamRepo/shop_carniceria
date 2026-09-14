import type { Metadata } from "next";
import DestacadosClient from "./DestacadosClient";

export const metadata: Metadata = {
  title: "Destacados",
  description:
    "Conocé los productos destacados de Carnicería El Negro: la selección elegida por el carnicero.",
  openGraph: {
    title: "Destacados | Carnicería El Negro",
    url: "/destacados",
  },
  alternates: {
    canonical: "/destacados",
  },
};

export default function DestacadosPage() {
  return <DestacadosClient />;
}
