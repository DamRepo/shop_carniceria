"use client";

import { useEffect, useState } from "react";
import { Sparkles, ShoppingBasket, Flame } from "lucide-react";

type RedItem = {
  text: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const redItems: RedItem[] = [
  { text: "Cortes frescos, elegidos el mismo día", Icon: Sparkles },
  { text: "Carne, verdura y almacén en un solo pedido", Icon: ShoppingBasket },
  { text: "Ofertas nuevas cada día, se agotan rápido", Icon: Flame },
];

export function PromoTopBanner() {
  const [redCurrent, setRedCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRedCurrent((prev) => (prev + 1) % redItems.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1600px] px-4">

        {/* Mobile y tablet: un item rotando */}
        <div className="relative flex h-[30px] items-center justify-center overflow-hidden lg:hidden">
          {redItems.map((item, index) => {
            const Icon = item.Icon;
            return (
              <span
                key={index}
                className={`absolute flex items-center gap-1.5 text-[11px] font-semibold tracking-wide transition-all duration-500 ${
                  index === redCurrent
                    ? "opacity-100 translate-y-0"
                    : "pointer-events-none opacity-0 translate-y-2"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.text}
              </span>
            );
          })}
        </div>

        {/* Desktop: los 3 items juntos */}
        <div className="hidden h-[34px] items-center justify-center gap-8 lg:flex lg:gap-12">
          {redItems.map((item, index) => {
            const Icon = item.Icon;
            return (
              <span key={index} className="contents">
                {index > 0 && (
                  <span className="text-[12px] font-semibold text-white/70 sm:text-[13px]">
                    ·
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[12px] font-semibold sm:text-[13px]">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.text}
                </span>
              </span>
            );
          })}
        </div>

      </div>
    </div>
  );
}
