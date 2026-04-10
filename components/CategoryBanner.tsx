import Image from "next/image";
import Link from "next/link";

interface CategoryBannerProps {
  src: string;
  alt: string;
  label: string;
  href: string;
}

export function CategoryBanner({ src, alt, label, href }: CategoryBannerProps) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border bg-card cursor-pointer"
    >
      {/* Imagen */}
      <div className="relative aspect-[16/7] w-full">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {/* Overlay */}
      <div
        className="
          absolute inset-0
          bg-black/35 transition-opacity duration-300
          group-hover:bg-black/50
          flex flex-col items-center justify-center gap-1.5
        "
      >
        <span className="text-[18px] font-medium text-white drop-shadow-sm">
          {label}
        </span>
        <span className="text-[13px] text-white/80">
          Ver productos →
        </span>
      </div>
    </Link>
  );
}
