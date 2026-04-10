"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProductRowSliderProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
};

export function ProductRowSlider<T>({
  items,
  renderItem,
}: ProductRowSliderProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const amount = container.clientWidth * 0.8;

    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-xl bg-background/80 backdrop-blur-sm hidden sm:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-xl bg-background/80 backdrop-blur-sm hidden sm:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      <div className="sm:px-12 md:px-14">
        <div
          ref={scrollRef}
          className="flex items-stretch gap-3 overflow-x-auto scroll-smooth scrollbar-hide"
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="shrink-0 basis-[calc(50vw-10px)] sm:basis-[215px] lg:basis-[220px]"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}