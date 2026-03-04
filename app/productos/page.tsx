// app/productos/page.tsx
import { Suspense } from "react";
import ProductosClient from "./ProductosClient";

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ProductosClient />
    </Suspense>
  );
}
