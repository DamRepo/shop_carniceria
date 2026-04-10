'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Clock, Star } from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils-format';
import Link from 'next/link';

type UnitType = 'PER_KG' | 'PER_UNIT';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number; // centavos

  // ✅ Prisma devuelve image (no imageUrl)
  image?: string | null;
  imageUrl?: string | null; // compat si existiera

  isOnSale: boolean;
  salePrice: number | null; // centavos
  saleEndDate: string | null; // JSON => string
  discountPercent: number | null;
  isFeatured: boolean;

  unitType?: UnitType | null;

  // ✅ contenido neto
  netWeightGr?: number | null;
  netVolumeMl?: number | null;

  category: { name: string };
}

function calcPricePerKgFromGrams(priceCents: number, grams: number) {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return null;
  if (!Number.isFinite(grams) || grams <= 0) return null;
  return Math.round((priceCents * 1000) / grams);
}

function calcPricePerLtFromMl(priceCents: number, ml: number) {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return null;
  if (!Number.isFinite(ml) || ml <= 0) return null;
  return Math.round((priceCents * 1000) / ml);
}

function formatNetContent(p: Product) {
  const unitType = (p.unitType ?? 'PER_KG') as UnitType;
  if (unitType !== 'PER_UNIT') return null;

  const g = p.netWeightGr ?? null;
  const ml = p.netVolumeMl ?? null;

  if (g && g > 0) return `${g} g`;
  if (ml && ml > 0) return `${ml} ml`;
  return null;
}

export default function OfertasAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/admin/products', { cache: 'no-store' });
      const data = (await response.json()) as Product[];
      const offers = (data ?? []).filter((p) => p.isOnSale);

      // Ordenar: activas primero (las que vencen antes), luego sin fecha, luego vencidas
      const now = Date.now();
      offers.sort((a, b) => {
        const aEnd = a.saleEndDate ? new Date(a.saleEndDate).getTime() : null;
        const bEnd = b.saleEndDate ? new Date(b.saleEndDate).getTime() : null;
        const aExpired = aEnd !== null && aEnd <= now;
        const bExpired = bEnd !== null && bEnd <= now;

        if (aExpired && !bExpired) return 1;
        if (!aExpired && bExpired) return -1;
        if (!aExpired && !bExpired) {
          if (aEnd === null && bEnd === null) return 0;
          if (aEnd === null) return 1;
          if (bEnd === null) return -1;
          return aEnd - bEnd; // vencen antes → primero
        }
        return (aEnd ?? 0) - (bEnd ?? 0);
      });

      setProducts(offers);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingTime = (endDate: string | null) => {
    if (!endDate) return 'Sin fecha límite';

    const now = new Date();
    const end = new Date(endDate);

    if (!Number.isFinite(end.getTime())) return 'Fecha inválida';

    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Finalizada';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return days > 0 ? `${days}d ${hours}h restantes` : `${hours}h restantes`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ofertas</h1>
          <p className="text-zinc-400 mt-1">
            {products.length} producto{products.length !== 1 ? 's' : ''} en oferta
          </p>
        </div>
        <Link href="/admin/productos">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Tag className="w-4 h-4 mr-2" />
            Gestionar Productos
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800 p-12 text-center">
          <Tag className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No hay ofertas activas
          </h3>
          <p className="text-zinc-400">
            Podés crear ofertas desde la sección de productos
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const unitType = (product.unitType ?? 'PER_KG') as UnitType;
            const finalPrice =
              product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;

            const content = formatNetContent(product);

            const pricePerKg =
              unitType === 'PER_UNIT' && product.netWeightGr
                ? calcPricePerKgFromGrams(finalPrice, product.netWeightGr)
                : null;

            const pricePerLt =
              unitType === 'PER_UNIT' && product.netVolumeMl
                ? calcPricePerLtFromMl(finalPrice, product.netVolumeMl)
                : null;

            const imageSrc = product.image ?? product.imageUrl ?? null;
            const endDate = product.saleEndDate ? new Date(product.saleEndDate) : null;
            const isExpired = endDate !== null && endDate.getTime() <= Date.now();

            return (
              <Card
                key={product.id}
                className={`bg-zinc-900 border-zinc-800 overflow-hidden transition-opacity ${isExpired ? 'opacity-50' : ''}`}
              >
                <div className="relative aspect-[4/3] bg-zinc-800">
                  {imageSrc ? (
                    <Image src={imageSrc} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      Sin imagen
                    </div>
                  )}

                  {product.discountPercent != null && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{product.discountPercent}%
                    </div>
                  )}

                  {product.isFeatured && (
                    <div className="absolute top-3 left-3 bg-yellow-500 text-black px-2 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-white mb-1">{product.name}</h3>
                    <p className="text-sm text-zinc-400">{product.category?.name}</p>

                    {content && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Contenido: <span className="text-zinc-200">{content}</span>
                      </p>
                    )}
                  </div>

                  <div className="mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-orange-500">
                        {formatPrice(finalPrice)}
                      </span>

                      {product.salePrice && product.salePrice > 0 && (
                        <span className="text-sm text-zinc-500 line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {pricePerKg != null && (
                    <p className="text-xs text-zinc-400">
                      Precio por 1 kg:{' '}
                      <span className="text-zinc-200">{formatPrice(pricePerKg)}</span>
                    </p>
                  )}

                  {pricePerLt != null && (
                    <p className="text-xs text-zinc-400">
                      Precio por 1 L:{' '}
                      <span className="text-zinc-200">{formatPrice(pricePerLt)}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm mt-3 mb-4">
                    <Clock className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-zinc-400'}`} />
                    <span className={isExpired ? 'text-red-400 font-medium' : 'text-zinc-400'}>
                      {getRemainingTime(product.saleEndDate)}
                    </span>
                    {isExpired && (
                      <span className="ml-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
                        Vencida
                      </span>
                    )}
                  </div>

                  <Link href="/admin/productos">
                    <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800">
                      Editar Oferta
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}