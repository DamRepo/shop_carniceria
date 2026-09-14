/**
 * Cliente de la Payments API de Talo Pay (transferencia bancaria vía CVU/alias).
 * Nunca importar desde componentes cliente: usa TALO_CLIENT_SECRET.
 *
 * No usa el import "server-only" a propósito: este módulo también lo
 * consume scripts/reconcile-talo-payments.ts, ejecutado con tsx fuera del
 * bundler de Next.js, donde "server-only" siempre tira error (su check solo
 * funciona dentro del build de Next). Como TALO_CLIENT_SECRET nunca lleva
 * prefijo NEXT_PUBLIC_, un import accidental desde un componente cliente no
 * filtraría el secreto: solo rompería en runtime con "falta la variable".
 */

type TaloEstadoPago = "PENDING" | "SUCCESS" | "OVERPAID" | "UNDERPAID" | "EXPIRED";

interface TaloCuota {
  cvu?: string;
  address?: string;
  alias?: string;
}

export interface TaloDatosCliente {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  dni?: string;
}

export interface TaloPago {
  id: string;
  payment_status: TaloEstadoPago;
  quotes: TaloCuota[];
  payment_url?: string;
  expiration_timestamp?: string;
  /** `price.amount` viene en PESOS ARS, no en centavos. */
  price?: { amount: number; currency: string };
  external_id?: string;
}

interface TaloEnvelope<T> {
  data: T;
}

interface TaloTokenResponse {
  message: string;
  error: boolean;
  data: { token: string };
}

function getTaloBaseUrl(): string {
  return process.env.TALO_ENV === "production"
    ? "https://api.talo.com.ar"
    : "https://sandbox-api.talo.com.ar";
}

function getTaloEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

// Cache en memoria del token, renovado cada ~10 minutos (Talo no documenta expiración).
let tokenCacheado: { token: string; obtenidoEn: number } | null = null;
const TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * Obtiene (y cachea) el bearer token de Talo vía POST /users/{user_id}/tokens.
 */
export async function obtenerTokenTalo(): Promise<string> {
  const ahora = Date.now();

  if (tokenCacheado && ahora - tokenCacheado.obtenidoEn < TOKEN_TTL_MS) {
    return tokenCacheado.token;
  }

  const userId = getTaloEnv("TALO_USER_ID");
  const clientId = getTaloEnv("TALO_CLIENT_ID");
  const clientSecret = getTaloEnv("TALO_CLIENT_SECRET");

  const res = await fetch(`${getTaloBaseUrl()}/users/${userId}/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Talo: error obteniendo token (status ${res.status}): ${detail}`);
  }

  const body = (await res.json()) as TaloTokenResponse;

  if (!body?.data?.token) {
    throw new Error("Talo: respuesta de token sin campo data.token");
  }

  tokenCacheado = { token: body.data.token, obtenidoEn: ahora };
  return body.data.token;
}

interface CrearPagoTaloParams {
  /** Monto en CENTAVOS, como se guarda `Order.total`/`CheckoutSession.total` en la DB de este proyecto. */
  montoCentavos: number;
  externalId: string;
  webhookUrl?: string;
  redirectUrl?: string;
  motive?: string;
  clientData?: TaloDatosCliente;
}

/**
 * Crea un pago en Talo (POST /payments/, endpoint público, sin Authorization).
 * El monto SIEMPRE debe salir de la base de datos, nunca del cliente/frontend.
 *
 * IMPORTANTE — unidad de `price.amount`: a diferencia de este proyecto (que
 * guarda montos en centavos), la API de Talo espera PESOS ARS enteros/decimales
 * (ej. de su doc oficial: `{ "amount": 30000 }` = $30.000 ARS, no $300). Por eso
 * acá se recibe `montoCentavos` y se convierte a pesos antes de armar el body.
 */
export async function crearPagoTalo(params: CrearPagoTaloParams): Promise<TaloPago> {
  const userId = getTaloEnv("TALO_USER_ID");

  // Talo espera pesos, no centavos — ver comentario de la función.
  const montoPesos = Number((params.montoCentavos / 100).toFixed(2));

  if (!Number.isFinite(montoPesos) || montoPesos <= 0) {
    throw new Error("Talo: monto inválido para crear el pago");
  }

  const res = await fetch(`${getTaloBaseUrl()}/payments/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      price: { amount: montoPesos, currency: "ARS" },
      payment_options: ["transfer"],
      external_id: params.externalId,
      webhook_url: params.webhookUrl,
      redirect_url: params.redirectUrl,
      motive: params.motive,
      client_data: params.clientData,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Talo: error creando pago (status ${res.status}): ${detail}`);
  }

  const body = (await res.json()) as TaloEnvelope<TaloPago>;

  if (!body?.data?.id || !body.data.quotes?.length) {
    throw new Error("Talo: respuesta de creación de pago incompleta");
  }

  return body.data;
}

/**
 * Consulta el estado real de un pago (GET /payments/{id}, requiere Bearer).
 * El webhook de Talo no está firmado todavía, así que esta es la única fuente
 * de verdad antes de marcar una orden como pagada.
 */
export async function consultarPagoTalo(paymentId: string): Promise<TaloPago> {
  const token = await obtenerTokenTalo();

  const res = await fetch(`${getTaloBaseUrl()}/payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Talo: error consultando pago ${paymentId} (status ${res.status}): ${detail}`);
  }

  const body = (await res.json()) as TaloEnvelope<TaloPago>;

  if (!body?.data?.id) {
    throw new Error(`Talo: respuesta de consulta de pago ${paymentId} incompleta`);
  }

  return body.data;
}

/** Extrae CVU y alias de la primera cuota, tolerando `cvu` o `address` según el endpoint. */
export function extraerCvuAlias(pago: TaloPago): { cvu: string | null; alias: string | null } {
  const cuota = pago.quotes?.[0];
  return {
    cvu: cuota?.cvu ?? cuota?.address ?? null,
    alias: cuota?.alias ?? null,
  };
}
