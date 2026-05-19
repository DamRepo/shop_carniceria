"use client";

import { useEffect, useRef, useState } from "react";
import { X, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ComprariaOption = "Si" | "Tal vez" | "No";

const STORAGE_KEY = "feedback_submitted";
const MAX_COMMENT = 200;

const COMPRARIA_OPTIONS: ComprariaOption[] = ["Si", "Tal vez", "No"];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex gap-1" role="group" aria-label="Calificación con estrellas">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          aria-pressed={value === n}
          className="transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-[#0D0D0D] rounded"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        >
          <Star
            className={cn(
              "h-7 w-7 transition-colors",
              active > 0 && n <= active
                ? "fill-yellow-400 text-yellow-400"
                : "fill-zinc-700 text-zinc-600"
            )}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function OptionButton({ label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-[#0D0D0D]",
        selected
          ? "border-primary bg-primary/20 text-primary"
          : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
      )}
    >
      {label}
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FeedbackWidget() {
  const [showTab, setShowTab] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Cada wrapper contiene el botón trigger Y el card → el click en el botón
  // nunca cae "fuera" del contenedor, evitando el doble-toggle.
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Mostrar pestaña/FAB después de 20 s (solo si no fue enviado antes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setShowTab(true), 20_000);
    return () => clearTimeout(timer);
  }, []);

  // Cerrar al hacer click fuera del widget completo (botón + card)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = desktopRef.current?.contains(target) ?? false;
      const insideMobile = mobileRef.current?.contains(target) ?? false;
      if (!insideDesktop && !insideMobile) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSubmitSuccess = () => {
    setTimeout(() => {
      setIsOpen(false);
      setShowTab(false);
    }, 2500);
  };

  if (!showTab) return null;

  return (
    <>
      {/* ── Pestaña desktop (md+) ──────────────────────────────────────────── */}
      <div ref={desktopRef} className="hidden md:block">
        <button
          type="button"
          aria-label="Abrir formulario de opinión"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "fixed right-0 top-1/2 z-50 -translate-y-1/2",
            "flex items-center gap-1.5 bg-primary px-2 py-3 text-white shadow-lg",
            "rounded-l-xl transition-transform hover:-translate-x-0.5 active:translate-x-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          )}
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-wide">
            Tu opinión
          </span>
        </button>

        {/* Card desktop */}
        <div
          role="dialog"
          aria-label="Formulario de feedback"
          aria-modal="false"
          className={cn(
            "fixed right-12 top-1/2 z-50 w-80 -translate-y-1/2",
            "rounded-2xl border border-zinc-700 bg-[#0D0D0D] shadow-2xl",
            "transition-all duration-300 origin-right",
            isOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <FeedbackCard
            onClose={() => setIsOpen(false)}
            onSubmitSuccess={handleSubmitSuccess}
          />
        </div>
      </div>

      {/* ── FAB mobile (menos de md) ───────────────────────────────────────── */}
      <div ref={mobileRef} className="block md:hidden">
        <button
          type="button"
          aria-label="Abrir formulario de opinión"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "flex h-14 w-14 items-center justify-center",
            "rounded-full bg-primary text-white shadow-lg",
            "transition-transform hover:scale-110 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          )}
        >
          <MessageSquare className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Card mobile */}
        <div
          role="dialog"
          aria-label="Formulario de feedback"
          aria-modal="false"
          className={cn(
            "fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm",
            "rounded-2xl border border-zinc-700 bg-[#0D0D0D] shadow-2xl",
            "transition-all duration-300 origin-bottom-right",
            isOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <FeedbackCard
            onClose={() => setIsOpen(false)}
            onSubmitSuccess={handleSubmitSuccess}
          />
        </div>
      </div>
    </>
  );
}

// ─── Card interno (compartido entre desktop y mobile) ─────────────────────────

interface FeedbackCardProps {
  onClose: () => void;
  onSubmitSuccess: () => void;
}

function FeedbackCard({ onClose, onSubmitSuccess }: FeedbackCardProps) {
  const [estrellas, setEstrellas] = useState(0);
  const [encontro, setEncontro] = useState<boolean | null>(null);
  const [compraria, setCompraria] = useState<ComprariaOption | null>(null);
  const [comentario, setComentario] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSending(true);
    setError(null);

    const payload: Record<string, unknown> = {};
    if (estrellas > 0) payload.estrellas = estrellas;
    if (encontro !== null) payload.encontro = encontro;
    if (compraria !== null) payload.compraria = compraria;
    if (comentario.trim()) payload.comentario = comentario.trim();

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error del servidor");

      localStorage.setItem(STORAGE_KEY, "1");
      setSubmitted(true);
      onSubmitSuccess();
    } catch {
      setError("Hubo un error, intentá de nuevo");
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <span className="text-4xl" aria-hidden="true">
          🎉
        </span>
        <p className="text-base font-semibold text-white">
          ¡Gracias por tu opinión! 🙌
        </p>
        <p className="text-sm text-zinc-400">
          Tu feedback nos ayuda a mejorar.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Encabezado */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-snug text-white">
          ¿Qué te parece nuestra tienda?
        </h2>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Pregunta 1: Estrellas */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-zinc-400">
            ¿Cómo calificarías tu experiencia?
          </legend>
          <StarRating value={estrellas} onChange={setEstrellas} />
        </fieldset>

        {/* Pregunta 2: ¿Encontró lo que buscaba? */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-zinc-400">
            ¿Encontraste lo que buscabas?
          </legend>
          <div className="flex gap-2">
            <OptionButton
              label="Sí ✅"
              selected={encontro === true}
              onClick={() => setEncontro((prev) => (prev === true ? null : true))}
            />
            <OptionButton
              label="No ❌"
              selected={encontro === false}
              onClick={() => setEncontro((prev) => (prev === false ? null : false))}
            />
          </div>
        </fieldset>

        {/* Pregunta 3: ¿Compraría? */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-zinc-400">
            ¿Comprarías en nuestra tienda online?
          </legend>
          <div className="flex flex-wrap gap-2">
            {COMPRARIA_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={compraria === opt}
                onClick={() => setCompraria((prev) => (prev === opt ? null : opt))}
              />
            ))}
          </div>
        </fieldset>

        {/* Pregunta 4: Comentario */}
        <div>
          <label
            htmlFor="feedback-comentario"
            className="mb-2 block text-xs font-medium text-zinc-400"
          >
            ¿Qué podríamos mejorar?{" "}
            <span className="text-zinc-600">(opcional)</span>
          </label>
          <Textarea
            id="feedback-comentario"
            value={comentario}
            onChange={(e) => setComentario(e.target.value.slice(0, MAX_COMMENT))}
            placeholder="Tu sugerencia..."
            maxLength={MAX_COMMENT}
            rows={3}
            className="resize-none border-zinc-700 bg-zinc-900 text-sm text-white placeholder:text-zinc-600 focus-visible:ring-primary"
          />
          <p className="mt-1 text-right text-xs text-zinc-600">
            {comentario.length}/{MAX_COMMENT}
          </p>
        </div>

        {/* Botón enviar */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={sending}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? "Enviando..." : "Enviar opinión"}
        </Button>

        {error && (
          <p className="text-center text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
