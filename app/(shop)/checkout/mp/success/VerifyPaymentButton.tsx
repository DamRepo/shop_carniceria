"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VerifyPaymentButton({ csId }: { csId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await fetch("/api/mercadopago/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csId }),
      });
    } catch {
      // Si la verificación falla, igual se relee la orden desde la base.
    } finally {
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? "Verificando..." : "Actualizar estado"}
    </Button>
  );
}
