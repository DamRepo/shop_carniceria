import Image from "next/image";

export default function Hero() {
  return (
    <section className="border-b border-border">
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          <div className="relative h-[240px] sm:h-[320px] lg:h-[380px]">
            <Image
              src="/carniceria-frente.jpeg"
              alt="Carnicería El Negro"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          </div>

          <div className="p-6 sm:p-8">
            <h1 className="mt-2 text-center sm:text-3xl font-bold text-foreground">
              SOMOS TRABAJO Y DEDICACION.
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}

