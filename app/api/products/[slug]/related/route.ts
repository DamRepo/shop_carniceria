import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug

    if (!slug) {
      return NextResponse.json({ error: 'Slug es requerido' }, { status: 400 })
    }

    // Obtener el producto actual
    const currentProduct = await prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    })

    if (!currentProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Obtener productos de la misma categoría (excluyendo el actual)
    const sameCategory = await prisma.product.findMany({
      where: {
        categoryId: currentProduct.categoryId,
        id: { not: currentProduct.id },
        isActive: true,
        stock: { gt: 0 },
      },
      include: { category: true },
      take: 4,
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Si tenemos menos de 4 productos de la misma categoría, agregar productos aleatorios de otras categorías
    let relatedProducts = [...sameCategory]

    if (relatedProducts.length < 4) {
      const randomProducts = await prisma.product.findMany({
        where: {
          categoryId: { not: currentProduct.categoryId },
          id: { not: currentProduct.id },
          isActive: true,
          stock: { gt: 0 },
        },
        include: { category: true },
        take: 4 - relatedProducts.length,
      })

      relatedProducts = [...relatedProducts, ...randomProducts]
    }

    // Mezclar aleatoriamente
    const shuffled = relatedProducts.sort(() => Math.random() - 0.5)

    // Retornar máximo 6 productos
    const finalProducts = shuffled.slice(0, 6)

    return NextResponse.json(finalProducts)
  } catch (error) {
    console.error('Error al obtener productos relacionados:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos relacionados' },
      { status: 500 }
    )
  }
}
