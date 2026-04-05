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
// ¿Cómo consultamos la API de Banxico?
//   - Usamos rango de fechas (últimos 10 días → hoy) para obtener los datos
//     más recientes incluso si hay días inhábiles (fines de semana, festivos).
//   - El endpoint "ult/N" dejó de funcionar correctamente (retorna 400).
//   - Del rango obtenido, tomamos los últimos 2 datos válidos:
//     [-2] = FIX ya publicado en DOF → vigente para pagos de hoy
//     [-1] = FIX más reciente determinado → se publicará en DOF siguiente día hábil
//
// Zona horaria:
//   - Todas las fechas se calculan en "America/Mexico_City" para evitar
//     que un servidor en UTC pida la fecha incorrecta (ej. a las 11pm en
//     CDMX un servidor UTC ya estaría en "mañana").
// ────────────────────────────────────────────────────────────────────────────

const BANXICO_TOKEN = process.env.BANXICO_TOKEN;
const TIMEZONE = "America/Mexico_City";

/** Fecha en zona horaria de México como "YYYY-MM-DD" */
function fechaMexico(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

/** Resta N días a una fecha */
function restarDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() - dias);
  return d;
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

  const now = new Date();
  const hoy = fechaMexico(now);
  // Pedir rango de 30 días para tener ~10+ datos hábiles (cubre festivos largos)
  const desde = fechaMexico(restarDias(now, 30));

  const url =
    `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/${desde}/${hoy}?mediaType=json`;

  console.log("[tipo-cambio] Consultando Banxico FIX rango %s → %s", desde, hoy);

  const res = await fetch(url, {
    headers: { "Bmx-Token": BANXICO_TOKEN },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    console.warn("[tipo-cambio] Banxico API respondió %d", res.status);
    return null;
  }

  const data = await res.json();
  const datos = data?.bmx?.series?.[0]?.datos;
  if (!datos || datos.length === 0) {
    console.warn("[tipo-cambio] Banxico no devolvió datos para rango %s → %s", desde, hoy);
    return null;
  }

  // Filtrar entradas válidas (Banxico puede devolver "N/E" en días inhábiles)
  const valid = datos
    .map((d: { fecha: string; dato: string }) => ({
      fecha: d.fecha, // formato "dd/mm/yyyy"
      valor: parseBanxicoValue(d.dato),
    }))
    .filter((d: { valor: number | null }) => d.valor !== null);

  if (valid.length === 0) {
    console.warn("[tipo-cambio] Banxico: todos los datos son N/E en rango %s → %s", desde, hoy);
    return null;
  }

  // ── Determinar vigente vs próximo basado en si hay dato del día actual ──
  //
  // Convertir fecha local "YYYY-MM-DD" a formato Banxico "dd/mm/yyyy" para comparar
  const [ay, am, ad] = hoy.split("-");
  const hoyBanxicoFmt = `${ad}/${am}/${ay}`;

  const ultimo = valid[valid.length - 1];
  const penultimo = valid.length > 1 ? valid[valid.length - 2] : null;
  const existeDatoHoy = valid.some((d: { fecha: string }) => d.fecha === hoyBanxicoFmt);

  // Logs de diagnóstico
  console.log("[tipo-cambio] ── Diagnóstico ──");
  console.log("[tipo-cambio]   fecha local actual (México): %s (%s)", hoy, hoyBanxicoFmt);
  console.log("[tipo-cambio]   último dato válido:      %s → $%s", ultimo.fecha, ultimo.valor);
  console.log("[tipo-cambio]   penúltimo dato válido:   %s → $%s", penultimo?.fecha ?? "—", penultimo?.valor ?? "—");
  console.log("[tipo-cambio]   ¿existe dato del día actual?: %s", existeDatoHoy ? "SÍ" : "NO");

  let vigente: { fecha: string; valor: number };
  let determinadoReciente: { fecha: string; valor: number } | null = null;

  if (existeDatoHoy && penultimo) {
    // Hay dato de hoy → Banxico determinó FIX hoy
    // penúltimo = FIX ya publicado en DOF → vigente para pagos de hoy
    // último = FIX determinado hoy → se publicará mañana en DOF
    vigente = penultimo;
    determinadoReciente = ultimo;
  } else {
    // NO hay dato de hoy (fin de semana, festivo, o aún no se publica)
    // último = FIX más reciente disponible → es el vigente
    // no asumimos que hay dato para mañana
    vigente = ultimo;
    determinadoReciente = null;
  }

  console.log("[tipo-cambio]   → vigente elegido:       %s → $%s", vigente.fecha, vigente.valor);
  console.log("[tipo-cambio]   → próximo DOF elegido:   %s → $%s",
    determinadoReciente?.fecha ?? "—", determinadoReciente?.valor ?? "—");

  const result: BanxicoResult = {
    tipoCambio: vigente.valor,
    fecha: vigente.fecha,
    fuente: "Banxico FIX (SF43718)",
    etiqueta: existeDatoHoy
      ? "FIX vigente — publicado en DOF para pagos de hoy"
      : "FIX vigente — último disponible",
    fechaSolicitada: hoy,
    fechaResuelta: vigente.fecha,
    timezone: TIMEZONE,
    fallbackUsed: false,
  };

  // Solo incluir dato alterno si realmente hay uno determinado hoy
  if (determinadoReciente && determinadoReciente.valor !== vigente.valor) {
    result.tipoCambioAlt = determinadoReciente.valor;
    result.fechaAlt = determinadoReciente.fecha;
    result.etiquetaAlt = "FIX determinado hoy — se publica mañana en DOF";
  }

  // Histórico: últimos 10 datos válidos (más reciente primero)
  result.historico = valid
    .slice(-10)
    .reverse()
    .map((d: { fecha: string; valor: number }) => ({ fecha: d.fecha, valor: d.valor }));

  console.log("[tipo-cambio] Banxico OK: vigente=%s (%s), historico=%d datos",
    vigente.valor, vigente.fecha,
    result.historico?.length ?? 0,
  );

  return result;
}

// ── Fuente de respaldo: ExchangeRate API (mercado) ────────────────────────

async function fetchExchangeRateAPI(): Promise<BanxicoResult> {
  const fechaSolicitada = fechaMexico();

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
  // Últimos ~10 datos históricos (más reciente primero)
  historico?: { fecha: string; valor: number }[];
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
        fechaSolicitada: fechaMexico(),
      },
      { status: 500 }
    );
  }
}
