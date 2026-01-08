'use client';

import { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const slides = [
  {
    src: '/carniceria-frente.jpeg',
    alt: 'Fachada de Carnicería El Negro',
  },
  {
    src: '/gondola.jpeg',
    alt: 'Interior de la carnicería con productos frescos',
  },
  {
    src: '/caja.jpeg',
    alt: 'Selección de cortes premium y embutidos',
  },
];

export function HeroSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <div className="relative w-full">
      {/* Slider container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div key={index} className="relative flex-[0_0_100%] min-w-0">
              <div className="relative h-[320px] md:h-[380px] lg:h-[460px] w-full bg-black/20">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  className="object-cover"
                  sizes="100vw"
                />
                {/* Gradient overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <Button
        variant="ghost"
        size="icon"
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
      >
        <ChevronLeft className="h-6 w-6" />
        <span className="sr-only">Anterior</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
      >
        <ChevronRight className="h-6 w-6" />
        <span className="sr-only">Siguiente</span>
      </Button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className="h-2 w-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
            aria-label={`Ir a la imagen ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
