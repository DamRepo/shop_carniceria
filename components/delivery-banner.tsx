"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";

const CUTOFF_HOUR = Number(process.env.NEXT_PUBLIC_DELIVERY_CUTOFF_HOUR ?? "18");
const OPEN_HOUR = Number(process.env.NEXT_PUBLIC_DELIVERY_OPEN_HOUR ?? "8");

export function DeliveryBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setVisible(hour >= OPEN_HOUR && hour < CUTOFF_HOUR);
  }, []);

  if (!visible) return null;

  return (
    <div className="w-full bg-green-600 text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-2">
      <Truck className="h-4 w-4 shrink-0" />
      <span>
        Pedí antes de las {CUTOFF_HOUR}hs y recibí hoy
      </span>
    </div>
  );
}
