"use client";

import { useEffect } from "react";

const RETRY_MS = 60_000;

/** Si la pantalla del local falla al renderizar, queda en negro y se recarga sola. */
export default function TvError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("[tv] Error de render:", error);
    const timer = setTimeout(() => window.location.reload(), RETRY_MS);
    return () => clearTimeout(timer);
  }, [error]);

  return <div className="fixed inset-0 cursor-none bg-black" />;
}
