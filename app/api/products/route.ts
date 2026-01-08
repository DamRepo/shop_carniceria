import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request?.url ?? '');
    const categorySlug = searchParams?.get?.('category');
    const onSale = searchParams?.get?.('onSale');
    const featured = searchParams?.get?.('featured');
    const limitParam = searchParams?.get?.('limit');

    const where = {
      isActive: true,
      ...(categorySlug && categorySlug !== 'todos'
        ? {
            category: {
              slug: categorySlug,
            },
          }
        : {}),
      ...(onSale === 'true'
        ? {
            isOnSale: true,
          }
        : {}),
      ...(featured === 'true'
        ? {
            isFeatured: true,
          }
        : {}),
    };

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const products = await prisma?.product?.findMany?.({
      where,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json(products ?? []);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      price,
      categoryId,
      imageUrl,
      stock,
      unitType,
      isOnSale,
      salePrice,
      saleEndDate,
      isFeatured
    } = body;

    // Validar datos requeridos
    if (!name || !slug || !price || !categoryId || !unitType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el slug sea único
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'El slug ya existe' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: Math.round(price * 100), // Convertir a centavos
        categoryId,
        image: imageUrl,
        stock: stock || 0,
        unitType,
        isOnSale: isOnSale || false,
        salePrice: salePrice ? Math.round(salePrice * 100) : null,
        saleEndDate: saleEndDate ? new Date(saleEndDate) : null,
        discountPercent: isOnSale && salePrice ? Math.round(((price - salePrice) / price) * 100) : null,
        isFeatured: isFeatured || false,
        isActive: true
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}
