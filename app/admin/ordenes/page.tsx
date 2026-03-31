'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  CalendarDays,
  StickyNote,
  Truck,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils-format';
import { toast } from 'sonner';

type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

type DeliveryMethod = 'PICKUP' | 'DELIVERY';

interface Order {
  id: string;
  status: OrderStatus | string;

  customerName: string;
  email: string | null;
  phone: string;

  deliveryMethod: DeliveryMethod;
  address: string | null;
  addressDetails?: string | null;
  city?: string | null;
  postalCode?: string | null;
  notes?: string | null;

  pickupDate: string | null;
  pickupTimeSlot: string | null;
  pickupNotes: string | null;

  subtotal: number;
  deliveryCost: number;
  total: number;

  createdAt: string;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    lineTotal?: number;
    product: {
      name: string;
      unitType: 'PER_KG' | 'PER_UNIT';
    };
  }[];
}

const statusColors: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-amber-500/20 text-amber-400',
  PENDING: 'bg-yellow-500/20 text-yellow-500',
  CONFIRMED: 'bg-cyan-500/20 text-cyan-500',
  PREPARING: 'bg-blue-500/20 text-blue-500',
  READY: 'bg-purple-500/20 text-purple-500',
  COMPLETED: 'bg-green-500/20 text-green-500',
  CANCELLED: 'bg-red-500/20 text-red-500',
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'En Preparación',
  READY: 'Listo',
  COMPLETED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const statusIcons: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  PENDING_PAYMENT: Clock,
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  PREPARING: Package,
  READY: CheckCircle,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
};

function formatPickupDate(dateString: string | null) {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getStatusUi(status: string) {
  const safeStatus = status as OrderStatus;

  return {
    label: statusLabels[safeStatus] ?? status,
    color:
      statusColors[safeStatus] ?? 'bg-zinc-500/20 text-zinc-300',
    Icon: statusIcons[safeStatus] ?? Clock,
  };
}

export default function OrdenesAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchOrders = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      params.set('includeUnconfirmed', 'true');

      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }

      const url = `/api/admin/orders?${params.toString()}`;

      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('fetchOrders not ok:', data);
        toast.error(data?.error ?? 'Error al cargar órdenes');
        setOrders([]);
        return;
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar órdenes');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('update status not ok:', data);
        throw new Error(data?.error ?? 'Error al actualizar estado');
      }

      toast.success('Estado actualizado');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar estado');
    }
  };

  const filteredOrders =
    filterStatus === 'all'
      ? orders
      : orders.filter((order) => order.status === filterStatus);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Órdenes</h1>
          <p className="mt-1 text-zinc-400">
            {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-56 border-zinc-800 bg-zinc-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-900">
            <SelectItem value="all">Todas las órdenes</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Pendientes de pago</SelectItem>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
            <SelectItem value="PREPARING">En Preparación</SelectItem>
            <SelectItem value="READY">Listas</SelectItem>
            <SelectItem value="COMPLETED">Entregadas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900 p-12 text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-zinc-600" />
          <h3 className="mb-2 text-xl font-semibold text-white">No hay órdenes</h3>
          <p className="text-zinc-400">
            {filterStatus === 'all'
              ? 'Aún no se han recibido órdenes'
              : `No hay órdenes con estado: ${
                  statusLabels[filterStatus as OrderStatus] ?? filterStatus
                }`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const { Icon: StatusIcon, color: statusColor, label: statusLabel } =
              getStatusUi(order.status);
            const pickupDateLabel = formatPickupDate(order.pickupDate);

            return (
              <Card key={order.id} className="border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        Orden #{order.id.slice(0, 8)}
                      </h3>

                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}
                      >
                        <StatusIcon className="h-4 w-4" />
                        {statusLabel}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-400">
                      {new Date(order.createdAt).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {formatPrice(order.total ?? 0)}
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-zinc-400">
                      <div className="flex items-center justify-end gap-2">
                        <span>Subtotal:</span>
                        <span>{formatPrice(order.subtotal ?? 0)}</span>
                      </div>

                      {Number(order.deliveryCost ?? 0) > 0 && (
                        <div className="flex items-center justify-end gap-2">
                          <span>Envío:</span>
                          <span>{formatPrice(order.deliveryCost ?? 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-6 border-b border-zinc-800 pb-4 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-zinc-400">
                      Información del Cliente
                    </h4>
                    <div className="space-y-1">
                      <p className="text-white">{order.customerName}</p>
                      <p className="text-sm text-zinc-400">{order.email ?? ''}</p>
                      <p className="text-sm text-zinc-400">{order.phone ?? ''}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-medium text-zinc-400">
                      Método de Entrega
                    </h4>

                    <p className="mb-1 flex items-center gap-2 text-white">
                      {order.deliveryMethod === 'DELIVERY' && (
                        <Truck className="h-4 w-4 text-zinc-400" />
                      )}
                      {order.deliveryMethod === 'DELIVERY'
                        ? 'Envío a domicilio'
                        : 'Retiro en local'}
                    </p>

                    {order.deliveryMethod === 'DELIVERY' && (
                      <div className="space-y-1 text-sm text-zinc-400">
                        {order.address && <p>{order.address}</p>}
                        {order.addressDetails && <p>{order.addressDetails}</p>}
                        {order.city && <p>{order.city}</p>}
                        {order.postalCode && <p>CP: {order.postalCode}</p>}
                        {order.notes && (
                          <p>
                            <span className="font-medium text-zinc-300">Notas:</span>{' '}
                            {order.notes}
                          </p>
                        )}
                      </div>
                    )}

                    {order.deliveryMethod === 'PICKUP' && (
                      <div className="mt-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                          <CalendarDays className="h-4 w-4 text-zinc-500" />
                          <span>
                            <span className="font-medium">Día:</span>{' '}
                            {pickupDateLabel ?? 'No definido'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                          <Clock className="h-4 w-4 text-zinc-500" />
                          <span>
                            <span className="font-medium">Horario:</span>{' '}
                            {order.pickupTimeSlot ?? 'No definido'}
                          </span>
                        </div>

                        {order.pickupNotes ? (
                          <div className="flex items-start gap-2 text-sm text-zinc-300">
                            <StickyNote className="mt-0.5 h-4 w-4 text-zinc-500" />
                            <span>
                              <span className="font-medium">Nota:</span>{' '}
                              {order.pickupNotes}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="mb-3 text-sm font-medium text-zinc-400">
                    Productos ({order.items.length})
                  </h4>

                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-white">
                          {item.product.name} x {item.quantity}
                          {item.product.unitType === 'PER_KG' ? 'kg' : ''}
                        </span>

                        <span className="text-zinc-400">
                          {formatPrice(
                            item.lineTotal ??
                              (item.unitPrice ?? 0) * (item.quantity ?? 0)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    value={order.status}
                    onValueChange={(value) =>
                      handleStatusChange(order.id, value as OrderStatus)
                    }
                  >
                    <SelectTrigger className="w-56 border-zinc-700 bg-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-800">
                      <SelectItem value="PENDING_PAYMENT">Pendiente de pago</SelectItem>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                      <SelectItem value="PREPARING">En Preparación</SelectItem>
                      <SelectItem value="READY">Listo</SelectItem>
                      <SelectItem value="COMPLETED">Entregado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}