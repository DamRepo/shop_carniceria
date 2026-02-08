'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface CountdownTimerProps {
  endDate: Date | string;
}

export function CountdownTimer({ endDate }: CountdownTimerProps) {
  const calculateTimeLeft = () => {
    const diff = +new Date(endDate) - +new Date();
    if (diff <= 0) return null;

    return {
      h: Math.floor((diff / (1000 * 60 * 60)) % 24),
      m: Math.floor((diff / 1000 / 60) % 60),
      s: Math.floor((diff / 1000) % 60),
    };
  };

  const [time, setTime] = useState(calculateTimeLeft());

  useEffect(() => {
    const t = setInterval(() => setTime(calculateTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!time) return null;

  return (
    <motion.div
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        scale: [1, 1.03, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="
        w-full
        rounded-md
        px-3
        py-2
        text-white
        shadow-lg
        bg-[length:200%_200%]
        bg-gradient-to-r
        from-red-600
        via-orange-500
        to-red-600
        border border-red-700
      "
    >
      <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide">
        <Clock className="h-3 w-3" />
        Termina en
      </div>

      <div className="flex justify-center gap-1 text-lg font-extrabold tabular-nums leading-none">
        <span>{String(time.h).padStart(2, '0')}</span>:
        <span>{String(time.m).padStart(2, '0')}</span>:
        <span>{String(time.s).padStart(2, '0')}</span>
      </div>
    </motion.div>
  );
}
