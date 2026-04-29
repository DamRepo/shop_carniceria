"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

type TransferStatus = "AWAITING_PROOF" | "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";

interface TransferOrder {
  id: string;
  orderNumber: string;
  transferCode: string | null;
  transferStatus: TransferStatus | null;
  transferProofUrl: string | null;
  transferProofMimeType: string | null;
  transferConfirmedAt: string | null;
  transferRejectedAt: string | null;
  transferRejectNote: string | null;
  customerName: string;
  phone: string;
  email: string | null;
  deliveryMethod: "PICKUP" | "DELIVERY";
  address: string | null;
  pickupDate: string | null;
  pickupTimeSlot: string | null;
  total: number;
  createdAt: string;
  items: {
    quantity: number;
    lineTotal: number;
    product: { name: string; unitType: string };
  }[];
}

const STATUS_LABELS: Record<TransferStatus, string> = {
  AWAITING_PROOF: "Sin comprobante",
  PENDING_REVIEW: "Pendiente revisión",
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
};

const STATUS_COLORS: Record<TransferStatus, string> = {
  AWAITING_PROOF: "bg-yellow-500/20 text-yellow-600",
  PENDING_REVIEW: "bg-blue-500/20 text-blue-600",
  CONFIRMED: "bg-green-500/20 text-green-600",
  REJECTED: "bg-red-500/20 text-red-600",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatQty(qty: number, unitType: string) {
  return unitType === "PER_KG" ? `${qty} kg` : `${qty} un`;
}

export default function PagosPendientesPage() {
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    orderId: string;
    code: string;
  }>({ open: false, orderId: "", code: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/admin/transfers?status=all"
          : "/api/admin/transfers";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error cargando transferencias");
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirm = async (orderId: string) => {
    setActionLoading(orderId + "_confirm");
    try {
      const res = await fetch(`/api/admin/transfers/${orderId}/confirm`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        alert(d?.error ?? "Error confirmando pago");
        return;
      }
      await fetchOrders();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.orderId) return;
    setActionLoading(rejectDialog.orderId + "_reject");
    try {
      const res = await fetch(
        `/api/admin/transfers/${rejectDialog.orderId}/reject`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: rejectReason || "No se pudo verificar la transferencia.",
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        alert(d?.error ?? "Error rechazando pago");
        return;
      }
      setRejectDialog({ open: false, orderId: "", code: "" });
      setRejectReason("");
      await fetchOrders();
    } finally {
      setActionLoading(null);
    }
  };

  // For "all" filter, fetch all statuses
  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter(
          (o) =>
            o.transferStatus === "AWAITING_PROOF" ||
            o.transferStatus === "PENDING_REVIEW"
        );

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transferencias bancarias</h1>
          <p className="text-sm text-muted-foreground">
            Revisá y confirmá los pagos pendientes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        <Button
          size="sm"
          variant={statusFilter === "pending" ? "default" : "outline"}
          onClick={() => setStatusFilter("pending")}
        >
          Pendientes
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
        >
          Todos
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="rounded-3xl border-border/60">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="font-medium">No hay transferencias pendientes</p>
            <p className="text-sm text-muted-foreground">
              Cuando lleguen nuevos pagos por transferencia aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isConfirming = actionLoading === order.id + "_confirm";
            const isRejecting = actionLoading === order.id + "_reject";
            const isPending =
              order.transferStatus === "AWAITING_PROOF" ||
              order.transferStatus === "PENDING_REVIEW";

            return (
              <Card
                key={order.id}
                className="overflow-hidden rounded-3xl border-border/60 shadow-sm"
              >
                <CardHeader className="border-b bg-muted/30 pb-3 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-lg font-bold">
                        {order.transferCode ?? order.orderNumber}
                      </p>
                      {order.transferStatus && (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            STATUS_COLORS[order.transferStatus]
                          )}
                        >
                          {order.transferStatus === "AWAITING_PROOF" && (
                            <Clock className="mr-1 inline h-3 w-3" />
                          )}
                          {order.transferStatus === "PENDING_REVIEW" && (
                            <AlertCircle className="mr-1 inline h-3 w-3" />
                          )}
                          {order.transferStatus === "CONFIRMED" && (
                            <CheckCircle className="mr-1 inline h-3 w-3" />
                          )}
                          {order.transferStatus === "REJECTED" && (
                            <XCircle className="mr-1 inline h-3 w-3" />
                          )}
                          {STATUS_LABELS[order.transferStatus]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    {/* Cliente */}
                    <div className="rounded-xl border bg-background p-3">
                      <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Cliente
                      </p>
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">{order.phone}</p>
                      {order.email && (
                        <p className="text-sm text-muted-foreground">{order.email}</p>
                      )}
                    </div>

                    {/* Monto y entrega */}
                    <div className="flex gap-3">
                      <div className="flex-1 rounded-xl border bg-background p-3">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Monto
                        </p>
                        <p className="text-xl font-bold text-primary">
                          {formatPrice(order.total)}
                        </p>
                      </div>
                      <div className="flex-1 rounded-xl border bg-background p-3">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Entrega
                        </p>
                        <p className="text-sm font-medium">
                          {order.deliveryMethod === "PICKUP"
                            ? "Retiro en local"
                            : "Delivery"}
                        </p>
                        {order.deliveryMethod === "PICKUP" && order.pickupDate && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.pickupDate).toLocaleDateString(
                              "es-AR"
                            )}
                            {order.pickupTimeSlot && ` · ${order.pickupTimeSlot}`}
                          </p>
                        )}
                        {order.deliveryMethod === "DELIVERY" && order.address && (
                          <p className="text-xs text-muted-foreground">
                            {order.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Productos */}
                    <details className="rounded-xl border bg-background">
                      <summary className="cursor-pointer select-none p-3 text-sm font-medium">
                        {order.items.length} producto
                        {order.items.length !== 1 ? "s" : ""}
                      </summary>
                      <div className="border-t px-3 pb-3 pt-2">
                        <ul className="space-y-1">
                          {order.items.map((it, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground">
                                {it.product.name} ×{" "}
                                {formatQty(it.quantity, it.product.unitType)}
                              </span>
                              <span className="font-medium">
                                {formatPrice(it.lineTotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>

                    {/* Rechazo note */}
                    {order.transferStatus === "REJECTED" && order.transferRejectNote && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-900/20">
                        <p className="text-xs text-red-700 dark:text-red-400">
                          <strong>Motivo rechazo:</strong> {order.transferRejectNote}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-row flex-wrap items-start gap-2 md:flex-col md:justify-start">
                    {/* Confirmar / Rechazar — solo si está pendiente */}
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          className="rounded-xl bg-green-600 text-white hover:bg-green-700"
                          disabled={!!actionLoading}
                          onClick={() => handleConfirm(order.id)}
                        >
                          {isConfirming ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Confirmar pago
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          disabled={!!actionLoading}
                          onClick={() =>
                            setRejectDialog({
                              open: true,
                              orderId: order.id,
                              code: order.transferCode ?? order.orderNumber,
                            })
                          }
                        >
                          {isRejecting ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Rechazar */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(v) => !v && setRejectDialog({ open: false, orderId: "", code: "" })}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Rechazar pago</DialogTitle>
            <DialogDescription>
              Pedido <strong className="font-mono">{rejectDialog.code}</strong>.
              El cliente recibirá un email con el motivo.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Motivo del rechazo
            </label>
            <textarea
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Ej: El monto no coincide / no encontramos la transferencia"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                setRejectDialog({ open: false, orderId: "", code: "" })
              }
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
              disabled={!!actionLoading}
              onClick={handleReject}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Rechazar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
