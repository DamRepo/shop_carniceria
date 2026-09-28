import Image from "next/image";
import Link from "next/link";
import { Truck, Home, Award, Leaf } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Leaf,
    title: "Elaboración propia",
    subtitle: "y recetas tradicionales",
    priority: true,
  },
  { icon: Truck, title: "Retirá hoy", subtitle: "en nuestro local" },
  { icon: Home, title: "Envío a domicilio", subtitle: "Feliciano y ejido (4km)" },
  { icon: Award, title: "Más de 7 años", subtitle: "en la comunidad" },
];

export function HomeHeroBanner() {
  return (
    <section className="w-full bg-background">
      <div className="relative h-[420px] w-full bg-black lg:h-[520px]">
        <Image
          src="/mobile.png"
          alt="Carnicería El Negro"
          fill
          priority
          className="object-cover object-[100%_75%] xl:hidden"
          sizes="(max-width: 1279px) 100vw, 0px"
        />
        <Image
          src="/banner.png"
          alt="Carnicería El Negro"
          fill
          priority
          className="hidden object-cover object-center xl:block"
          sizes="(min-width: 1280px) 100vw, 0px"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/5 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent sm:hidden" />

        <div className="absolute inset-y-0 left-6 flex max-w-[58%] flex-col justify-center pr-2 sm:max-w-md sm:pr-4 lg:left-12">
          <span className="mb-3 font-sans text-xs font-bold uppercase tracking-widest text-primary">
            Calidad local, como siempre
          </span>

          <h1 className="font-display text-3xl leading-[0.95] text-white sm:text-5xl lg:text-6xl">
            EL MEJOR CORTE
            <br />
            EN <span className="text-primary">TU MESA</span>
          </h1>

          <p className="mt-4 max-w-sm text-sm text-zinc-300 sm:text-base">
            Carnes frescas, embutidos artesanales y todo lo que necesitás, sin
            salir de casa.
          </p>

          <div className="mt-6">
            <Link href="/ofertas">
              <Button size="lg" className="px-5 text-base sm:px-8 sm:text-lg">
                Ver ofertas de hoy →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-border bg-background py-6">
        <div className="container mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            const isPriority = benefit.priority === true;

            return (
              <div
                key={benefit.title}
                className={cn(
                  "flex items-center gap-3",
                  isPriority &&
                    "rounded-lg transition-transform duration-200 hover:scale-[1.02] hover:shadow-glow-red-sm"
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    isPriority
                      ? "h-8 w-8 text-primary"
                      : "h-5 w-5 text-smoke sm:h-6 sm:w-6"
                  )}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-foreground",
                      isPriority ? "text-base font-bold" : "text-sm font-medium"
                    )}
                  >
                    {benefit.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {benefit.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
