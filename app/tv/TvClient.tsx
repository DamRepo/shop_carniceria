"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { TvCombo, TvData, TvProduct } from "@/lib/tv-data";
import { getOrderProcessingStatus, isStoreHoursShape, type ProcessingStatus } from "@/lib/business-hours";
import { formatPrice } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import styles from "./tv.module.css";

/* ─── Configuración del bucle ─────────────────────────────────────────────── */

const STAGE_W = 1920;
const STAGE_H = 1080;
// Margen de seguridad (~4%) por el overscan de muchas teles: el contenido
// importante (logo, QR, textos, precios) queda dentro de x 77–1843 / y 43–1037.
// Los textos arrancan en x 110 y lo de la derecha termina en x 1824 (right 96).

/**
 * TODOS los tiempos de la pantalla, en un solo lugar para ajustarlos fácil.
 * ?t= los multiplica (slides, entradas, salidas, escalonado y zoom de fotos) para
 * ajustarlos en la tele sin tocar código: en producción solo 1 a 3 (enlentecer).
 *
 * Regla de lectura: el texto de cada producto termina de entrar a los
 * 4 × staggerMs + enterMs = 2,8 s y queda quieto hasta que empieza la salida
 * (14 s − 0,9 s): ~10,3 s completamente visible, más que los 8 s mínimos.
 */
const TIMING = {
  /** Slide de marca (foto del local + horario). */
  brandSeconds: 12,
  /** Cada producto en spotlight: ofertas, destacados y combos. */
  spotlightSeconds: 14,
  /** Grilla de resumen al final de las ofertas. */
  summarySeconds: 16,
  /** Entrada de cada elemento (foto, textos, precio), con easing suave. */
  enterMs: 1800,
  /** Pausa entre la entrada de un elemento y el siguiente. */
  staggerMs: 250,
  /** Salida del slide anterior (fundido). */
  exitMs: 900,
  /** Zoom lento de las fotos (más largo que el slide, así nunca se "frena"). */
  photoZoomMs: 18_000,
  /** Red de seguridad de la escala: cada cuánto se vuelve a medir la ventana. */
  scaleCheckMs: 500,
  /** Cartel "Presioná OK para pantalla completa". */
  fullscreenHintMs: 15_000,
  /** Refresco de datos desde /api/tv/data y su timeout. */
  refreshMs: 60_000,
  fetchTimeoutMs: 10_000,
  /** Abierto/cerrado del slide de marca. */
  statusRefreshMs: 30_000,
  /** Un video que no cargó en este tiempo se saltea. */
  videoLoadTimeoutMs: 8_000,
  /** Margen sobre la duración del video por si se traba a mitad de camino. */
  videoStallMarginMs: 10_000,
  /** Recarga completa cada ~3 h (+ hasta 15 min al azar) para no acumular memoria. */
  reloadBaseMs: 3 * 60 * 60 * 1000,
  reloadJitterMs: 15 * 60 * 1000,
  reloadRetryMs: 5 * 60 * 1000,
} as const;

const OFFERS_PER_LAP = 8;
const FEATURED_PER_LAP = 8;
const COMBOS_PER_LAP = 5;
const SUMMARY_MAX = 6;

const SITE_HOST = "carniceriaelnegro.com";
const LOCALITY = "San José de Feliciano";
const LOGO_SRC = "/logo-el-negro.png";
const STORE_PHOTO_SRC = "/tv/local.jpg";
const QR_SRC = "/tv/qr.svg";

// Todas las fotos de producto se piden con el mismo `sizes`: así la precarga,
// el spotlight y la grilla comparten la misma URL optimizada (y la caché).
const PRODUCT_IMAGE_SIZES = "820px";

const PHASES = ["brand", "offers", "video-pedir", "featured", "combos", "video-talo", "qr"] as const;
type Phase = (typeof PHASES)[number];

const VIDEOS: Partial<Record<Phase, string>> = {
  "video-pedir": "/tv/videos/como-pedir.mp4",
  "video-talo": "/tv/videos/pago-talo.mp4",
};

/** `lap` cuenta las vueltas completas: cambia qué productos salen y en qué orden. */
type Step = { phase: Phase; page: number; n: number; lap: number };

/** Lo que muestra un spotlight: producto o combo. */
type SpotlightItem = {
  id: string;
  name: string;
  images: string[];
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
};

const fromProduct = (p: TvProduct): SpotlightItem => ({ ...p, images: p.image ? [p.image] : [] });
const fromCombo = (c: TvCombo): SpotlightItem => c;

/**
 * Hasta `perLap` elementos, arrancando en un punto distinto en cada vuelta para
 * que no salgan siempre los mismos primero. Con el tiempo pasan todos.
 */
function pickForLap<T>(items: T[], lap: number, perLap: number): T[] {
  const count = Math.min(perLap, items.length);
  if (count === 0) return [];
  const start = (lap * perLap) % items.length;
  return Array.from({ length: count }, (_, i) => items[(start + i) % items.length]);
}

const lapOffers = (data: TvData, lap: number) => pickForLap(data.offers, lap, OFFERS_PER_LAP).map(fromProduct);
const lapFeatured = (data: TvData, lap: number) =>
  pickForLap(data.featured, lap, FEATURED_PER_LAP).map(fromProduct);
const lapCombos = (data: TvData, lap: number) => pickForLap(data.combos, lap, COMBOS_PER_LAP).map(fromCombo);

/** El resumen en grilla va al final de las ofertas cuando hay más de una. */
const hasOffersSummary = (data: TvData) => data.offers.length > 1;

function pageCount(phase: Phase, data: TvData, lap: number): number {
  if (phase === "offers") return lapOffers(data, lap).length + (hasOffersSummary(data) ? 1 : 0);
  if (phase === "featured") return lapFeatured(data, lap).length;
  if (phase === "combos") return lapCombos(data, lap).length;
  return 1;
}

/** Siguiente paso: otra página de la misma fase, o la próxima fase con contenido. */
function nextStep(step: Step, data: TvData): Step {
  if (step.page + 1 < pageCount(step.phase, data, step.lap)) {
    return { ...step, page: step.page + 1, n: step.n + 1 };
  }
  const i = PHASES.indexOf(step.phase);
  for (let k = 1; k <= PHASES.length; k++) {
    const idx = (i + k) % PHASES.length;
    const lap = i + k >= PHASES.length ? step.lap + 1 : step.lap;
    const phase = PHASES[idx];
    if (pageCount(phase, data, lap) > 0) return { phase, page: 0, n: step.n + 1, lap };
  }
  return { phase: "brand", page: 0, n: step.n + 1, lap: step.lap + 1 };
}

/** Spotlight (producto o combo) que muestra un paso, si es uno. */
function spotlightFor(step: Step, data: TvData): SpotlightItem | null {
  if (step.phase === "offers") return lapOffers(data, step.lap)[step.page] ?? null;
  if (step.phase === "featured") return lapFeatured(data, step.lap)[step.page] ?? null;
  if (step.phase === "combos") return lapCombos(data, step.lap)[step.page] ?? null;
  return null;
}

const isOffersSummary = (step: Step, data: TvData) =>
  step.phase === "offers" && step.page === lapOffers(data, step.lap).length;

function stepSeconds(step: Step, data: TvData, qrSeconds: number): number {
  if (step.phase === "brand") return TIMING.brandSeconds;
  if (step.phase === "offers") return isOffersSummary(step, data) ? TIMING.summarySeconds : TIMING.spotlightSeconds;
  if (step.phase === "featured" || step.phase === "combos") return TIMING.spotlightSeconds;
  return qrSeconds;
}

/** Duración real del paso en ms. ?t= multiplica todo salvo la pausa del QR, que ya viene en segundos de ?qr=. */
function stepMs(step: Step, data: TvData, qrSeconds: number, timeScale: number): number {
  const seconds = stepSeconds(step, data, qrSeconds);
  return step.phase === "qr" ? seconds * 1000 : seconds * 1000 * timeScale;
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

function isTvProduct(value: unknown): value is TvProduct {
  return isRecord(value) && isPriced(value) && (value.image === null || typeof value.image === "string");
}

function isTvCombo(value: unknown): value is TvCombo {
  if (!isRecord(value) || !isPriced(value)) return false;
  const images: unknown = value.images;
  return Array.isArray(images) && images.every((src: unknown) => typeof src === "string");
}

function isProductList(value: unknown): value is TvProduct[] {
  return Array.isArray(value) && value.every((p: unknown) => isTvProduct(p));
}

function isTvData(value: unknown): value is TvData {
  if (!isRecord(value)) return false;
  const combos: unknown = value.combos;
  return (
    isProductList(value.offers) &&
    isProductList(value.featured) &&
    Array.isArray(combos) &&
    combos.every((c: unknown) => isTvCombo(c)) &&
    isStoreHoursShape(value.hours)
  );
}

/* ─── Medidas de la ventana ───────────────────────────────────────────────── */

/**
 * Escala que corresponde a la ventana actual, sin topes. Usa el área visible del
 * documento (clientWidth/clientHeight, igual a innerWidth/innerHeight sin barras de
 * scroll). null si el navegador todavía informa 0 (prerender, pestaña oculta).
 */
function measureScale(): number | null {
  const root = document.documentElement;
  const width = root.clientWidth || window.innerWidth;
  const height = root.clientHeight || window.innerHeight;
  if (!(width > 0 && height > 0)) return null;
  return Math.min(width / STAGE_W, height / STAGE_H);
}

type ViewportMetrics = {
  innerWidth: number;
  innerHeight: number;
  clientWidth: number;
  clientHeight: number;
  visualWidth: number | null;
  visualHeight: number | null;
  dpr: number;
  computed: number | null;
  applied: number | null;
  stageWidth: number;
  stageHeight: number;
  stageLeft: number;
  stageTop: number;
};

function readViewportMetrics(stage: HTMLDivElement | null): ViewportMetrics {
  const root = document.documentElement;
  const rect = stage?.getBoundingClientRect();
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: root.clientWidth,
    clientHeight: root.clientHeight,
    visualWidth: window.visualViewport ? round(window.visualViewport.width) : null,
    visualHeight: window.visualViewport ? round(window.visualViewport.height) : null,
    dpr: window.devicePixelRatio,
    computed: measureScale(),
    applied: rect ? rect.width / STAGE_W : null,
    stageWidth: rect ? Math.round(rect.width) : 0,
    stageHeight: rect ? Math.round(rect.height) : 0,
    stageLeft: rect ? Math.round(rect.left) : 0,
    stageTop: rect ? Math.round(rect.top) : 0,
  };
}

/* ─── Componente principal ────────────────────────────────────────────────── */

type TvClientProps = {
  initialData: TvData;
  qrSeconds: number;
  /** Multiplicador de todos los tiempos (?t=). 1 = velocidad normal. */
  timeScale: number;
  debug: boolean;
  /** Pide pantalla completa con el primer click o tecla (?fs=0 lo apaga). */
  fullscreen: boolean;
  /** Datos de ejemplo (?mock=1, solo desarrollo): no se refrescan desde la API. */
  mock: boolean;
};

export function TvClient({ initialData, qrSeconds, timeScale, debug, fullscreen, mock }: TvClientProps) {
  const [mounted, setMounted] = useState(false);
  // null = todavía no se pudo medir la ventana (ver measureScale).
  const [scale, setScale] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<ViewportMetrics | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<TvData>(initialData);
  const [step, setStep] = useState<Step>({ phase: "brand", page: 0, n: 0, lap: 0 });
  const [leaving, setLeaving] = useState<Step | null>(null);
  const [fsHint, setFsHint] = useState(fullscreen);

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

  // Escenario fijo de 1920x1080 escalado para que entre entero (por ancho Y por
  // alto) y centrado, sin topes: Math.min(ancho / 1920, alto / 1080).
  //
  // Antes la escala arrancaba en 1 y solo se actualizaba si la ventana medía más
  // de 0. Si Chrome informa 0x0 al montar (página prerenderizada al escribir la
  // URL, pestaña en segundo plano) y después no llega ningún "resize", quedaba
  // en 1 para siempre: el escenario de 1920x1080 sin achicar. Ahora:
  //  - sin medida válida no se aplica ninguna escala de JS (rige la de CSS, ver
  //    .stageFallback en tv.module.css);
  //  - además de los eventos, un intervalo compara la escala que corresponde con
  //    la que tiene aplicada de verdad el escenario y la corrige si difieren.
  const fit = useCallback(() => {
    const next = measureScale();
    if (next === null) return;
    const stage = stageRef.current;
    const applied = stage ? stage.getBoundingClientRect().width / STAGE_W : null;
    if (applied === null || Math.abs(applied - next) > 0.001) setScale(next);
    else setScale((current) => (current === null || Math.abs(current - next) > 0.001 ? next : current));
  }, []);

  useEffect(() => {
    fit();
    setMounted(true);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => fit()) : null;
    observer?.observe(document.documentElement);
    const onWindow = () => fit();
    window.addEventListener("resize", onWindow);
    window.addEventListener("orientationchange", onWindow);
    window.addEventListener("pageshow", onWindow);
    document.addEventListener("fullscreenchange", onWindow);
    document.addEventListener("visibilitychange", onWindow);
    document.addEventListener("prerenderingchange", onWindow);
    window.visualViewport?.addEventListener("resize", onWindow);
    const interval = setInterval(fit, TIMING.scaleCheckMs);
    return () => {
      observer?.disconnect();
      clearInterval(interval);
      window.removeEventListener("resize", onWindow);
      window.removeEventListener("orientationchange", onWindow);
      window.removeEventListener("pageshow", onWindow);
      document.removeEventListener("fullscreenchange", onWindow);
      document.removeEventListener("visibilitychange", onWindow);
      document.removeEventListener("prerenderingchange", onWindow);
      window.visualViewport?.removeEventListener("resize", onWindow);
    };
  }, [fit]);

  // Red de seguridad extra: también se recalcula en cada cambio de slide.
  useEffect(() => {
    fit();
  }, [step.n, fit]);

  // ?debug: medidas reales de la ventana, para diagnosticar la escala en la tele.
  useEffect(() => {
    if (!debug) return;
    const update = () => setMetrics(readViewportMetrics(stageRef.current));
    update();
    const interval = setInterval(update, TIMING.scaleCheckMs);
    return () => clearInterval(interval);
  }, [debug]);

  // Pantalla completa: el navegador solo la permite tras un gesto del usuario,
  // así que se pide con el primer click, tecla o botón OK del control remoto.
  useEffect(() => {
    if (!fullscreen) return;
    const root = document.documentElement;
    const request = () => {
      if (document.fullscreenElement || typeof root.requestFullscreen !== "function") return;
      root.requestFullscreen().catch(() => {
        // Sin permiso (o no soportado): la pantalla sigue igual.
      });
    };
    const onChange = () => {
      if (document.fullscreenElement) setFsHint(false);
    };
    const hintTimer = setTimeout(() => setFsHint(false), TIMING.fullscreenHintMs);
    window.addEventListener("keydown", request);
    window.addEventListener("pointerdown", request);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      clearTimeout(hintTimer);
      window.removeEventListener("keydown", request);
      window.removeEventListener("pointerdown", request);
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, [fullscreen]);

  // Slides con duración fija (los videos avanzan solos al terminar).
  useEffect(() => {
    if (!mounted || isVideo(step.phase)) return;
    const ms = stepMs(step, dataRef.current, qrSeconds, timeScale);
    const timer = setTimeout(() => advanceFrom(step.n), ms);
    return () => clearTimeout(timer);
  }, [mounted, step, qrSeconds, timeScale, advanceFrom]);

  // Saca el slide anterior cuando termina el fundido.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), TIMING.exitMs * timeScale);
    return () => clearTimeout(timer);
  }, [leaving, timeScale]);

  // Refresco de datos. Si falla, sigue con el último contenido.
  useEffect(() => {
    if (mock) return;
    let alive = true;
    const refresh = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMING.fetchTimeoutMs);
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
    const interval = setInterval(refresh, TIMING.refreshMs);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [mock]);

  // Si tras un refresco la página actual ya no existe (menos productos), pasa a la siguiente.
  useEffect(() => {
    if (step.page >= pageCount(step.phase, data, step.lap)) advanceFrom(step.n);
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
      timer = setTimeout(tryReload, TIMING.reloadRetryMs);
    };
    timer = setTimeout(tryReload, TIMING.reloadBaseMs + Math.random() * TIMING.reloadJitterMs);
    return () => clearTimeout(timer);
  }, []);

  // Duraciones que usa tv.module.css (las animaciones leen estas variables).
  const animationVars = {
    "--tv-enter": `${TIMING.enterMs * timeScale}ms`,
    "--tv-exit": `${TIMING.exitMs * timeScale}ms`,
    "--tv-stagger": `${TIMING.staggerMs * timeScale}ms`,
    "--tv-photo-zoom": `${TIMING.photoZoomMs * timeScale}ms`,
  } as React.CSSProperties;

  const showMark = !isVideo(step.phase);
  const showCornerQr = !isVideo(step.phase) && step.phase !== "qr";
  const layers = leaving ? [leaving, step] : [step];
  // Fotos del próximo spotlight, para que ya estén cargadas cuando entre.
  const upcoming = spotlightFor(nextStep(step, data), data);

  return (
    // El fondo (color y degradé) va en el contenedor que ocupa todo el viewport:
    // si la pantalla no es 16:9, las franjas sobrantes se funden con el fondo.
    <div className={cn("fixed inset-0 cursor-none overflow-hidden text-bone", styles.backdrop)} style={animationVars}>
      {mounted && (
        <div
          ref={stageRef}
          data-tv-stage=""
          // Sin escala medida todavía, la calcula el CSS (.stageFallback); nunca queda a 1:1.
          className={cn("absolute left-1/2 top-1/2 overflow-hidden", scale === null && styles.stageFallback)}
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transformOrigin: "50% 50%",
            ...(scale !== null && { transform: `translate(-50%, -50%) scale(${scale})` }),
          }}
        >
          {layers.map((s) => (
            <SlideLayer key={s.n} active={s.n === step.n}>
              <SlideContent
                step={s}
                active={s.n === step.n}
                data={data}
                qrSeconds={qrSeconds}
                onDone={advanceFrom}
              />
            </SlideLayer>
          ))}

          <Mark visible={showMark} />
          <CornerQr visible={showCornerQr} />

          {upcoming && upcoming.images.length > 0 && <Preload images={upcoming.images} />}

          {fsHint && (
            <div className="absolute bottom-[70px] left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/75 px-[34px] py-[14px] text-[30px] font-medium text-bone">
              Presioná OK para pantalla completa
            </div>
          )}

        </div>
      )}

      {/* ?debug va fuera del escenario (no se achica con la escala) para leerlo en la tele. */}
      {debug && mounted && (
        <div className="absolute left-2 top-2 z-50 bg-black/75 px-3 py-2 font-mono text-[13px] leading-snug text-green-400">
          {step.phase} {step.page + 1}/{pageCount(step.phase, data, step.lap)} · vuelta {step.lap} · paso {step.n} · t ×
          {timeScale} · {data.offers.length} ofertas · {data.featured.length} destacados · {data.combos.length} combos
          {mock ? " · MOCK" : ""} · escala {scale === null ? "CSS (sin medir)" : scale.toFixed(3)}
          {metrics && (
            <>
              <br />
              innerWidth×innerHeight {metrics.innerWidth}×{metrics.innerHeight} · clientWidth×clientHeight{" "}
              {metrics.clientWidth}×{metrics.clientHeight} · visualViewport {metrics.visualWidth}×
              {metrics.visualHeight} · devicePixelRatio {metrics.dpr}
              <br />
              escala calculada {metrics.computed === null ? "—" : metrics.computed.toFixed(4)} · aplicada{" "}
              {metrics.applied === null ? "—" : metrics.applied.toFixed(4)} · escenario {metrics.stageWidth}×
              {metrics.stageHeight} en ({metrics.stageLeft},{metrics.stageTop})
            </>
          )}
        </div>
      )}

      {/* Barra de tiempo del slide: va en el borde inferior de la ventana (no del
          escenario), así en pantallas que no son 16:9 no queda flotando. */}
      {mounted && !isVideo(step.phase) && (
        <div
          key={step.n}
          className={cn("absolute bottom-0 left-0 z-30 bg-blood", styles.progress)}
          style={{
            height: Math.max(3, Math.round(8 * (scale ?? 1))),
            animationDuration: `${stepMs(step, data, qrSeconds, timeScale)}ms`,
          }}
        />
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
        "absolute left-[110px] top-[50px] z-20 flex items-center gap-[28px] transition-opacity duration-500",
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
        "absolute right-[96px] top-[56px] z-20 rounded-[22px] bg-white p-[14px] text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <Image src={QR_SRC} alt="" width={170} height={170} unoptimized priority />
      <div className="mt-1 font-display text-[32px] leading-none tracking-wide text-charcoal">Pedí online</div>
    </div>
  );
}

/** Carga fuera de pantalla las fotos del próximo spotlight (misma URL que usará). */
function Preload({ images }: { images: string[] }) {
  return (
    <div aria-hidden className="pointer-events-none invisible absolute left-[-4000px] top-0 h-[400px] w-[400px]">
      {images.map((src) => (
        <div key={src} className="relative h-full w-full">
          <Image src={src} alt="" fill sizes={PRODUCT_IMAGE_SIZES} loading="eager" />
        </div>
      ))}
    </div>
  );
}

/* ─── Slides ──────────────────────────────────────────────────────────────── */

type SlideContentProps = {
  step: Step;
  active: boolean;
  data: TvData;
  qrSeconds: number;
  onDone: (n: number) => void;
};

function SlideContent({ step, active, data, qrSeconds, onDone }: SlideContentProps) {
  switch (step.phase) {
    case "brand":
      return <BrandSlide data={data} />;
    case "offers": {
      if (isOffersSummary(step, data)) {
        return <OffersSummarySlide offers={lapOffers(data, step.lap).slice(0, SUMMARY_MAX)} />;
      }
      const item = spotlightFor(step, data);
      return item ? (
        <SpotlightSlide
          title={
            <>
              Ofertas <span className="text-blood">especiales</span>
            </>
          }
          item={item}
          index={step.page}
          // Los puntos incluyen el resumen final.
          total={pageCount(step.phase, data, step.lap)}
        />
      ) : null;
    }
    case "featured": {
      const item = spotlightFor(step, data);
      return item ? (
        <SpotlightSlide
          title={<span className="text-blood">Destacados</span>}
          subtitle="La selección del carnicero"
          item={item}
          index={step.page}
          total={pageCount(step.phase, data, step.lap)}
        />
      ) : null;
    }
    case "combos": {
      const item = spotlightFor(step, data);
      return item ? (
        <SpotlightSlide
          title={
            <>
              Combos <span className="text-blood">para el finde</span>
            </>
          }
          kicker="Combo"
          item={item}
          index={step.page}
          total={pageCount(step.phase, data, step.lap)}
        />
      ) : null;
    }
    case "qr":
      return <QrSlide durationMs={qrSeconds * 1000} />;
    case "video-pedir":
    case "video-talo": {
      const src = VIDEOS[step.phase];
      return src ? <VideoSlide src={src} active={active} onDone={() => onDone(step.n)} /> : null;
    }
  }
}

/** Entrada escalonada: el elemento `order` arranca `order × staggerMs (× ?t)` después del primero. */
const stagger = (order: number) => ({ animationDelay: `calc(${order} * var(--tv-stagger, ${TIMING.staggerMs}ms))` });

function BrandSlide({ data }: { data: TvData }) {
  const [status, setStatus] = useState<ProcessingStatus>(() => getOrderProcessingStatus(new Date(), data.hours));

  useEffect(() => {
    const update = () => setStatus(getOrderProcessingStatus(new Date(), data.hours));
    update();
    const interval = setInterval(update, TIMING.statusRefreshMs);
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
        style={stagger(0)}
        className={cn(
          "absolute left-[110px] top-[220px] z-10 text-[34px] font-semibold uppercase tracking-[0.2em] text-blood",
          styles.rise
        )}
      >
        Calidad local, como siempre
      </div>
      <h1
        style={stagger(1)}
        className={cn(
          "absolute left-[110px] top-[275px] z-10 w-[1100px] font-display text-[160px] leading-[0.92] tracking-wide text-white",
          styles.rise
        )}
      >
        El mejor corte
        <br />
        en <span className="text-blood">tu mesa</span>
      </h1>
      <p
        style={stagger(2)}
        className={cn(
          "absolute left-[110px] top-[590px] z-10 w-[860px] text-[46px] font-medium leading-[1.25] text-bone",
          styles.rise
        )}
      >
        Carnes frescas, embutidos artesanales y todo lo que necesitás, sin salir de casa.
      </p>
      <div
        style={stagger(3)}
        className={cn(
          "absolute left-[110px] top-[840px] z-10 inline-flex items-center gap-[22px] text-[52px] font-semibold text-white",
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

/**
 * Foto de producto entera (object-contain, nunca recortada) sobre la tarjeta.
 * Sin imagen o si falla la carga: el logo de placeholder, nunca un hueco.
 */
function ProductImage({ src, className, zoom }: { src: string | null; className?: string; zoom?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <ImagePlaceholder />;
  return (
    <div className={cn("relative h-full w-full", className)}>
      <Image
        src={src}
        alt=""
        fill
        sizes={PRODUCT_IMAGE_SIZES}
        loading="eager"
        className={cn("object-contain", zoom && styles.slowZoom)}
        onError={() => setFailed(true)}
        // Si la misma URL ya había fallado (por ejemplo en la precarga), el error
        // puede llegar antes de que React escuche el evento: se revisa al montar.
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) setFailed(true);
        }}
      />
    </div>
  );
}

function ImagePlaceholder({ small }: { small?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Image
        src={LOGO_SRC}
        alt=""
        width={240}
        height={170}
        className={cn("w-auto opacity-30", small ? "h-[110px]" : "h-[200px]")}
      />
    </div>
  );
}

function ProgressDots({ index, total }: { index: number; total: number }) {
  if (total < 2) return null;
  return (
    <div className="absolute left-[110px] top-[992px] flex items-center gap-[16px]">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[16px] rounded-full transition-all duration-500",
            i === index ? "w-[56px] bg-blood" : i < index ? "w-[16px] bg-bone/60" : "w-[16px] bg-bone/20"
          )}
        />
      ))}
    </div>
  );
}

type SpotlightSlideProps = {
  title: React.ReactNode;
  subtitle?: string;
  kicker?: string;
  item: SpotlightItem;
  index: number;
  total: number;
};

/** Un producto (o combo) por vez: foto grande a la derecha, datos y precio a la izquierda. */
function SpotlightSlide({ title, subtitle, kicker, item, index, total }: SpotlightSlideProps) {
  const images = item.images.slice(0, 2);
  const nameSize = item.name.length <= 16 ? "text-[124px]" : item.name.length <= 30 ? "text-[104px]" : "text-[84px]";

  return (
    <>
      <div className="absolute left-[110px] top-[236px] flex w-[820px] flex-col" style={{ height: 724 }}>
        <h2 style={stagger(0)} className={cn("font-display text-[78px] leading-none tracking-wide text-white", styles.rise)}>
          {title}
        </h2>
        {subtitle && (
          <div style={stagger(1)} className={cn("mt-[10px] text-[34px] font-medium text-smoke", styles.rise)}>
            {subtitle}
          </div>
        )}

        {/* El nombre ocupa el espacio libre y nunca pisa los precios. */}
        <div className="mt-[36px] min-h-0 flex-1 overflow-hidden">
          {kicker && (
            <div
              style={stagger(2)}
              className={cn("text-[32px] font-semibold uppercase tracking-[0.3em] text-smoke", styles.rise)}
            >
              {kicker}
            </div>
          )}
          <div
            style={stagger(3)}
            // El tamaño va antes del interlineado: tailwind-merge descarta el leading si va después.
            className={cn(nameSize, "line-clamp-3 font-display leading-[0.95] tracking-wide text-white", styles.rise)}
          >
            {item.name}
          </div>
        </div>

        <div style={stagger(4)} className={cn("shrink-0 pt-[16px]", styles.rise)}>
          {item.oldPrice !== null && (
            <div className="flex flex-wrap items-center gap-[24px]">
              <span className="text-[48px] text-smoke line-through">{formatPrice(item.oldPrice)}</span>
              <SavingsPill cents={item.oldPrice - item.price} />
            </div>
          )}
          <div className="font-display text-[200px] leading-[0.9] text-blood">{formatPrice(item.price)}</div>
        </div>
      </div>

      <div
        style={stagger(1)}
        className={cn(
          "absolute right-[96px] top-[320px] h-[640px] w-[820px] rounded-[40px] border-4 border-white/10 bg-iron shadow-[0_30px_90px_rgba(0,0,0,0.45)]",
          styles.slideIn
        )}
      >
        <div className="flex h-full w-full gap-[24px] overflow-hidden rounded-[36px] p-[40px]">
          {images.length > 0 ? (
            images.map((src) => (
              <div key={src} className="relative h-full flex-1">
                <ProductImage src={src} zoom />
              </div>
            ))
          ) : (
            <ImagePlaceholder />
          )}
        </div>

        {item.discountPercent !== null && (
          <div
            style={stagger(5)}
            className={cn(
              "absolute -left-[36px] -top-[36px] flex h-[190px] w-[190px] rotate-[-8deg] items-center justify-center rounded-full bg-blood font-display text-[84px] leading-none text-white shadow-[0_14px_40px_rgba(0,0,0,0.5)]",
              styles.pop
            )}
          >
            -{item.discountPercent}%
          </div>
        )}
      </div>

      <ProgressDots index={index} total={total} />
    </>
  );
}

/** Cierre de las ofertas: hasta 6 en grilla con sus precios. */
function OffersSummarySlide({ offers }: { offers: SpotlightItem[] }) {
  const twoRows = offers.length > 3;
  return (
    <>
      <h2
        style={stagger(0)}
        className={cn(
          "absolute left-[110px] top-[236px] font-display text-[78px] leading-none tracking-wide text-white",
          styles.rise
        )}
      >
        Todas las <span className="text-blood">ofertas</span>
      </h2>

      <div
        className={cn(
          "absolute left-[110px] grid w-[1700px] grid-cols-3 gap-[40px]",
          twoRows ? "top-[340px]" : "top-[420px]"
        )}
      >
        {offers.map((offer, i) => (
          <div
            key={offer.id}
            style={stagger(1 + i)}
            className={cn(
              "relative flex h-[300px] overflow-hidden rounded-[30px] border-4 border-white/10 bg-iron",
              styles.rise
            )}
          >
            <div className="h-full w-[230px] shrink-0 bg-charcoal p-[18px]">
              {offer.images[0] ? <ProductImage src={offer.images[0]} /> : <ImagePlaceholder small />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col px-[24px] py-[20px]">
              <div className="line-clamp-2 text-[34px] font-semibold leading-[1.1] text-white">{offer.name}</div>
              <div className="mt-auto">
                {offer.oldPrice !== null && (
                  <div className="flex items-center gap-[14px]">
                    <span className="text-[28px] text-smoke line-through">{formatPrice(offer.oldPrice)}</span>
                    {offer.discountPercent !== null && (
                      <span className="rounded-xl bg-blood px-[14px] font-display text-[36px] leading-tight text-white">
                        -{offer.discountPercent}%
                      </span>
                    )}
                  </div>
                )}
                <div className="font-display text-[82px] leading-none text-blood">{formatPrice(offer.price)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function QrSlide({ durationMs }: { durationMs: number }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const secondsLeft = Math.ceil((durationMs - (now - startedAt)) / 1000);

  return (
    <>
      <h2
        style={stagger(0)}
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
        style={stagger(1)}
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
  onDone,
}: {
  src: string;
  active: boolean;
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

    const done = () => {
      if (finished) return;
      finished = true;
      onDoneRef.current();
    };

    // Si en 8 s no cargó, se saltea.
    const loadTimer = setTimeout(() => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) done();
    }, TIMING.videoLoadTimeoutMs);

    const onMetadata = () => {
      if (!Number.isFinite(video.duration)) return;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(done, video.duration * 1000 + TIMING.videoStallMarginMs);
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
    video.play().catch(done);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(stallTimer);
      video.removeEventListener("ended", done);
      video.removeEventListener("error", done);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [active]);

  return (
    // Sin fondo propio: si la pantalla no es 16:9, alrededor se ve el fondo general.
    <div className="absolute inset-0">
      <video ref={videoRef} src={src} muted playsInline preload="auto" className="h-full w-full object-contain" />
      <div ref={barRef} className="absolute bottom-0 left-0 h-2 w-0 bg-blood" />
    </div>
  );
}
