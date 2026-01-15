import Image from "next/image";

type Props = {
  side: "left" | "right";
  kicker?: string;
  desc: string;
  bullets?: string[];
  image?: { src: string; alt: string };
};

export default function Split({ side, kicker, desc, bullets, image }: Props) {
  const isLeft = side === "left";

  return (
    <section className="border-b border-zinc-800">
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Imagen */}
          <div className={isLeft ? "lg:col-span-6 order-1" : "lg:col-span-6 order-2"}>
            <div className="relative h-64 sm:h-96 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              {image ? (
                <Image src={image.src} alt={image.alt} fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-zinc-500">
                  Posible imagen
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            </div>
          </div>

          {/* Texto */}
          <div className={isLeft ? "lg:col-span-6 order-2" : "lg:col-span-6 order-1"}>
            <div className="max-w-xl">
              {kicker ? (
                <p className="text-xs tracking-widest uppercase text-red-500">
                  {kicker}
                </p>
              ) : null}

              <p className="mt-5 text-lg sm:text-xl text-zinc-200 leading-relaxed">
                {desc}
              </p>

              {bullets && bullets.length > 0 ? (
                <ul className="mt-7 space-y-3 text-sm sm:text-base text-zinc-300">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
