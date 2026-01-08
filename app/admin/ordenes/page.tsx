'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface Order {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryMethod: string;
  deliveryAddress: string | null;
  totalAmount: number;
  createdAt: Date;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    product: {
      name: string;
      unitType: string;
    };
  }[];
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-500',
  PROCESSING: 'bg-blue-500/20 text-blue-500',
  READY: 'bg-purple-500/20 text-purple-500',
  DELIVERED: 'bg-green-500/20 text-green-500',
  CANCELLED: 'bg-red-500/20 text-red-500',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'En Preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const statusIcons: Record<string, any> = {
  PENDING: Clock,
  PROCESSING: Package,
  READY: CheckCircle,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
};

export default function OrdenesAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }

      toast.success('Estado actualizado');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(order => order.status === filterStatus);

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
          <h1 className="text-3xl font-bold">Órdenes</h1>
          <p className="text-zinc-400 mt-1">
            {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">Todas las órdenes</SelectItem>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="PROCESSING">En Preparación</SelectItem>
            <SelectItem value="READY">Listas</SelectItem>
            <SelectItem value="DELIVERED">Entregadas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800 p-12 text-center">
          <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No hay órdenes
          </h3>
          <p className="text-zinc-400">
            {filterStatus === 'all'
              ? 'Aún no se han recibido órdenes'
              : `No hay órdenes con estado: ${statusLabels[filterStatus]}`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = statusIcons[order.status];
            return (
              <Card
                key={order.id}
                className="bg-zinc-900 border-zinc-800 p-6"
              >
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
                      {formatPrice(order.totalAmount)}
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
                      <p className="text-sm text-zinc-400">{order.customerEmail}</p>
                      <p className="text-sm text-zinc-400">{order.customerPhone}</p>
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
                    {order.deliveryAddress && (
                      <p className="text-sm text-zinc-400">
                        {order.deliveryAddress}
                      </p>
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
                          {item.product.unitType === 'KILOGRAM' ? 'kg' : ''}
                        </span>
                        <span className="text-zinc-400">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusChange(order.id, value)}
                  >
                    <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="PROCESSING">En Preparación</SelectItem>
                      <SelectItem value="READY">Listo</SelectItem>
                      <SelectItem value="DELIVERED">Entregado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    Ver Detalles
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
