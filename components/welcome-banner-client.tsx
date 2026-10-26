
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BadgePercent } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackEvent, WELCOME_PROMOTION } from "@/lib/analytics";

type Variant = "guest" | "eligible";

type BannerContent = {
  title: string;
  detail: string;
  disclaimer?: string;
  cta: string;
  href: string;
};

const VIEW_SESSION_KEY = "ga_welcome_promo_viewed";

const CONTENT: Record<Variant, BannerContent> = {
  guest: {
  title: "🎁 ¡Registrate y obtené un 10% de descuento!",
  detail:
    "Creá tu cuenta y disfrutá de un 10% OFF pagando en efectivo o por transferencia.",
  disclaimer:
    "Beneficio válido una vez por cuenta. No incluye el costo de envío.",
  cta: "Crear mi cuenta",
  href: "/auth/register?from=welcome_banner",
},

  eligible: {
    title: "¡Te damos la bienvenida con un 10% de descuento!",
    detail:
      "Pagá en efectivo o por transferencia y disfrutá de un 10% OFF en el valor de tus productos.",
    disclaimer:
      "Beneficio válido una vez por cuenta. No incluye el costo de envío.",
    cta: "Ver productos",
    href: "/productos",
  },
};

/** Registra view_promotion una sola vez por sesión del navegador. */
function trackViewOncePerSession() {
  try {
    if (sessionStorage.getItem(VIEW_SESSION_KEY) !== null) return;
  } catch {
    // Sin sessionStorage, no se mide la vista.
    return;
  }

  // Solo se marca como vista si GA recibió el evento.
  if (trackEvent("view_promotion", WELCOME_PROMOTION)) {
    try {
      sessionStorage.setItem(VIEW_SESSION_KEY, "1");
    } catch {
      // Ignorar errores de almacenamiento.
    }
  }
}

export function WelcomeBannerClient() {
  const { status } = useSession();
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;

    fetch("/api/loyalty/welcome-banner", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;

        const value =
          typeof data === "object" && data !== null && "variant" in data
            ? data.variant
            : null;

        setVariant(
          value === "guest" || value === "eligible" ? value : null
        );
      })
      .catch(() => {
        if (!cancelled) setVariant(null);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (variant) trackViewOncePerSession();
  }, [variant]);

  // Sin respuesta, sin elegibilidad o con el beneficio desactivado,
  // no se renderiza el banner.
  if (!variant) return null;

  const content = CONTENT[variant];

  return (
    <section
      className="w-full bg-background pt-6 sm:pt-10"
      aria-label="Beneficio de bienvenida"
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="flex items-start gap-3 sm:flex-1 sm:items-center">
            <BadgePercent
              className="h-8 w-8 shrink-0 text-primary"
              aria-hidden="true"
            />

            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground sm:text-lg">
                {content.title}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {content.detail}
              </p>

              {content.disclaimer && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
                  {content.disclaimer}
                </p>
              )}
            </div>
          </div>

          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link
              href={content.href}
              onClick={() =>
                trackEvent("select_promotion", WELCOME_PROMOTION)
              }
            >
              {content.cta}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
