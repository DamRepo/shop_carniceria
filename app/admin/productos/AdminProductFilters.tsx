"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type CategoryDTO = { id: string; name: string; slug: string; parentId: string | null };

interface Props {
  categories: CategoryDTO[];
}

const ORDER_OPTIONS = [
  { label: "Más recientes", orderBy: "createdAt", order: "desc" },
  { label: "Más antiguos", orderBy: "createdAt", order: "asc" },
  { label: "Nombre A-Z", orderBy: "name", order: "asc" },
  { label: "Nombre Z-A", orderBy: "name", order: "desc" },
  { label: "Mayor precio", orderBy: "price", order: "desc" },
  { label: "Menor precio", orderBy: "price", order: "asc" },
  { label: "Mayor stock", orderBy: "stock", order: "desc" },
  { label: "Menor stock", orderBy: "stock", order: "asc" },
] as const;

const SELECT_CLASS =
  "h-9 rounded-md bg-zinc-800 border border-zinc-700 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500";

export function AdminProductFilters({ categories }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const search = sp.get("search") ?? "";
  const category = sp.get("category") ?? "";
  const estado = sp.get("estado") ?? "";
  const oferta = sp.get("oferta") ?? "";
  const stock = sp.get("stock") ?? "";
  const orderBy = sp.get("orderBy") ?? "createdAt";
  const order = sp.get("order") ?? "desc";

  const [inputValue, setInputValue] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync si la URL cambia externamente (chip removal, navegación)
  useEffect(() => {
    setInputValue(sp.get("search") ?? "");
  }, [sp]);

  function push(params: URLSearchParams) {
    router.push(`/admin/productos?${params.toString()}`);
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    push(params);
  }

  function handleSearchChange(v: string) {
    setInputValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("search", v), 400);
  }

  function clearSearch() {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateParam("search", "");
  }

  function handleOrderChange(v: string) {
    const opt = ORDER_OPTIONS.find((o) => `${o.orderBy}-${o.order}` === v);
    if (!opt) return;
    const params = new URLSearchParams(sp.toString());
    params.set("orderBy", opt.orderBy);
    params.set("order", opt.order);
    params.delete("page");
    push(params);
  }

  function clearAll() {
    router.push("/admin/productos");
  }

  // Chips de filtros activos
  const chips: { label: string; key: string }[] = [];
  if (search) chips.push({ label: `"${search}"`, key: "search" });
  if (category) {
    const cat = categories.find((c) => c.slug === category);
    chips.push({ label: `Cat: ${cat?.name ?? category}`, key: "category" });
  }
  if (estado === "activo") chips.push({ label: "Activos", key: "estado" });
  if (estado === "inactivo") chips.push({ label: "Inactivos", key: "estado" });
  if (oferta === "si") chips.push({ label: "En oferta", key: "oferta" });
  if (oferta === "no") chips.push({ label: "Sin oferta", key: "oferta" });
  if (stock === "critico") chips.push({ label: "Stock crítico", key: "stock" });
  if (stock === "agotado") chips.push({ label: "Agotados", key: "stock" });

  const mothers = categories.filter((c) => !c.parentId);
  const activeOrderValue = `${orderBy}-${order}`;

  return (
    <div className="space-y-3">
      {/* Búsqueda */}
      <div className="relative">
        <Input
          placeholder="Buscar por nombre, slug o categoría..."
          value={inputValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-8"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => updateParam("category", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Todas las categorías</option>
          {mothers.map((m) => (
            <optgroup key={m.id} label={m.name}>
              <option value={m.slug}>{m.name} (todo)</option>
              {categories
                .filter((c) => c.parentId === m.id)
                .map((c) => (
                  <option key={c.id} value={c.slug}>
                    &nbsp;&nbsp;{c.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>

        <select
          value={estado}
          onChange={(e) => updateParam("estado", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>

        <select
          value={oferta}
          onChange={(e) => updateParam("oferta", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Oferta: todos</option>
          <option value="si">En oferta</option>
          <option value="no">Sin oferta</option>
        </select>

        <select
          value={stock}
          onChange={(e) => updateParam("stock", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Stock: todos</option>
          <option value="critico">Stock crítico (≤5)</option>
          <option value="agotado">Agotados</option>
        </select>

        <select
          value={activeOrderValue}
          onChange={(e) => handleOrderChange(e.target.value)}
          className={SELECT_CLASS}
        >
          {ORDER_OPTIONS.map((o) => (
            <option key={`${o.orderBy}-${o.order}`} value={`${o.orderBy}-${o.order}`}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1 text-xs text-orange-300 border border-orange-500/20"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => updateParam(chip.key, "")}
                className="ml-0.5 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
            >
              Limpiar todos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
