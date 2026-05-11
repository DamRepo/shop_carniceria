'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  src: string;
  alt: string;
  tag: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
}

const slides: Slide[] = [
  {
    src: '/carniceria-frente.jpeg',
    alt: 'Fachada de Carnicería El Negro',
    tag: 'San José de Feliciano, Entre Ríos',
    title: 'CARNICERÍA\nEL NEGRO',
    subtitle: 'Cortes frescos. Embutidos artesanales.',
    cta: { label: 'Ver productos', href: '/productos' },
  },
  {
    src: '/gondola.jpeg',
    alt: 'Interior de la carnicería con productos frescos',
    tag: 'Elaboración propia',
    title: 'FÁBRICA DE\nEMBUTIDOS',
    subtitle: 'Chorizos, morcillas y fiambres caseros.',
    cta: { label: 'Ver elaborados', href: '/elaborados' },
  },
  {
    src: '/caja.jpeg',
    alt: 'Selección de cortes premium y embutidos',
    tag: 'Más de 7 años de trayectoria',
    title: 'CALIDAD\nARTESANAL',
    subtitle: 'Selección premium de cortes argentinos.',
    cta: { label: 'Ver ofertas', href: '/ofertas' },
  },
];

export function HeroSlider() {
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay.current]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div key={index} className="relative flex-[0_0_100%] min-w-0">
              <div className="relative h-[400px] lg:h-[560px] w-full bg-black">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  className="object-cover object-center"
                  sizes="100vw"
                />

                {/* Left gradient fade — black 60% left-aligned */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                {/* Bottom fade to background */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />

                {/* Text overlay — bottom-left */}
                <div className="absolute bottom-16 left-6 lg:left-12 max-w-lg pr-4">
                  {/* Tag line */}
                  <span className="font-display tracking-widest text-primary text-xs uppercase block mb-2">
                    {slide.tag}
                  </span>

                  {/* Main title */}
                  <h2 className="font-display text-5xl lg:text-7xl leading-none text-foreground whitespace-pre-line mb-3">
                    {slide.title}
                  </h2>

                  {/* Subtitle */}
                  <p className="font-sans text-base text-zinc-300 mb-5">
                    {slide.subtitle}
                  </p>

                  {/* CTA Button */}
                  <Link
                    href={slide.cta.href}
                    className="inline-block bg-primary hover:bg-blood-dark text-foreground font-sans font-semibold text-sm uppercase tracking-wider px-6 py-3 transition-colors duration-200 rounded-none border-0"
                  >
                    {slide.cta.label}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrow: left — square, not round */}
      <button
        type="button"
        onClick={scrollPrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-primary/80 text-white w-10 h-10 flex items-center justify-center transition-colors duration-200 rounded-none"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* Arrow: right */}
      <button
        type="button"
        onClick={scrollNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-primary/80 text-white w-10 h-10 flex items-center justify-center transition-colors duration-200 rounded-none"
        aria-label="Siguiente"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Progress bar indicators — thin red line style */}
      <div className="absolute bottom-6 left-6 lg:left-12 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Ir a la imagen ${index + 1}`}
            className={[
              'h-0.5 transition-all duration-500 rounded-none',
              index === selectedIndex
                ? 'w-10 bg-primary'
                : 'w-4 bg-white/30 hover:bg-white/60',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
