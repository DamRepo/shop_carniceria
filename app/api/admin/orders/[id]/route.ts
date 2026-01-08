import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Estado es requerido' },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Error al actualizar orden' },
      { status: 500 }
    );
  }
}
