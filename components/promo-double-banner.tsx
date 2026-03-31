import Image from "next/image";
import Link from "next/link";

type PromoBannerItem = {
  href: string;
  imageSrc: string;
  alt: string;
};

type PromoDoubleBannerProps = {
  left: PromoBannerItem;
  right: PromoBannerItem;
};

function PromoBannerCard({ href, imageSrc, alt }: PromoBannerItem) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border bg-card"
    >
      <div className="relative aspect-[16/7] w-full">
        <Image
          src={imageSrc}
          alt={alt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </Link>
  );
}

export function PromoDoubleBanner({
  left,
  right,
}: PromoDoubleBannerProps) {
  return (
    <section className="w-full py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <PromoBannerCard {...left} />
          <PromoBannerCard {...right} />
        </div>
      </div>
    </section>
  );
}