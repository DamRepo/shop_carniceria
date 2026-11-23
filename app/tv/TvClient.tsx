"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { TvCombo, TvData, TvOffer } from "@/lib/tv-data";
import { getOrderProcessingStatus, isStoreHoursShape, type ProcessingStatus } from "@/lib/business-hours";
import { formatPrice } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import styles from "./tv.module.css";

/* ─── Configuración del bucle ─────────────────────────────────────────────── */

const STAGE_W = 1920;
const STAGE_H = 1080;

const BRAND_SECONDS = 12;
const OFFER_PAGE_SECONDS = 12;
const COMBO_PAGE_SECONDS = 10;
const OFFERS_PER_PAGE = 3;

const FADE_MS = 700;
const REFRESH_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;
const VIDEO_LOAD_TIMEOUT_MS = 8_000;
// Margen sobre la duración del video por si se traba a mitad de camino.
const VIDEO_STALL_MARGIN_MS = 10_000;
const STATUS_REFRESH_MS = 30_000;

// Recarga completa cada ~3 h para que el navegador de la tele no acumule memoria.
const RELOAD_BASE_MS = 3 * 60 * 60 * 1000;
const RELOAD_JITTER_MS = 15 * 60 * 1000;
const RELOAD_RETRY_MS = 5 * 60 * 1000;

const SITE_HOST = "carniceriaelnegro.com";
const LOCALITY = "San José de Feliciano";
const LOGO_SRC = "/logo-el-negro.png";
const STORE_PHOTO_SRC = "/tv/local.jpg";
const QR_SRC = "/tv/qr.svg";

const PHASES = ["brand", "offers", "video-pedir", "combos", "video-talo", "qr"] as const;
type Phase = (typeof PHASES)[number];

const VIDEOS: Partial<Record<Phase, string>> = {
  "video-pedir": "/tv/videos/como-pedir.mp4",
  "video-talo": "/tv/videos/pago-talo.mp4",
};

type Step = { phase: Phase; page: number; n: number };

function pageCount(phase: Phase, data: TvData): number {
  if (phase === "offers") return Math.ceil(data.offers.length / OFFERS_PER_PAGE);
  if (phase === "combos") return data.combos.length;
  return 1;
}

/** Siguiente paso: otra página de la misma fase, o la próxima fase con contenido. */
function nextStep(step: Step, data: TvData): Step {
  if (step.page + 1 < pageCount(step.phase, data)) {
    return { phase: step.phase, page: step.page + 1, n: step.n + 1 };
  }
  const i = PHASES.indexOf(step.phase);
  for (let k = 1; k <= PHASES.length; k++) {
    const phase = PHASES[(i + k) % PHASES.length];
    if (pageCount(phase, data) > 0) return { phase, page: 0, n: step.n + 1 };
  }
  return { phase: "brand", page: 0, n: step.n + 1 };
}

function stepSeconds(step: Step, qrSeconds: number): number {
  if (step.phase === "brand") return BRAND_SECONDS;
  if (step.phase === "offers") return OFFER_PAGE_SECONDS;
  if (step.phase === "combos") return COMBO_PAGE_SECONDS;
  return qrSeconds;
}

const isVideo = (phase: Phase) => VIDEOS[phase] !== undefined;

/* ─── Validación de la respuesta de /api/tv/data ──────────────────────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPriced(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.price === "number" &&
    (value.oldPrice === null || typeof value.oldPrice === "number") &&
    (value.discountPercent === null || typeof value.discountPercent === "number")
  );
}

function isTvOffer(value: unknown): value is TvOffer {
  return isRecord(value) && isPriced(value) && (value.image === null || typeof value.image === "string");
}

function isTvCombo(value: unknown): value is TvCombo {
  if (!isRecord(value) || !isPriced(value)) return false;
  const images: unknown = value.images;
  return Array.isArray(images) && images.every((src: unknown) => typeof src === "string");
}

function isTvData(value: unknown): value is TvData {
  if (!isRecord(value)) return false;
  const offers: unknown = value.offers;
  const combos: unknown = value.combos;
  return (
    Array.isArray(offers) &&
    offers.every((o: unknown) => isTvOffer(o)) &&
    Array.isArray(combos) &&
    combos.every((c: unknown) => isTvCombo(c)) &&
    isStoreHoursShape(value.hours)
  );
}

/* ─── Componente principal ────────────────────────────────────────────────── */

type TvClientProps = {
  initialData: TvData;
  qrSeconds: number;
  speed: number;
  debug: boolean;
};

export function TvClient({ initialData, qrSeconds, speed, debug }: TvClientProps) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [data, setData] = useState<TvData>(initialData);
  const [step, setStep] = useState<Step>({ phase: "brand", page: 0, n: 0 });
  const [leaving, setLeaving] = useState<Step | null>(null);

  const dataRef = useRef(data);
  const stepRef = useRef(step);

  /** Avanza solo si `n` sigue siendo el paso actual (evita dobles avances de timers viejos). */
  const advanceFrom = useCallback((n: number) => {
    const current = stepRef.current;
    if (current.n !== n) return;
    const next = nextStep(current, dataRef.current);
    stepRef.current = next;
    setLeaving(current);
    setStep(next);
  }, []);

  // Escenario fijo de 1920x1080 escalado a la pantalla. Se renderiza recién en
  // el cliente: depende del tamaño de la ventana y de la hora.
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    setMounted(true);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Slides con duración fija (los videos avanzan solos al terminar).
  useEffect(() => {
    if (!mounted || isVideo(step.phase)) return;
    const ms = (stepSeconds(step, qrSeconds) * 1000) / speed;
    const timer = setTimeout(() => advanceFrom(step.n), ms);
    return () => clearTimeout(timer);
  }, [mounted, step, qrSeconds, speed, advanceFrom]);

  // Saca el slide anterior cuando termina el fundido.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  // Refresco de datos. Si falla, sigue con el último contenido.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch("/api/tv/data", { cache: "no-store", signal: controller.signal });
        if (!res.ok) return;
        const json: unknown = await res.json();
        if (alive && isTvData(json)) {
          dataRef.current = json;
          setData(json);
        }
      } catch {
        // Sin red o timeout: se queda con lo último que tenía.
      } finally {
        clearTimeout(timer);
      }
    };
    const interval = setInterval(refresh, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Si tras un refresco la página actual ya no existe (menos ofertas o combos), pasa a la siguiente.
  useEffect(() => {
    if (step.page >= pageCount(step.phase, data)) advanceFrom(step.n);
  }, [data, step, advanceFrom]);

  // Recarga periódica. Antes de recargar confirma que el servidor responde:
  // si no hay red, recargar dejaría la tele en una página de error.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tryReload = async () => {
      try {
        const res = await fetch(window.location.href, { method: "HEAD", cache: "no-store" });
        if (res.ok || res.status === 404) {
          window.location.reload();
          return;
        }
      } catch {
        // Sin conexión: se reintenta más tarde.
      }
      timer = setTimeout(tryReload, RELOAD_RETRY_MS);
    };
    timer = setTimeout(tryReload, RELOAD_BASE_MS + Math.random() * RELOAD_JITTER_MS);
    return () => clearTimeout(timer);
  }, []);

  const showMark = !isVideo(step.phase);
  const showCornerQr = step.phase === "brand" || step.phase === "offers" || step.phase === "combos";
  const layers = leaving ? [leaving, step] : [step];

  return (
    <div className="fixed inset-0 cursor-none overflow-hidden bg-black text-bone">
      {mounted && (
        <div
          className={cn("absolute left-1/2 top-1/2 overflow-hidden", styles.stage)}
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {layers.map((s) => (
            <SlideLayer key={s.n} active={s.n === step.n}>
              <SlideContent
                step={s}
                active={s.n === step.n}
                data={data}
                qrSeconds={qrSeconds}
                speed={speed}
                onDone={advanceFrom}
              />
            </SlideLayer>
          ))}

          <Mark visible={showMark} />
          <CornerQr visible={showCornerQr} />

          {!isVideo(step.phase) && (
            <div
              key={step.n}
              className={cn("absolute bottom-0 left-0 z-30 h-2 bg-blood", styles.progress)}
              style={{ animationDuration: `${(stepSeconds(step, qrSeconds) * 1000) / speed}ms` }}
            />
          )}

          {debug && (
            <div className="absolute left-2.5 top-2.5 z-50 bg-black/60 px-2.5 py-1.5 font-mono text-xl text-green-400">
              {step.phase} {step.page + 1}/{pageCount(step.phase, data)} · paso {step.n} · x{speed} ·{" "}
              {data.offers.length} ofertas · {data.combos.length} combos
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Capas y elementos fijos ─────────────────────────────────────────────── */

function SlideLayer({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    // Dos frames para que el navegador pinte la opacidad 0 antes del fundido.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [active]);

  return (
    <div className={cn("absolute inset-0", styles.slide)} style={{ opacity: shown ? 1 : 0 }}>
      {children}
    </div>
  );
}

function Mark({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[110px] top-[40px] z-20 flex items-center gap-[28px] transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* El PNG del header trae margen transparente: se compensa con la altura. */}
      <Image src={LOGO_SRC} alt="Carnicería El Negro" width={212} height={150} priority className="h-[150px] w-auto" />
      <span className="border-l-4 border-blood pl-[22px] text-[30px] font-medium text-bone/70">{LOCALITY}</span>
    </div>
  );
}

function CornerQr({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "absolute right-[44px] top-[44px] z-20 rounded-[22px] bg-white p-[14px] text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <Image src={QR_SRC} alt="" width={170} height={170} unoptimized priority />
      <div className="mt-1 font-display text-[32px] leading-none tracking-wide text-charcoal">Pedí online</div>
    </div>
  );
}

/* ─── Slides ──────────────────────────────────────────────────────────────── */

type SlideContentProps = {
  step: Step;
  active: boolean;
  data: TvData;
  qrSeconds: number;
  speed: number;
  onDone: (n: number) => void;
};

function SlideContent({ step, active, data, qrSeconds, speed, onDone }: SlideContentProps) {
  switch (step.phase) {
    case "brand":
      return <BrandSlide data={data} />;
    case "offers":
      return (
        <OffersSlide offers={data.offers.slice(step.page * OFFERS_PER_PAGE, (step.page + 1) * OFFERS_PER_PAGE)} />
      );
    case "combos": {
      const combo = data.combos[step.page];
      return combo ? <ComboSlide combo={combo} /> : null;
    }
    case "qr":
      return <QrSlide durationMs={(qrSeconds * 1000) / speed} speed={speed} />;
    case "video-pedir":
    case "video-talo": {
      const src = VIDEOS[step.phase];
      return src ? <VideoSlide src={src} active={active} speed={speed} onDone={() => onDone(step.n)} /> : null;
    }
  }
}

/** Retardo de la animación de entrada (`styles.rise`). */
const delay = (seconds: number) => ({ animationDelay: `${seconds}s` });

function BrandSlide({ data }: { data: TvData }) {
  const [status, setStatus] = useState<ProcessingStatus>(() => getOrderProcessingStatus(new Date(), data.hours));

  useEffect(() => {
    const update = () => setStatus(getOrderProcessingStatus(new Date(), data.hours));
    update();
    const interval = setInterval(update, STATUS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [data.hours]);

  const isOpen = status.kind === "open";
  // Mismos textos que el bloque de ubicación del home.
  const statusText = isOpen
    ? `Abierto ahora · Cierra a las ${status.closesAt}`
    : `Cerrado ahora · Abre ${status.opensAt}`;

  return (
    <>
      <div className={cn("absolute bottom-0 left-0 h-[641px] w-[1920px] overflow-hidden", styles.band)}>
        <Image
          src={STORE_PHOTO_SRC}
          alt=""
          fill
          priority
          sizes="1920px"
          className={cn("object-cover", styles.kenBurns)}
        />
      </div>

      {/* Textos del hero del home */}
      <div
        style={delay(0)}
        className={cn(
          "absolute left-[110px] top-[200px] z-10 text-[34px] font-semibold uppercase tracking-[0.2em] text-blood",
          styles.rise
        )}
      >
        Calidad local, como siempre
      </div>
      <h1
        style={delay(0.1)}
        className={cn(
          "absolute left-[110px] top-[255px] z-10 w-[1100px] font-display text-[160px] leading-[0.92] tracking-wide text-white",
          styles.rise
        )}
      >
        El mejor corte
        <br />
        en <span className="text-blood">tu mesa</span>
      </h1>
      <p
        style={delay(0.25)}
        className={cn(
          "absolute left-[110px] top-[575px] z-10 w-[860px] text-[46px] font-medium leading-[1.25] text-bone",
          styles.rise
        )}
      >
        Carnes frescas, embutidos artesanales y todo lo que necesitás, sin salir de casa.
      </p>
      <div
        style={delay(0.4)}
        className={cn(
          "absolute left-[110px] top-[830px] z-10 inline-flex items-center gap-[22px] text-[52px] font-semibold text-white",
          styles.rise
        )}
      >
        <span
          className={cn(
            "h-[28px] w-[28px] shrink-0 rounded-full",
            isOpen ? cn("bg-green-500", styles.dotOpen) : cn("bg-amber-400", styles.dotClosed)
          )}
        />
        {statusText}
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={delay(0)}
      className={cn(
        "absolute left-[110px] top-[215px] font-display text-[130px] leading-none tracking-wide text-white",
        styles.rise
      )}
    >
      {children}
    </h2>
  );
}

function SavingsPill({ cents, className }: { cents: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full bg-green-100 px-[26px] py-[8px] text-[34px] font-semibold text-green-800",
        className
      )}
    >
      Ahorrás {formatPrice(cents)}
    </span>
  );
}

const CARD_WIDTH_BY_COUNT: Record<number, number> = { 1: 820, 2: 825, 3: 533 };

function OffersSlide({ offers }: { offers: TvOffer[] }) {
  const width = CARD_WIDTH_BY_COUNT[offers.length] ?? 533;
  return (
    <>
      <SectionTitle>
        Ofertas <span className="text-blood">especiales</span>
      </SectionTitle>
      <div className="absolute left-[110px] top-[370px] flex gap-[50px]">
        {offers.map((offer, i) => (
          <OfferCard key={offer.id} offer={offer} width={width} delayS={0.15 + i * 0.15} />
        ))}
      </div>
    </>
  );
}

function OfferCard({ offer, width, delayS }: { offer: TvOffer; width: number; delayS: number }) {
  const narrow = width < 700;
  return (
    <div
      className={cn(
        "relative flex h-[640px] flex-col overflow-hidden rounded-[36px] border-4 border-white/10 bg-iron",
        styles.rise
      )}
      style={{ width, animationDelay: `${delayS}s` }}
    >
      <div className="relative h-[300px] w-full shrink-0 bg-charcoal">
        {offer.image ? (
          <Image src={offer.image} alt="" fill sizes={`${width}px`} className="object-cover" />
        ) : (
          <ImagePlaceholder />
        )}
        {offer.discountPercent !== null && (
          <div className="absolute left-[24px] top-[24px] rounded-2xl bg-blood px-[26px] py-[6px] font-display text-[64px] leading-tight text-white">
            -{offer.discountPercent}%
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-[34px] pb-[28px] pt-[22px]">
        <div className={cn("line-clamp-2 font-semibold leading-[1.1] text-white", narrow ? "text-[40px]" : "text-[48px]")}>
          {offer.name}
        </div>
        <div className="mt-auto">
          {offer.oldPrice !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[36px] text-smoke line-through">{formatPrice(offer.oldPrice)}</span>
              <SavingsPill cents={offer.oldPrice - offer.price} className={narrow ? "text-[28px]" : undefined} />
            </div>
          )}
          <div className={cn("font-display leading-none text-blood", narrow ? "text-[110px]" : "text-[130px]")}>
            {formatPrice(offer.price)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComboSlide({ combo }: { combo: TvCombo }) {
  const images = combo.images.slice(0, 2);
  return (
    <>
      <SectionTitle>
        Combos <span className="text-blood">para el finde</span>
      </SectionTitle>
      <div
        style={delay(0.15)}
        className={cn(
          "absolute left-[110px] top-[370px] flex h-[600px] w-[1700px] overflow-hidden rounded-[36px] border-4 border-white/10 bg-iron",
          styles.rise
        )}
      >
        <div className="flex w-[760px] shrink-0 bg-charcoal">
          {images.length > 0 ? (
            images.map((src) => (
              <div key={src} className="relative h-full flex-1">
                <Image src={src} alt="" fill sizes={`${760 / images.length}px`} className="object-cover" />
              </div>
            ))
          ) : (
            <ImagePlaceholder />
          )}
        </div>

        <div className="relative flex flex-1 flex-col px-[56px] py-[48px]">
          <div className="text-[36px] font-semibold uppercase tracking-[0.3em] text-smoke">Combo</div>
          <div className="mt-[10px] line-clamp-2 font-display text-[84px] leading-[0.95] tracking-wide text-white">
            {combo.name}
          </div>
          <div className="mt-auto">
            {combo.oldPrice !== null && (
              <div className="flex items-center gap-[28px]">
                <span className="text-[42px] text-smoke line-through">{formatPrice(combo.oldPrice)}</span>
                <SavingsPill cents={combo.oldPrice - combo.price} />
                {combo.discountPercent !== null && (
                  <span className="rounded-2xl bg-blood px-[22px] py-[4px] font-display text-[52px] leading-tight text-white">
                    -{combo.discountPercent}%
                  </span>
                )}
              </div>
            )}
            <div className="font-display text-[170px] leading-none text-blood">{formatPrice(combo.price)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Image src={LOGO_SRC} alt="" width={240} height={170} className="h-[170px] w-auto opacity-30" />
    </div>
  );
}

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function QrSlide({ durationMs, speed }: { durationMs: number; speed: number }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  // En tiempo "real" del bucle (con ?speed el reloj corre más rápido).
  const secondsLeft = Math.ceil(((durationMs - (now - startedAt)) * speed) / 1000);

  return (
    <>
      <h2
        style={delay(0)}
        className={cn(
          "absolute left-[110px] top-[250px] w-[960px] font-display text-[160px] leading-[0.95] tracking-wide text-white",
          styles.rise
        )}
      >
        Pedí desde
        <br />
        tu <span className="text-blood">celular</span>
      </h2>
      <div className="absolute left-[110px] top-[580px] h-[10px] w-[160px] bg-blood" />
      <p className="absolute left-[110px] top-[630px] w-[880px] text-[52px] font-medium leading-[1.25] text-bone/80">
        Escaneá el código con la cámara y hacé tu pedido online.
      </p>
      <div className="absolute left-[110px] top-[820px] font-display text-[80px] leading-none tracking-wide text-white">
        {SITE_HOST}
      </div>

      <div
        style={delay(0.1)}
        className={cn(
          "absolute right-[170px] top-[130px] rounded-[40px] bg-white p-[34px] text-center shadow-[0_30px_100px_rgba(0,0,0,0.55)]",
          styles.rise
        )}
      >
        <Image src={QR_SRC} alt="Código QR a carniceriaelnegro.com" width={640} height={640} unoptimized priority />
        <div className="mt-[16px] font-display text-[64px] leading-none tracking-wide text-charcoal">Escaneá y pedí</div>
      </div>

      <div className="absolute bottom-[90px] left-[110px] text-[36px] text-smoke">
        Volvemos con las ofertas en {formatCountdown(secondsLeft)}
      </div>
    </>
  );
}

function VideoSlide({
  src,
  active,
  speed,
  onDone,
}: {
  src: string;
  active: boolean;
  speed: number;
  onDone: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) return;

    let finished = false;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const rate = speed > 1 ? Math.min(speed, 16) : 1;

    const done = () => {
      if (finished) return;
      finished = true;
      onDoneRef.current();
    };

    // Si en 8 s no cargó, se saltea.
    const loadTimer = setTimeout(() => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) done();
    }, VIDEO_LOAD_TIMEOUT_MS);

    const onMetadata = () => {
      if (!Number.isFinite(video.duration)) return;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(done, (video.duration * 1000) / rate + VIDEO_STALL_MARGIN_MS);
    };
    const onTime = () => {
      if (barRef.current && video.duration > 0) {
        barRef.current.style.width = `${(video.currentTime / video.duration) * 100}%`;
      }
    };

    video.addEventListener("ended", done);
    video.addEventListener("error", done);
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("timeupdate", onTime);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onMetadata();

    video.currentTime = 0;
    video.playbackRate = rate;
    video.play().catch(done);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(stallTimer);
      video.removeEventListener("ended", done);
      video.removeEventListener("error", done);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [active, speed]);

  return (
    <div className="absolute inset-0 bg-black">
      <video ref={videoRef} src={src} muted playsInline preload="auto" className="h-full w-full object-contain" />
      <div ref={barRef} className="absolute bottom-0 left-0 h-2 w-0 bg-blood" />
    </div>
  );
}
