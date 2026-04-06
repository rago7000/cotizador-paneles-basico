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

/**
 * Convierte fecha de DETERMINACIÓN (Banxico) a fecha de PUBLICACIÓN (DOF).
 * Regla: el FIX determinado el día T se publica en el DOF del siguiente día hábil.
 * Salta sábados y domingos. (Festivos no se pueden predecir, pero el 95%+ de los
 * casos son fines de semana.)
 *
 * Entrada: "dd/mm/yyyy" (formato Banxico)
 * Salida:  "dd/mm/yyyy" (fecha DOF)
 */
function fechaDOF(fechaBanxico: string): string {
  const [dd, mm, yyyy] = fechaBanxico.split("/");
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  // Avanzar al siguiente día hábil
  d.setDate(d.getDate() + 1);
  // Si cae en sábado → lunes, domingo → lunes
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2); // sábado → lunes
  if (dow === 0) d.setDate(d.getDate() + 1); // domingo → lunes
  const rd = String(d.getDate()).padStart(2, "0");
  const rm = String(d.getMonth() + 1).padStart(2, "0");
  const ry = d.getFullYear();
  return `${rd}/${rm}/${ry}`;
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

  // ── Lógica simple: el principal siempre es el último dato válido ──
  //
  // El último dato de Banxico es el FIX más reciente determinado.
  // Ese es el valor que mostramos como tipo de cambio oficial.
  // Las fechas se convierten a fecha DOF (publicación = determinación + 1 hábil)
  // para que coincidan con lo que el usuario ve en dof.gob.mx.
  const principal = valid[valid.length - 1];
  const anterior = valid.length > 1 ? valid[valid.length - 2] : null;

  const principalDOF = fechaDOF(principal.fecha);
  const anteriorDOF = anterior ? fechaDOF(anterior.fecha) : null;

  // Logs de diagnóstico
  console.log("[tipo-cambio] ── Diagnóstico ──");
  console.log("[tipo-cambio]   fecha local (México): %s", hoy);
  console.log("[tipo-cambio]   principal: determinado %s → DOF %s → $%s", principal.fecha, principalDOF, principal.valor);
  console.log("[tipo-cambio]   anterior:  determinado %s → DOF %s → $%s", anterior?.fecha ?? "—", anteriorDOF ?? "—", anterior?.valor ?? "—");
  console.log("[tipo-cambio]   total datos válidos: %d", valid.length);

  const result: BanxicoResult = {
    tipoCambio: principal.valor,
    fecha: principalDOF, // ← fecha DOF, no fecha de determinación
    fuente: "Banxico FIX (SF43718)",
    etiqueta: "Tipo de cambio FIX",
    fechaSolicitada: hoy,
    fechaResuelta: principalDOF,
    timezone: TIMEZONE,
    fallbackUsed: false,
  };

  // Mostrar el dato anterior como referencia
  if (anterior && anterior.valor !== principal.valor) {
    result.tipoCambioAlt = anterior.valor;
    result.fechaAlt = anteriorDOF!;
    result.etiquetaAlt = "FIX anterior";
  }

  // Histórico: últimos 10 datos válidos (más reciente primero), con fechas DOF
  result.historico = valid
    .slice(-10)
    .reverse()
    .map((d: { fecha: string; valor: number }) => ({ fecha: fechaDOF(d.fecha), valor: d.valor }));

  console.log("[tipo-cambio] OK: principal=%s (%s), historico=%d datos",
    principal.valor, principal.fecha,
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
