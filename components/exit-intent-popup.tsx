"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle2, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "exit_intent_shown";
const MOBILE_IDLE_MS = 30_000;

const TRUST_ITEMS = [
  "Pago 100% seguro",
  "Productos frescos garantizados",
  "Retiro en local o envío a domicilio",
];

export function ExitIntentPopup() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const show = () => {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(true);
    };

    const isDesktop = window.matchMedia("(pointer: fine)").matches;

    if (isDesktop) {
      const onMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) show();
      };
      document.addEventListener("mouseleave", onMouseLeave);
      return () => document.removeEventListener("mouseleave", onMouseLeave);
    }

    // Mobile: disparar tras 30s sin interacción
    let timer = setTimeout(show, MOBILE_IDLE_MS);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(show, MOBILE_IDLE_MS);
    };

    const passiveEvents = ["touchstart", "scroll", "click"] as const;
    passiveEvents.forEach((ev) =>
      document.addEventListener(ev, resetTimer, { passive: true })
    );

    return () => {
      clearTimeout(timer);
      passiveEvents.forEach((ev) =>
        document.removeEventListener(ev, resetTimer)
      );
    };
  }, []);

  const hide = () => setVisible(false);

  const handleGoToOffers = () => {
    hide();
    router.push("/ofertas");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="exit-intent-root"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={hide}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-[#0D0D0D] p-6 shadow-2xl sm:p-8"
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <button
              onClick={hide}
              aria-label="Cerrar"
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600/20 px-3 py-1">
              <Tag className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-red-300">
                Solo por hoy
              </span>
            </div>

            <h2 className="mb-1 text-2xl font-bold sm:text-3xl">
              ¡Espera! Antes de irte...
            </h2>

            <p className="mb-5 text-muted-foreground">
              Tenemos ofertas especiales solo por hoy 🔥
            </p>

            <ul className="mb-6 space-y-2">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleGoToOffers}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                Ver ofertas ahora
              </Button>

              <Button
                onClick={hide}
                variant="ghost"
                size="lg"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                No gracias
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
