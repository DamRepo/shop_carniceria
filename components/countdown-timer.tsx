'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endDate: Date | string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ endDate, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft | null => {
      const difference = +new Date(endDate) - +new Date();
      
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return null;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [endDate]);

  if (!mounted || !timeLeft) {
    return (
      <div className={`flex items-center gap-2 text-sm text-zinc-500 ${className}`}>
        <Clock className="h-4 w-4" />
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm font-semibold ${className}`}>
      <Clock className="h-4 w-4 text-primary" />
      <span className="text-primary">
        Finaliza en:{' '}
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
