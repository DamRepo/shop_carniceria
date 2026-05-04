"use client";

import { useState } from "react";
import { UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GuestRegisterPromptProps {
  name: string;
  email: string;
  phone: string;
}

export function GuestRegisterPrompt({ name, email, phone }: GuestRegisterPromptProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");

  if (dismissed) return null;

  async function handleRegister() {
    if (!password || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    // Validate email format before submitting
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Email inválido. Recargá la página e intentá nuevamente.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "No se pudo crear la cuenta. Intentá más tarde.");
      }
    } catch {
      setError("Error de conexión. Intentá más tarde.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
        <CheckCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">
          ¡Cuenta creada! Ahora podés iniciar sesión y ver tus pedidos.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="mb-3 flex flex-col items-center gap-1 text-center">
        <UserPlus className="h-8 w-8 text-primary" />
        <h3 className="text-base font-semibold">Guardá tu historial de pedidos</h3>
        <p className="text-sm text-muted-foreground">
          Creá una cuenta gratis. Solo necesitás elegir una contraseña.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input value={email} disabled className="mt-1 bg-muted/50" />
        </div>
        <div>
          <Label htmlFor="guest-password" className="text-xs">
            Contraseña
          </Label>
          <Input
            id="guest-password"
            type="password"
            placeholder="Elegí una contraseña (mínimo 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          className="w-full rounded-xl"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Creando cuenta..." : "Crear mi cuenta"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-xs text-muted-foreground underline"
          onClick={() => setDismissed(true)}
        >
          No, gracias
        </button>
      </div>
    </div>
  );
}
