import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
      isFeatured,
      isActive
    } = body;

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Si se cambió el slug, verificar que no exista otro producto con ese slug
    if (slug && slug !== existingProduct.slug) {
      const slugExists = await prisma.product.findUnique({
        where: { slug }
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'El slug ya existe' },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Math.round(price * 100) }),
        ...(categoryId && { categoryId }),
        ...(imageUrl !== undefined && { image: imageUrl }),
        ...(stock !== undefined && { stock }),
        ...(unitType && { unitType }),
        ...(isOnSale !== undefined && { isOnSale }),
        ...(salePrice !== undefined && { salePrice: salePrice ? Math.round(salePrice * 100) : null }),
        ...(saleEndDate !== undefined && { saleEndDate: saleEndDate ? new Date(saleEndDate) : null }),
        ...(isOnSale && salePrice && price && { discountPercent: Math.round(((price - salePrice) / price) * 100) }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete - marcar como inactivo en lugar de eliminar
    await prisma.product.update({
      where: { id: params.id },
      data: {
        isActive: false
      }
    });

    return NextResponse.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}
