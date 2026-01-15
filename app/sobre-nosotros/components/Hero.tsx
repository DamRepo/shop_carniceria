import Image from "next/image";

export default function Hero() {
  return (
    <section className="border-b border-zinc-800">
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="relative h-[240px] sm:h-[320px] lg:h-[380px]">
            <Image
              src="/inicio.jpeg"
              alt="Carnicería El Negro"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          </div>

          <div className="p-6 sm:p-8">
            <h1 className="mt-2 text-center sm:text-3xl font-bold text-white">
              SOMOS TRABAJO Y DEDICACION.
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}
