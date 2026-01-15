import Link from "next/link";

export default function Closing() {
  return (
    <section className="bg-black">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Gracias por elegirnos
          </h2>
          <p className="mt-3 text-zinc-300 max-w-3xl mx-auto">
            Seguimos trabajando todos los días para ofrecerte calidad, buen precio
            y una atención de confianza.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/productos"
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-white font-semibold hover:bg-red-700 transition"
            >
              Ver productos
            </Link>
            <Link
              href="/ofertas"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-5 py-2.5 text-zinc-200 hover:bg-zinc-900 transition"
            >
              Ver ofertas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
