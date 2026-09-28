import Link from "next/link";

export default function Closing() {
  return (
    <section className="bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-2xl border border-border bg-muted/50 p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Gracias por elegirnos
          </h2>
          <p className="mt-3 text-muted-foreground max-w-3xl mx-auto">
            Seguimos trabajando todos los días para ofrecerte calidad, buen precio
            y una atención de confianza.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/productos"
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-foreground font-semibold hover:bg-red-700 transition"
            >
              Ver productos
            </Link>
            <Link
              href="/ofertas"
              className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-foreground hover:bg-muted transition"
            >
              Ver ofertas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

