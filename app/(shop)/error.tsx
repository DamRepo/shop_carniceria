"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ShopError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500" />
      <h2 className="text-2xl font-bold">Algo salió mal</h2>
      <p className="text-muted-foreground max-w-sm">
        No pudimos cargar esta página. Puede ser un problema temporal.
      </p>
      <Button onClick={reset} type="button" variant="outline">
        Reintentar
      </Button>
    </div>
  );
}
