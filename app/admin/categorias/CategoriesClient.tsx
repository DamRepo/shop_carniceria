"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  _count?: { products: number };
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function CategoriesClient() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Formulario de creación
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const slugManuallyEdited = useRef(false);

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      const data = (await safeJson(res)) as Category[] | null;
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Auto-generar slug desde nombre mientras no fue editado manualmente
  useEffect(() => {
    if (!slugManuallyEdited.current) {
      setNewSlug(generateSlug(newName));
    }
  }, [newName]);

  const rootCategories = useMemo(
    () => items.filter((c) => !c.parentId),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [items, query]);

  async function createCategory() {
    const name = newName.trim();
    if (!name) return alert("Nombre requerido.");

    setBusyId("create");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: newSlug.trim() || generateSlug(name),
          parentId: newParentId || null,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        alert(data?.error ?? "No se pudo crear la categoría.");
        return;
      }

      setNewName("");
      setNewSlug("");
      setNewParentId("");
      slugManuallyEdited.current = false;
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) return alert("Nombre requerido.");

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        alert(data?.error ?? "No se pudo editar la categoría.");
        return;
      }

      cancelEdit();
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCategory(id: string, count: number) {
    const msg =
      count > 0
        ? `Esta categoría tiene ${count} producto${count !== 1 ? "s" : ""} asociado${count !== 1 ? "s" : ""}. ¿Estás seguro de que querés borrarla? Los productos quedarán sin categoría.`
        : "¿Seguro que querés borrar esta categoría?";

    if (!confirm(msg)) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      const data = await safeJson(res);

      if (!res.ok) {
        alert(data?.error ?? "No se pudo borrar la categoría.");
        return;
      }

      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario de creación */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-4">
        <div className="font-medium">Nueva categoría</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Nombre</label>
            <Input
              placeholder="Nombre (ej: Vacuno)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Slug</label>
            <Input
              placeholder="slug-auto-generado"
              value={newSlug}
              onChange={(e) => {
                slugManuallyEdited.current = true;
                setNewSlug(e.target.value);
              }}
            />
            {newSlug && (
              <p className="text-xs text-zinc-500">
                URL:{" "}
                <span className="text-zinc-300">
                  /productos?category={newSlug}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Categoría madre (opcional)</label>
          <select
            className="w-full h-10 rounded-md bg-zinc-800 border border-zinc-700 px-3 text-white text-sm"
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
          >
            <option value="">— Sin categoría madre (raíz) —</option>
            {rootCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={createCategory}
          disabled={busyId === "create" || !newName.trim()}
        >
          {busyId === "create" ? "Creando..." : "Crear categoría"}
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar categoría..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Cargando..." : "Refrescar"}
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-950/40 px-4 py-3 text-sm text-zinc-300">
          {loading ? "Cargando..." : `${filtered.length} categorías`}
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Madre</th>
                <th className="px-4 py-3">Productos</th>
                <th className="px-4 py-3 w-[280px]">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => {
                const isEditing = editingId === c.id;
                const count = c._count?.products ?? 0;
                const busy = busyId === c.id;
                const parentName = c.parentId
                  ? items.find((p) => p.id === c.parentId)?.name
                  : null;

                return (
                  <tr key={c.id} className="border-b border-zinc-800">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <div className="font-medium text-zinc-200">{c.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-zinc-300">{c.slug}</code>
                    </td>
                    <td className="px-4 py-3">
                      {parentName ? (
                        <span className="text-xs text-zinc-400">{parentName}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{count}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button onClick={() => saveEdit(c.id)} disabled={busy}>
                            {busy ? "Guardando..." : "Guardar"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={busy}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => startEdit(c)}
                            disabled={busyId !== null}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => deleteCategory(c.id, count)}
                            disabled={busyId !== null}
                          >
                            {busy ? "Borrando..." : "Borrar"}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-400" colSpan={5}>
                    No hay categorías.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
