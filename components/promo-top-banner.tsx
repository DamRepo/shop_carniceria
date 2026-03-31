"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type PromoSlide = {
  id: number;
  title?: string;
  subtitle?: string;
  image?: string;
  bgClass?: string;
};

const slides: PromoSlide[] = [
  {
    id: 1,
    title: "¡COMPRÁ AHORA Y APROVECHÁ!",
    bgClass: "bg-orange-300",
  },
  {
    id: 2,
    title: "CONOCÉ NUESTRA WEB Y DISFRUTÁ",
    bgClass: "bg-orange-300",
  },
  {
    id: 3,
    title: "CALIDAD Y BUENOS PRECIOS",
    bgClass: "bg-orange-300",
  },
];

const redItems = [
  "🔥 ¡Ve las ofertas!",
  "① Comprá online",
  "② Retirá en menos de 24 hs",
];

export function PromoTopBanner() {
  const [current, setCurrent] = useState(0);
  const [redCurrent, setRedCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRedCurrent((prev) => (prev + 1) % redItems.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-white">

      {/* BANNER NARANJA */}
      <div className="relative h-[30px] sm:h-[34px] md:h-[38px]">
        {slides.map((slide, index) => {
          const active = index === current;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
                active
                  ? "opacity-100 translate-y-0"
                  : "pointer-events-none opacity-0 -translate-y-1"
              } ${slide.bgClass ?? "bg-yellow-200"}`}
            >
              <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-center px-4">
                {slide.image ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={slide.image}
                      alt={slide.title ?? "Promoción"}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-center text-[13px] font-extrabold uppercase tracking-tight text-black sm:text-[15px] md:text-[18px]">
                    {slide.title}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BARRA ROJA */}
      <div className="bg-[#c0392b] text-white">
        <div className="mx-auto max-w-[1600px] px-4">

          {/* Mobile: un item rotando */}
          <div className="relative flex h-[30px] items-center justify-center overflow-hidden sm:hidden">
            {redItems.map((item, index) => (
              <span
                key={index}
                className={`absolute text-[11px] font-semibold tracking-wide transition-all duration-500 ${
                  index === redCurrent
                    ? "opacity-100 translate-y-0"
                    : "pointer-events-none opacity-0 translate-y-2"
                }`}
              >
                {item}
              </span>
            ))}
          </div>

          {/* Desktop: los 3 items juntos */}
          <div className="hidden h-[34px] items-center justify-center gap-8 sm:flex md:gap-12">
            <span className="text-[12px] font-semibold sm:text-[13px]">🔥 ¡Ve las ofertas!</span>
            <span className="text-[12px] font-semibold text-white/70 sm:text-[13px]">·</span>
            <span className="text-[12px] font-semibold sm:text-[13px]">① Comprá online</span>
            <span className="text-[12px] font-semibold text-white/70 sm:text-[13px]">·</span>
            <span className="text-[12px] font-semibold sm:text-[13px]">② Retirá en menos de 24 hs</span>
          </div>

        </div>
      </div>
    </div>
  );
}