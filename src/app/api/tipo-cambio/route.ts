import { NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// TIPO DE CAMBIO FIX — Banco de México
// ────────────────────────────────────────────────────────────────────────────
//
// Serie SF43718 = "Tipo de cambio pesos por dólar E.U.A. Tipo de cambio
// para solventar obligaciones denominadas en moneda extranjera (FIX)"
//
// ¿Qué es el FIX?
//   - Banxico lo DETERMINA cada día hábil bancario con base en un promedio
//     de cotizaciones del mercado mayorista de dólares.
//   - El FIX determinado el día T se PUBLICA en el Diario Oficial de la
//     Federación (DOF) el día T+1 y aplica para liquidar obligaciones de T+1.
//   - Ejemplo: el FIX determinado el lunes se publica en el DOF del martes
//     y aplica para pagos del martes.
//
// ¿Cómo funciona la API de Banxico?
//   - Al pedir "ult/2" regresa los 2 datos más recientes:
//     [0] = FIX más antiguo (ya publicado en DOF → vigente HOY para pagos)
//     [1] = FIX más reciente (determinado hoy → se publicará mañana en DOF)
//
// Zona horaria:
//   - Todas las fechas se calculan en "America/Mexico_City" para evitar
//     que un servidor en UTC pida la fecha incorrecta (ej. a las 11pm en
//     CDMX un servidor UTC ya estaría en "mañana").
// ────────────────────────────────────────────────────────────────────────────

const BANXICO_TOKEN = process.env.BANXICO_TOKEN;
const TIMEZONE = "America/Mexico_City";

/** Fecha actual en zona horaria de México como "YYYY-MM-DD" */
function fechaHoyMexico(): string {
  const now = new Date();
  // Intl.DateTimeFormat con timeZone nos da la fecha local de México
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

/** Fecha legible para el frontend: "dd/mm/yyyy" */
function fechaLegible(iso: string): string {
  // Banxico devuelve "dd/mm/yyyy" — si viene así, la dejamos
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
  // Si viene como ISO "yyyy-mm-dd", convertimos
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseBanxicoValue(raw: string): number | null {
  const valor = parseFloat(String(raw).replace(",", "."));
  return isNaN(valor) ? null : valor;
}

// ── Fuente primaria: Banxico FIX (serie SF43718) ──────────────────────────

async function fetchBanxicoFIX(): Promise<BanxicoResult | null> {
  if (!BANXICO_TOKEN) return null;

  const fechaSolicitada = fechaHoyMexico();

  // Pedimos los últimos 2 datos: el vigente hoy (publicado en DOF) y el
  // determinado hoy (se publicará mañana en DOF).
  const url =
    "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/ult/2?mediaType=json";

  const res = await fetch(url, {
    headers: { "Bmx-Token": BANXICO_TOKEN },
    // Evitar cache viejo en edge/CDN
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    console.warn("[tipo-cambio] Banxico API respondió %d", res.status);
    return null;
  }

  const data = await res.json();
  const datos = data?.bmx?.series?.[0]?.datos;
  if (!datos || datos.length === 0) {
    console.warn("[tipo-cambio] Banxico no devolvió datos");
    return null;
  }

  // Filtrar entradas válidas (a veces Banxico devuelve "N/E")
  const valid = datos
    .map((d: { fecha: string; dato: string }) => ({
      fecha: d.fecha, // formato "dd/mm/yyyy"
      valor: parseBanxicoValue(d.dato),
    }))
    .filter((d: { valor: number | null }) => d.valor !== null);

  if (valid.length === 0) {
    console.warn("[tipo-cambio] Banxico: todos los datos son N/E");
    return null;
  }

  // Banxico devuelve cronológicamente: [más antiguo, más reciente]
  // [0] = FIX ya publicado en DOF → vigente para pagos de hoy
  // [1] = FIX determinado hoy → se publica mañana en DOF
  const vigente = valid[0];
  const determinadoHoy = valid.length > 1 ? valid[1] : null;

  const result: BanxicoResult = {
    tipoCambio: vigente.valor,
    fecha: vigente.fecha,
    fuente: "Banxico FIX (SF43718)",
    etiqueta: "FIX vigente — publicado en DOF para pagos de hoy",
    fechaSolicitada,
    fechaResuelta: vigente.fecha,
    timezone: TIMEZONE,
    fallbackUsed: false,
  };

  // Si hay un segundo dato (el FIX determinado hoy), lo incluimos
  if (determinadoHoy && determinadoHoy.valor !== vigente.valor) {
    result.tipoCambioAlt = determinadoHoy.valor;
    result.fechaAlt = determinadoHoy.fecha;
    result.etiquetaAlt = "FIX determinado hoy — se publica mañana en DOF";
  }

  return result;
}

// ── Fuente de respaldo: ExchangeRate API (mercado) ────────────────────────

async function fetchExchangeRateAPI(): Promise<BanxicoResult> {
  const fechaSolicitada = fechaHoyMexico();

  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error("Error al obtener tipo de cambio de respaldo");

  const data = await res.json();
  const mxn = data.rates?.MXN;
  if (!mxn) throw new Error("No se encontró tasa MXN en API de respaldo");

  // Usar la fecha de la API pero formateada en zona México
  const updateDate = data.time_last_update_utc
    ? new Date(data.time_last_update_utc)
    : new Date();

  const fecha = updateDate.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  });

  return {
    tipoCambio: mxn,
    fecha,
    fuente: "ExchangeRate API (referencia de mercado, NO es FIX oficial)",
    etiqueta: "Tipo de cambio de mercado (respaldo)",
    fechaSolicitada,
    fechaResuelta: fecha,
    timezone: TIMEZONE,
    fallbackUsed: true,
  };
}

// ── Tipos ─────────────────────────────────────────────────────────────────

interface BanxicoResult {
  tipoCambio: number;
  fecha: string;
  fuente: string;
  etiqueta: string;
  // Metadata de la consulta
  fechaSolicitada: string;  // Fecha que se intentó consultar (hora México)
  fechaResuelta: string;    // Fecha real del dato devuelto
  timezone: string;         // Siempre "America/Mexico_City"
  fallbackUsed: boolean;    // true si se usó API de respaldo en vez de Banxico
  // Segundo dato opcional (FIX determinado hoy, publicado mañana)
  tipoCambioAlt?: number;
  fechaAlt?: string;
  etiquetaAlt?: string;
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Intentar Banxico FIX (fuente oficial)
    const banxico = await fetchBanxicoFIX();

    if (!banxico) {
      console.warn(
        "[tipo-cambio] Banxico no disponible (BANXICO_TOKEN=%s), usando fallback ExchangeRate API",
        BANXICO_TOKEN ? "configurado" : "FALTA"
      );
    }

    // 2. Si Banxico falla, usar ExchangeRate API como respaldo
    const result = banxico || (await fetchExchangeRateAPI());

    return NextResponse.json(result, {
      headers: {
        // Cache en CDN 5 min, stale-while-revalidate 10 min
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[tipo-cambio] Error fatal:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener tipo de cambio",
        timezone: TIMEZONE,
        fechaSolicitada: fechaHoyMexico(),
      },
      { status: 500 }
    );
  }
}
