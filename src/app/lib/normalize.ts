// ── Normalization layer ──────────────────────────────────────────────────────
//
// Converts string form values to typed numbers ONCE, then all downstream
// calculations use the normalized structure. Eliminates scattered
// `Number(x) || 0` throughout page.tsx.
//
// Three data layers:
//   CotizacionState    — UI strings ("20", "545", "0.22") + UI flags
//   CotizacionNormalized — clean numbers (20, 545, 0.22) for calculations
//   CotizacionData     — serialization format for Convex persistence

import type { CotizacionState, ReciboCFEData, Minisplit } from "./cotizacion-state";
import type { TipoCambioData, LineItem } from "./types";

// ── Normalized types ────────────────────────────────────────────────────────

/** Numeric values extracted from form strings — used by all calculations. */
export interface CotizacionNormalized {
  // Paneles
  cantidadPaneles: number;
  potenciaW: number;
  precioPorWatt: number;
  fletePaneles: number;
  garantiaPaneles: number;

  // Microinversores
  precioMicroinversor: number;
  precioCable: number;
  precioECU: number;
  incluyeECU: boolean;
  precioHerramienta: number;
  incluyeHerramienta: boolean;
  precioEndCap: number;
  incluyeEndCap: boolean;
  fleteMicros: number;

  // Derived micro
  panelesPorMicro: number;
  cantidadMicros: number;

  // Line item sums (MXN)
  costoAluminioMXN: number;
  fleteAluminio: number;
  costoTornilleriaMXN: number;
  costoGeneralesMXN: number;

  // Tipo de cambio
  tcLive: number;
  tcVal: number;
  tcPaneles: number;
  tcMicros: number;

  // Intermediate USD values (useful for display)
  costoPanel: number;
  costoPanelesUSD: number;
  costoMicrosUSD: number;
  costoCablesUSD: number;
  costoECUUSD: number;
  costoHerramientaUSD: number;
  costoEndCapUSD: number;

  // Recibo / Sizing
  reciboCFE: ReciboCFEData | null;
  panelW: number; // potenciaW with fallback to 545

  // Minisplits
  minisplits: Minisplit[];
  minisplitTemporada: "anual" | "temporada";
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Safe string-to-number. Returns 0 for empty/invalid strings.
 * In development, logs a warning when a non-empty string can't be parsed —
 * helps catch bad data before it silently becomes 0.
 */
export function num(value: string | number | undefined | null, label?: string): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[num] Invalid numeric value${label ? ` for "${label}"` : ""}: ${JSON.stringify(value)} → defaulting to 0`,
      );
    }
    return 0;
  }
  return n;
}

/** Sum cantidad * precioUnitario for a list of LineItems. */
export function sumLineItems(items: LineItem[]): number {
  return items.reduce((s, it) => s + num(it.cantidad) * num(it.precioUnitario), 0);
}

// ── Main normalizer ─────────────────────────────────────────────────────────

/**
 * Convert CotizacionState (strings) → CotizacionNormalized (numbers).
 * Called once per render cycle. All downstream calculations use the result.
 */
export function normalizeState(s: CotizacionState): CotizacionNormalized {
  // Paneles
  const cantidadPaneles = num(s.cantidad, "cantidad");
  const potenciaW = num(s.potencia, "potencia");
  const precioPorWatt = num(s.precioPorWatt, "precioPorWatt");
  const fletePaneles = num(s.fletePaneles, "fletePaneles");
  const garantiaPaneles = num(s.garantiaPaneles, "garantiaPaneles");

  // Microinversores
  const precioMicroinversor = num(s.precioMicroinversor, "precioMicroinversor");
  const precioCable = num(s.precioCable, "precioCable");
  const precioECU = num(s.precioECU, "precioECU");
  const precioHerramienta = num(s.precioHerramienta, "precioHerramienta");
  const precioEndCap = num(s.precioEndCap, "precioEndCap");
  const fleteMicros = num(s.fleteMicros, "fleteMicros");

  // Derived
  const panelesPorMicro = s.microSeleccionado?.panelesPorUnidad ?? 4;
  const cantidadMicros = cantidadPaneles > 0 ? Math.ceil(cantidadPaneles / panelesPorMicro) : 0;

  // Intermediate USD
  const costoPanel = potenciaW * precioPorWatt;
  const costoPanelesUSD = costoPanel * cantidadPaneles;
  const costoMicrosUSD = cantidadMicros * precioMicroinversor;
  const costoCablesUSD = cantidadMicros * precioCable;
  const costoECUUSD = s.incluyeECU ? precioECU : 0;
  const costoHerramientaUSD = s.incluyeHerramienta ? precioHerramienta : 0;
  const costoEndCapUSD = s.incluyeEndCap ? precioEndCap * cantidadMicros : 0;

  // Line item sums
  const costoAluminioMXN = sumLineItems(s.aluminio);
  const fleteAluminio = num(s.fleteAluminio, "fleteAluminio");
  const costoTornilleriaMXN = sumLineItems(s.tornilleria);
  const costoGeneralesMXN = sumLineItems(s.generales);

  // Tipo de cambio resolution
  const tcLive = (s.tcUsarManana && s.tc?.tipoCambioAlt)
    ? s.tc.tipoCambioAlt
    : (s.tc?.tipoCambio || 0);
  const tcVal = ((s.tcFrozen || s.tcManual) && num(s.tcSnapshotLocal, "tcSnapshotLocal") > 0)
    ? num(s.tcSnapshotLocal, "tcSnapshotLocal")
    : tcLive;
  const tcPaneles = num(s.tcCustomPaneles, "tcCustomPaneles") > 0 ? num(s.tcCustomPaneles, "tcCustomPaneles") : tcVal;
  const tcMicros = num(s.tcCustomMicros, "tcCustomMicros") > 0 ? num(s.tcCustomMicros, "tcCustomMicros") : tcVal;

  return {
    cantidadPaneles,
    potenciaW,
    precioPorWatt,
    fletePaneles,
    garantiaPaneles,
    precioMicroinversor,
    precioCable,
    precioECU,
    incluyeECU: s.incluyeECU,
    precioHerramienta,
    incluyeHerramienta: s.incluyeHerramienta,
    precioEndCap,
    incluyeEndCap: s.incluyeEndCap,
    fleteMicros,
    panelesPorMicro,
    cantidadMicros,
    costoAluminioMXN,
    fleteAluminio,
    costoTornilleriaMXN,
    costoGeneralesMXN,
    tcLive,
    tcVal,
    tcPaneles,
    tcMicros,
    costoPanel,
    costoPanelesUSD,
    costoMicrosUSD,
    costoCablesUSD,
    costoECUUSD,
    costoHerramientaUSD,
    costoEndCapUSD,
    reciboCFE: s.reciboCFE,
    panelW: potenciaW || 545,
    minisplits: s.minisplits,
    minisplitTemporada: s.minisplitTemporada,
  };
}

// ── Minisplit calculation ───────────────────────────────────────────────────

const WATTS_POR_TON: Record<string, number> = { inverter: 900, convencional: 1400 };

export interface MinisplitResult {
  minisplitKwhMes: number;
  minisplitKwhMesProm: number;
}

export function calcularMinisplits(
  minisplits: Minisplit[],
  temporada: "anual" | "temporada",
): MinisplitResult {
  const minisplitKwhMes = minisplits.reduce((sum, m) => {
    const watts = m.cantidad * num(m.toneladas) * (WATTS_POR_TON[m.tipo] ?? 0);
    return sum + (watts * m.horasDia * 30) / 1000;
  }, 0);
  const minisplitKwhMesProm = temporada === "temporada"
    ? Math.round(minisplitKwhMes / 2)
    : Math.round(minisplitKwhMes);

  return { minisplitKwhMes, minisplitKwhMesProm };
}
