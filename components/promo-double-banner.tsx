import { CategoryBanner } from "@/components/CategoryBanner";

type PromoBannerItem = {
  href: string;
  imageSrc: string;
  alt: string;
  label: string;
};

type PromoDoubleBannerProps = {
  left: PromoBannerItem;
  right: PromoBannerItem;
};

export function PromoDoubleBanner({ left, right }: PromoDoubleBannerProps) {
  return (
    <section className="w-full py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <CategoryBanner
            href={left.href}
            src={left.imageSrc}
            alt={left.alt}
            label={left.label}
          />
          <CategoryBanner
            href={right.href}
            src={right.imageSrc}
            alt={right.alt}
            label={right.label}
          />
        </div>
      </div>
    </section>
  );
}
