import type { Metadata } from "next";
import { Suspense } from "react";
import ProductosClient from "./ProductosClient";

export const metadata: Metadata = {
  title: "Productos",
  description:
    "Explorá nuestro catálogo completo de carnes, pollo, embutidos artesanales y congelados con precios actualizados.",
  openGraph: {
    title: "Productos | Carnicería El Negro",
    url: "/productos",
  },
  alternates: {
    canonical: "/productos",
  },
};

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ProductosClient />
    </Suspense>
  );
}
