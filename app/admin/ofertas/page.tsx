'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Clock, Star } from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils-format';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  isOnSale: boolean;
  salePrice: number | null;
  saleEndDate: Date | null;
  discountPercent: number | null;
  isFeatured: boolean;
  category: {
    name: string;
  };
}

export default function OfertasAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/admin/products');
      const data = await response.json();
      
      // Filtrar solo productos en oferta
      const offers = data.filter((p: Product) => p.isOnSale);
      setProducts(offers);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingTime = (endDate: Date | null) => {
    if (!endDate) return 'Sin fecha límite';

    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Finalizada';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h restantes`;
    }
    return `${hours}h restantes`;
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
            Puedes crear ofertas desde la sección de productos
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className="bg-zinc-900 border-zinc-800 overflow-hidden"
            >
              <div className="relative aspect-[4/3] bg-zinc-800">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    Sin imagen
                  </div>
                )}
                {product.discountPercent && (
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
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-zinc-400">{product.category.name}</p>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-orange-500">
                      {formatPrice(product.salePrice || 0)}
                    </span>
                    <span className="text-sm text-zinc-500 line-through">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>{getRemainingTime(product.saleEndDate)}</span>
                </div>

                <Link href="/admin/productos">
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700 hover:bg-zinc-800"
                  >
                    Editar Oferta
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
