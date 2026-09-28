import Image from "next/image";
import { Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcessingStatus } from "@/lib/business-hours";

interface StoreLocationProps {
  status: ProcessingStatus;
}

/** Traduce el estado de horario del local a lo que se muestra en el eyebrow de la Home. */
function describeStatus(status: ProcessingStatus): {
  label: string;
  detail: string;
  isOpen: boolean;
} {
  switch (status.kind) {
    case "open":
      return {
        label: "Abierto ahora",
        detail: `Cierra a las ${status.closesAt}`,
        isOpen: true,
      };
    case "closed":
      return {
        label: "Cerrado ahora",
        detail: `Abre ${status.opensAt}`,
        isOpen: false,
      };
  }
}

export function StoreLocation({ status }: StoreLocationProps) {
  const directionsUrl = "https://maps.app.goo.gl/ndcReNdoTpBfUnLk6";
  const address = "Calle Sarmiento N°403, San José de Feliciano, Entre Ríos";
  const { label, detail, isOpen } = describeStatus(status);

  return (
    <section className="-mb-20 w-full bg-background pt-8 sm:pt-10">
      <div className="flex w-full flex-col md:h-64 md:flex-row">
        <div className="flex w-full shrink-0 flex-col justify-center gap-3 bg-charcoal px-5 py-6 sm:gap-4 sm:px-8 md:w-[38%] md:gap-3 md:px-6 md:py-5 lg:gap-4 lg:px-10 lg:py-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  isOpen
                    ? "animate-pulse bg-green-500"
                    : "bg-amber-400"
                )}
              />
              <p
                className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  isOpen ? "text-white" : "text-white/60"
                )}
              >
                {label}
              </p>
            </div>
            <p className="text-xs text-white/60">{detail}</p>
          </div>

          <p className="font-display text-base tracking-wide text-white sm:text-lg md:text-xl">
            {address}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="sm" className="sm:h-10 sm:px-6">
              <a href={directionsUrl} target="_blank" rel="noreferrer">
                Visitanos en nuestro local
              </a>
            </Button>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white sm:h-10 sm:px-6"
            >
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="gap-2">
                <Navigation className="h-4 w-4" />
                Cómo llegar
              </a>
            </Button>
          </div>

          <p className="text-xs text-white/60">
            Mercado Pago · Transferencia · Efectivo
          </p>
        </div>

        <div className="relative h-48 w-full overflow-hidden md:h-auto md:flex-1">
          <Image
            src="/carniceria_elnegro.png"
            alt="Frente del local de Carnicería El Negro"
            fill
            className="object-cover object-[center_30%]"
            sizes="(min-width: 768px) 65vw, 100vw"
          />

          {/* Vignette ancho y sutil: prolonga un oscurecimiento leve más adentro de la foto */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-64 bg-gradient-to-r from-charcoal/50 via-charcoal/15 to-transparent md:block" />
          {/* Fusión principal: mismo tono sólido del panel (#1A1A1A) cayendo a transparente */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-48 bg-gradient-to-r from-charcoal to-transparent md:block" />
        </div>
      </div>
    </section>
  );
}
