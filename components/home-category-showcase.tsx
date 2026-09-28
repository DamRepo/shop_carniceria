import Image from "next/image";
import Link from "next/link";
import { Percent } from "lucide-react";

interface CategoryTileConfig {
  slug: string;
  label: string;
  href: string;
  image: string;
}

/**
 * Curaduría de accesos directos del home: mezcla categorías raíz con
 * subcategorías puntuales (Embutidos vive bajo Elaborados, Pollos bajo
 * Carnicería) siguiendo el mismo patrón de `/productos?category=<slug>`
 * que ya usa PromoDoubleBanner en el home. `existingSlugs` (consultado
 * contra la DB real en el server component padre) decide qué tarjetas
 * se muestran — si un slug se renombra o se borra, la tarjeta desaparece
 * en vez de linkear a una categoría inexistente.
 */
const CATEGORY_TILES: CategoryTileConfig[] = [
  { slug: "carniceria", label: "Carnicería", href: "/carniceria", image: "/carne.png" },
  { slug: "embutidos", label: "Embutidos", href: "/productos?category=embutidos", image: "/embutidos.png" },
  { slug: "pollo", label: "Pollos", href: "/productos?category=pollo", image: "/pollo.png" },
  { slug: "elaborados", label: "Elaborados", href: "/elaborados", image: "/elaborados.png" },
  { slug: "minimercado", label: "Minimercado", href: "/minimercado", image: "/minimercado.png" },
  {
    slug: "fruteria-y-verduleria",
    label: "Frutas y verduras",
    href: "/fruteria-y-verduleria",
    image: "/frutas_y_verduras.png",
  },
];

export function HomeCategoryShowcase({ existingSlugs }: { existingSlugs: string[] }) {
  const tiles = CATEGORY_TILES.filter((tile) => existingSlugs.includes(tile.slug));

  if (tiles.length === 0) return null;

  return (
    <section className="w-full bg-background py-8 sm:py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-end justify-between sm:mb-10">
          <div>
            <h2 className="font-display text-3xl tracking-wider text-foreground sm:text-4xl">
              ¿QUÉ VAS A COMPRAR HOY?
            </h2>
            <div className="mt-2 h-1 w-16 bg-primary" />
          </div>

          <Link
            href="/productos"
            className="hidden shrink-0 text-sm font-semibold text-primary hover:underline sm:block"
          >
            Ver todas las categorías →
          </Link>
        </div>

        <div className="relative -mx-4 lg:mx-0">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:grid lg:snap-none lg:grid-cols-7 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {tiles.map((tile) => (
              <Link
                key={tile.slug}
                href={tile.href}
                className="group flex w-[44%] shrink-0 snap-start flex-col items-center gap-3 rounded-lg border border-border bg-card p-3 text-center shadow-sm transition-shadow hover:shadow-md md:w-[28%] lg:w-auto"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-md">
                  <Image
                    src={tile.image}
                    alt={tile.label}
                    fill
                    sizes="(min-width: 1024px) 14vw, (min-width: 768px) 28vw, 44vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">{tile.label}</span>
              </Link>
            ))}

            <Link
              href="/ofertas"
              className="group flex w-[44%] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-lg bg-primary p-3 text-center text-primary-foreground shadow-sm transition-shadow hover:shadow-md md:w-[28%] lg:w-auto"
            >
              <div className="flex aspect-square w-full items-center justify-center">
                <Percent className="h-10 w-10" />
              </div>
              <span className="text-sm font-semibold">Ofertas</span>
            </Link>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent lg:hidden"
          />
        </div>
      </div>
    </section>
  );
}
