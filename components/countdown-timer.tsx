"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  endDate: string; // 🔒 en Next/RSC es mejor pasar SIEMPRE string ISO
}

type TimeLeft = { h: number; m: number; s: number } | null;

function parseEndDate(endDate: string): Date | null {
  const d = new Date(endDate);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function CountdownTimer({ endDate }: CountdownTimerProps) {
  const end = useMemo(() => parseEndDate(endDate), [endDate]);

  const calculateTimeLeft = (): TimeLeft => {
    if (!end) return null;

    const diff = end.getTime() - Date.now();
    if (diff <= 0) return null;

    const totalSeconds = Math.floor(diff / 1000);
    const h = Math.floor(totalSeconds / 3600); // horas totales restantes (no %24)
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return { h, m, s };
  };

  const [time, setTime] = useState<TimeLeft>(() => calculateTimeLeft());

  useEffect(() => {
    // recalcular apenas monta / cambia endDate
    setTime(calculateTimeLeft());

    const t = setInterval(() => {
      setTime(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(t);
    // ✅ depende de endDate parseado
  }, [endDate]); // o [end] si preferís

  // si la fecha es inválida o ya venció, no mostramos nada
  if (!time) return null;

  return (
    <motion.div
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        scale: [1, 1.03, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="
        w-full rounded-md px-3 py-2 text-white shadow-lg
        bg-[length:200%_200%]
        bg-gradient-to-r from-red-600 via-orange-500 to-red-600
        border border-red-700
      "
    >
      <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide">
        <Clock className="h-3 w-3" />
        Termina en
      </div>

      <div className="flex justify-center gap-1 text-lg font-extrabold tabular-nums leading-none">
        <span>{String(time.h).padStart(2, "0")}</span>:
        <span>{String(time.m).padStart(2, "0")}</span>:
        <span>{String(time.s).padStart(2, "0")}</span>
      </div>
    </motion.div>
  );
}
