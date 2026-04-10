"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  endDate: string;
}

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function parseEndDate(endDate: string): Date | null {
  const d = new Date(endDate);
  return Number.isFinite(d.getTime()) ? d : null;
}

function calculateTimeLeft(end: Date | null): TimeLeft {
  if (!end) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  const diff = end.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, expired: false };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function CountdownTimer({ endDate }: CountdownTimerProps) {
  const end = useMemo(() => parseEndDate(endDate), [endDate]);

  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    setMounted(true);
    setTime(calculateTimeLeft(end));
  }, [end]);

  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(() => setTime(calculateTimeLeft(end)), 1000);
    return () => clearInterval(t);
  }, [mounted, end]);

  if (!mounted) {
    return (
      <div className="w-full rounded-md px-3 py-2 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 border border-red-700">
        <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white">
          <Clock className="h-3 w-3" />
          Termina en
        </div>
        <div className="flex justify-center gap-1 text-lg font-extrabold tabular-nums leading-none text-white">
          --:--:--
        </div>
      </div>
    );
  }

  if (time.expired) {
    return (
      <div className="w-full rounded-md px-3 py-2 bg-zinc-800 border border-zinc-700">
        <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
          <Clock className="h-3 w-3" />
          Oferta finalizada
        </div>
      </div>
    );
  }

  const isLessThan24h = time.days === 0;
  const isLessThan1h = isLessThan24h && time.hours === 0;

  if (isLessThan1h) {
    return (
      <div
        className={[
          "w-full rounded-md px-3 py-2 border border-red-700 bg-red-700",
          "animate-pulse",
        ].join(" ")}
      >
        <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white">
          <Clock className="h-3 w-3" />
          Termina en
        </div>
        <div className="flex justify-center gap-1 text-lg font-extrabold tabular-nums leading-none text-white">
          {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
        </div>
      </div>
    );
  }

  if (isLessThan24h) {
    return (
      <div className="w-full rounded-md px-3 py-2 bg-red-600 border border-red-700">
        <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white">
          <Clock className="h-3 w-3" />
          Termina en
        </div>
        <div className="flex justify-center gap-1 text-lg font-extrabold tabular-nums leading-none text-white">
          {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
        </div>
      </div>
    );
  }

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
        {time.days > 0 && (
          <span>{time.days}d&nbsp;</span>
        )}
        <span>{pad(time.hours)}</span>:
        <span>{pad(time.minutes)}</span>:
        <span>{pad(time.seconds)}</span>
      </div>
    </motion.div>
  );
}
