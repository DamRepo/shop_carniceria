"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  href: string;
  imageSrc: string;
};

export function FeaturedCategoryCardHorizontal({ href, imageSrc }: Props) {
  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-xl border bg-card"
    >
      <div className="relative h-[90px] w-full sm:h-[110px]">
        <Image
          src={imageSrc}
          alt="Cortes de alta calidad"
          fill
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
          sizes="100vw"
        />
      </div>
    </Link>
  );
}