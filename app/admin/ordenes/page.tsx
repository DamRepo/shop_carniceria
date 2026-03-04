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
import { Clock, CheckCircle, XCircle, Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils-format';
import { toast } from 'sonner';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
type DeliveryMethod = 'PICKUP' | 'DELIVERY';

interface Order {
  id: string;
  status: OrderStatus;

  customerName: string;
  email: string | null;
  phone: string;

  deliveryMethod: DeliveryMethod;
  address: string | null;

  subtotal: number;
  deliveryCost: number;
  total: number;

  createdAt: string; // JSON ISO
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    product: {
      name: string;
      unitType: 'PER_KG' | 'PER_UNIT';
    };
  }[];
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-500',
  CONFIRMED: 'bg-cyan-500/20 text-cyan-500',
  PREPARING: 'bg-blue-500/20 text-blue-500',
  READY: 'bg-purple-500/20 text-purple-500',
  COMPLETED: 'bg-green-500/20 text-green-500',
  CANCELLED: 'bg-red-500/20 text-red-500',
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'En Preparación',
  READY: 'Listo',
  COMPLETED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const statusIcons: Record<OrderStatus, any> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  PREPARING: Package,
  READY: CheckCircle,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
};

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

      // ✅ IMPORTANTE: mientras estés en desarrollo/operación del local,
      // querés ver también las NO confirmadas (PENDING sin pago).
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Órdenes</h1>
          <p className="text-zinc-400 mt-1">
            {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-56 bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">Todas las órdenes</SelectItem>
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
        <Card className="bg-zinc-900 border-zinc-800 p-12 text-center">
          <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No hay órdenes</h3>
          <p className="text-zinc-400">
            {filterStatus === 'all'
              ? 'Aún no se han recibido órdenes'
              : `No hay órdenes con estado: ${statusLabels[filterStatus as OrderStatus]}`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = statusIcons[order.status];

            return (
              <Card key={order.id} className="bg-zinc-900 border-zinc-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        Orden #{order.id.slice(0, 8)}
                      </h3>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusColors[order.status]}`}
                      >
                        <StatusIcon className="w-4 h-4" />
                        {statusLabels[order.status]}
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 pb-4 border-b border-zinc-800">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">
                      Información del Cliente
                    </h4>
                    <div className="space-y-1">
                      <p className="text-white">{order.customerName}</p>
                      <p className="text-sm text-zinc-400">{order.email ?? ''}</p>
                      <p className="text-sm text-zinc-400">{order.phone ?? ''}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">
                      Método de Entrega
                    </h4>
                    <p className="text-white mb-1">
                      {order.deliveryMethod === 'DELIVERY'
                        ? 'Envío a domicilio'
                        : 'Retiro en local'}
                    </p>
                    {order.deliveryMethod === 'DELIVERY' && order.address && (
                      <p className="text-sm text-zinc-400">{order.address}</p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">
                    Productos ({order.items.length})
                  </h4>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-white">
                          {item.product.name} x {item.quantity}
                          {item.product.unitType === 'PER_KG' ? 'kg' : ''}
                        </span>
                        <span className="text-zinc-400">
                          {formatPrice((item.unitPrice ?? 0) * (item.quantity ?? 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusChange(order.id, value as OrderStatus)}
                  >
                    <SelectTrigger className="w-56 bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
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
