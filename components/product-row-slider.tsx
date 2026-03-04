"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
};

export function ProductRowSlider<T>({ items, renderItem, className }: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;

    // tolerancia para floats
    const tol = 2;
    setCanLeft(el.scrollLeft > tol);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - tol);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    // por si cambian tamaños (responsive)
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [items.length]);

  const scrollByPage = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9);
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  // Si hay pocos items, no mostramos flechas
  const showArrows = useMemo(() => items.length > 0, [items.length]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {showArrows && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => scrollByPage("left")}
            disabled={!canLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex bg-background/80 backdrop-blur border-zinc-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => scrollByPage("right")}
            disabled={!canRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex bg-background/80 backdrop-blur border-zinc-700"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      <div
        ref={scrollerRef}
        className="
          flex gap-3 overflow-x-auto scroll-smooth
          snap-x snap-mandatory
          pb-2
          [-ms-overflow-style:none] [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {items.map((item, idx) => (
          <div
            key={(item as any)?.id ?? idx}
            className="
              snap-start
              shrink-0
              w-[78%] sm:w-[46%] md:w-[32%] lg:w-[24%]
            "
          >
            {renderItem(item, idx)}
          </div>
        ))}
      </div>
    </div>
  );
}