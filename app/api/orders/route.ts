import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request?.json?.();

    const {
      customerName,
      phone,
      email,
      deliveryMethod,
      address,
      addressDetails,
      city,
      postalCode,
      notes,
      items,
    } = body ?? {};

    // Validaciones básicas
    if (!customerName || !phone || !items || (items?.length ?? 0) === 0) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    if (deliveryMethod === 'DELIVERY' && !address) {
      return NextResponse.json(
        { error: 'Dirección es requerida para envío a domicilio' },
        { status: 400 }
      );
    }

    // Calcular totales
    let subtotal = 0;
    const orderItems = [];

    for (const item of items ?? []) {
      const product = await prisma?.product?.findUnique?.({
        where: { id: item?.productId ?? '' },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Producto ${item?.productId ?? 'desconocido'} no encontrado` },
          { status: 404 }
        );
      }

      if ((product?.stock ?? 0) < (item?.quantity ?? 0)) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${product?.name ?? 'producto'}` },
          { status: 400 }
        );
      }

      const lineTotal = (product?.price ?? 0) * (item?.quantity ?? 0);
      subtotal += lineTotal;

      orderItems.push({
        productId: product?.id ?? '',
        quantity: item?.quantity ?? 0,
        unitPrice: product?.price ?? 0,
        lineTotal,
      });
    }

    // Costo de envío (ejemplo: $500 para delivery)
    const deliveryCost = deliveryMethod === 'DELIVERY' ? 50000 : 0; // $500 en centavos
    const total = subtotal + deliveryCost;

    // Crear orden
    const order = await prisma?.order?.create?.({
      data: {
        customerName,
        phone,
        email: email ?? undefined,
        deliveryMethod,
        address: address ?? undefined,
        addressDetails: addressDetails ?? undefined,
        city: city ?? undefined,
        postalCode: postalCode ?? undefined,
        notes: notes ?? undefined,
        subtotal,
        deliveryCost,
        total,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Actualizar stock de productos
    for (const item of items ?? []) {
      await prisma?.product?.update?.({
        where: { id: item?.productId ?? '' },
        data: {
          stock: {
            decrement: item?.quantity ?? 0,
          },
        },
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Error al crear la orden' },
      { status: 500 }
    );
  }
}
