"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  total: number;
  currentPage: number;
  pageSize: number;
}

export function AdminPagination({ total, currentPage, pageSize }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  function goTo(page: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(page));
    router.push(`/admin/productos?${params.toString()}`);
  }

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  function getPageNumbers(): (number | "…")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "…")[] = [1];
    if (currentPage > 3) pages.push("…");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  const btnBase =
    "px-2 py-1 rounded text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const btnNav = `${btnBase} text-zinc-400 hover:text-white hover:bg-zinc-800`;
  const btnPage = (active: boolean) =>
    active
      ? `${btnBase} bg-orange-500 text-white font-medium`
      : `${btnBase} text-zinc-400 hover:bg-zinc-800 hover:text-white`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800 mt-2">
      <p className="text-sm text-zinc-400">
        Mostrando {from}–{to} de {total} productos
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(1)}
          disabled={currentPage === 1}
          className={btnNav}
          title="Primera página"
        >
          «
        </button>
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className={btnNav}
          title="Anterior"
        >
          ‹
        </button>

        {getPageNumbers().map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-zinc-600">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              className={btnPage(p === currentPage)}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={btnNav}
          title="Siguiente"
        >
          ›
        </button>
        <button
          onClick={() => goTo(totalPages)}
          disabled={currentPage === totalPages}
          className={btnNav}
          title="Última página"
        >
          »
        </button>
      </div>
    </div>
  );
}
