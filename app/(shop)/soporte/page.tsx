"use client";

import { useState } from "react";

export default function SoportePage() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);

    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/support", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        message: form.get("message"),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    setSending(false);

    if (res.ok) {
      setSent(true);
      e.currentTarget.reset();
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Soporte</h1>

      <p className="text-muted-foreground mb-6">
        Si encontraste un error en el sitio o tenés un problema con tu pedido,
        envianos un mensaje y lo revisaremos lo antes posible.
      </p>

      {sent && (
        <div className="mb-6 rounded-lg bg-green-100 p-3 text-green-800">
          Tu mensaje fue enviado correctamente.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          name="name"
          placeholder="Tu nombre"
          required
          className="w-full border rounded-lg p-3"
        />

        <input
          name="email"
          type="email"
          placeholder="Tu email"
          required
          className="w-full border rounded-lg p-3"
        />

        <textarea
          name="message"
          placeholder="Describe el problema o error"
          required
          rows={5}
          className="w-full border rounded-lg p-3"
        />

        <button
          type="submit"
          disabled={sending}
          className="w-full bg-black text-white rounded-lg p-3"
        >
          {sending ? "Enviando..." : "Enviar mensaje"}
        </button>

      </form>
    </main>
  );
}