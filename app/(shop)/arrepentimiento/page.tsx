"use client";

import { useState } from "react";
import { RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ArrepentimientoPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    const form = new FormData(e.currentTarget);

    const payload = {
      orderId: String(form.get("orderId") || "").trim(),
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      reason: String(form.get("reason") || "").trim(),
    };

    try {
      const res = await fetch("/api/arrepentimiento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "No se pudo enviar la solicitud.");
        return;
      }

      setSuccess(
        "Tu solicitud fue enviada correctamente. Nos pondremos en contacto a la brevedad."
      );
      e.currentTarget.reset();
    } catch {
      setError("Ocurrió un error al enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-start gap-3">
          <div className="rounded-xl bg-red-100 p-2 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <RotateCcw className="h-5 w-5" />
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Derecho de revocación
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Botón de arrepentimiento
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Si realizaste una compra online, podés solicitar la revocación de
              la operación dentro de los plazos legales aplicables. Completá el
              siguiente formulario y revisaremos tu solicitud.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Esta solicitud no implica la cancelación automática del pedido.
              Primero será validada por el comercio.
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="orderId"
                className="mb-2 block text-sm font-medium"
              >
                Número de pedido *
              </label>
              <input
                id="orderId"
                name="orderId"
                type="text"
                required
                placeholder="Ej: 12345"
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Nombre y apellido *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Tu nombre"
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Correo electrónico *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="tuemail@correo.com"
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium"
              >
                Teléfono
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                placeholder="+54 9 ..."
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reason"
              className="mb-2 block text-sm font-medium"
            >
              Motivo de la solicitud
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={5}
              placeholder="Contanos brevemente el motivo"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              Los campos marcados con * son obligatorios.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}