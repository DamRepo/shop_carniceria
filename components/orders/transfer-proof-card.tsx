"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TransferStatus = "AWAITING_PROOF" | "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";

const STATUS_UI: Record<
  TransferStatus,
  {
    label: string;
    container: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClassName?: string;
    description?: string;
  }
> = {
  AWAITING_PROOF: {
    label: "En revisión",
    container:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-300",
    icon: Loader2,
    iconClassName: "animate-spin",
    description: "Estamos verificando tu transferencia.",
  },
  PENDING_REVIEW: {
    label: "En revisión",
    container:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-300",
    icon: Loader2,
    iconClassName: "animate-spin",
    description: "Estamos verificando tu transferencia.",
  },
  CONFIRMED: {
    label: "Pago confirmado",
    container:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-300",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Pago rechazado",
    container:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300",
    icon: XCircle,
  },
};

export function TransferProofCard({
  transferCode,
  transferStatus,
  transferRejectNote,
}: {
  orderId: string;
  transferCode: string | null;
  transferStatus: TransferStatus | null;
  transferProofUrl: string | null;
  transferRejectNote: string | null;
}) {
  if (!transferStatus) return null;

  const ui = STATUS_UI[transferStatus];
  const StatusIcon = ui.icon;

  return (
    <div className={cn("rounded-lg border p-3", ui.container)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-4 w-4", ui.iconClassName)} />
          <p className="text-sm font-semibold">Transferencia — {ui.label}</p>
        </div>
        {transferCode && (
          <span className="font-mono text-xs opacity-80">{transferCode}</span>
        )}
      </div>

      {ui.description && (
        <p className="mt-1 text-xs opacity-90">{ui.description}</p>
      )}

      {transferStatus === "REJECTED" && transferRejectNote && (
        <p className="mt-1 text-xs opacity-90">
          <strong>Motivo:</strong> {transferRejectNote}
        </p>
      )}
    </div>
  );
}
