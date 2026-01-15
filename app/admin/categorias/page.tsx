import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <p className="text-sm text-zinc-400">
          Crear, editar y eliminar categorías. No se pueden borrar si tienen productos asociados.
        </p>
      </div>

      <CategoriesClient />
    </div>
  );
}
