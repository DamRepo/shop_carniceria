import Image from "next/image";
import Link from "next/link";

type Props = {
  href: string;
  imageSrc: string;
};

export function FeaturedCategoryCardVertical({ href, imageSrc }: Props) {
  return (
    <Link
      href={href}
      className="group relative block min-h-[430px] overflow-hidden rounded-[28px]"
    >
      <Image
        src={imageSrc}
        alt="Cortes de alta calidad"
        fill
        sizes="(max-width: 768px) 0px, 220px"
        className="object-cover brightness-110 contrast-110 transition-transform duration-500 group-hover:scale-105"
      />

      <div className="relative z-10 flex h-full flex-col items-start justify-between p-6"></div>
    </Link>
  );
}