import type { CotizacionData, LineItem, UtilidadConfig } from "../../lib/types";
import { calcularPartidas, calcularPrecioCliente } from "../../lib/calc-costos";
import type { CotizacionRow, Etapa, Origen, UIState } from "./types-shared";

const DEFAULT_UTILIDAD: UtilidadConfig = {
  tipo: "global",
  globalPct: 30,
  panelesPct: 30,
  inversoresPct: 30,
  estructuraPct: 30,
  tornilleriaPct: 30,
  generalesPct: 30,
  montoFijo: 0,
};

function num(v: string | number | undefined | null): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumLineItems(items: LineItem[] | undefined): number {
  if (!items) return 0;
  return items.reduce((s, it) => s + num(it.cantidad) * num(it.precioUnitario), 0);
}

function resolveTC(d: CotizacionData, kind: "paneles" | "micros"): number {
  const custom = kind === "paneles" ? num(d.tcCustomPaneles) : num(d.tcCustomMicros);
  if (custom > 0) return custom;
  return num(d.tcSnapshot);
}

/**
 * Convert a saved CotizacionData into a list row — with best-effort totals.
 * If no exchange-rate info is available, totals fall back to `null` and UI
 * renders them as "—".
 */
export function toRow(d: CotizacionData): CotizacionRow {
  const cantidad = num(d.cantidad);
  const potencia = num(d.potencia);
  const tcPaneles = resolveTC(d, "paneles");
  const tcMicros = resolveTC(d, "micros");

  const panelesPorMicro = 4;
  const cantidadMicros = cantidad > 0 ? Math.ceil(cantidad / panelesPorMicro) : 0;

  let totalMXN: number | null = null;
  let totalClienteMXN: number | null = null;
  let utilidadNetaMXN: number | null = null;
  let utilidadNetaPct: number | null = null;

  if (tcPaneles > 0 || tcMicros > 0) {
    const partidas = calcularPartidas({
      cantidadPaneles: cantidad,
      potenciaW: potencia,
      precioPorWatt: num(d.precioPorWatt),
      fletePaneles: num(d.fletePaneles),
      garantiaPaneles: num(d.garantiaPaneles),
      tcPaneles: tcPaneles || tcMicros,
      cantidadMicros,
      precioMicroinversor: num(d.precioMicroinversor),
      precioCable: num(d.precioCable),
      precioECU: num(d.precioECU),
      incluyeECU: d.incluyeECU ?? true,
      precioHerramienta: num(d.precioHerramienta),
      incluyeHerramienta: d.incluyeHerramienta ?? false,
      precioEndCap: num(d.precioEndCap),
      incluyeEndCap: d.incluyeEndCap ?? false,
      fleteMicros: num(d.fleteMicros),
      tcMicros: tcMicros || tcPaneles,
      costoAluminioMXN: sumLineItems(d.aluminio),
      fleteAluminio: num(d.fleteAluminio),
      costoTornilleriaMXN: sumLineItems(d.tornilleria),
      costoGeneralesMXN: sumLineItems(d.generales),
    });
    totalMXN = partidas.totalMXN;
    const utilidad = d.utilidad ?? DEFAULT_UTILIDAD;
    const pc = calcularPrecioCliente(partidas, utilidad, cantidad, potencia);
    totalClienteMXN = pc.clienteTotalMXN;
    utilidadNetaMXN = pc.utilidadNetaMXN;
    utilidadNetaPct = pc.utilidadNetaPct;
  }

  const actualizadoEn = d.actualizadoEn;
  const diasSinMovimiento = actualizadoEn
    ? Math.floor((Date.now() - new Date(actualizadoEn).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const etapa: Etapa = (d.etapa as Etapa) ?? "prospecto";
  const prob = d.probabilidadCierre ?? defaultProbForEtapa(etapa);
  const valorPonderadoMXN = totalClienteMXN != null && !isClosedEtapa(etapa)
    ? totalClienteMXN * (prob / 100)
    : 0;

  return {
    nombre: d.nombre,
    cotizacionId: d.cotizacionId,
    fecha: d.fecha,
    actualizadoEn: d.actualizadoEn,
    creadoEn: d.creadoEn,
    etapa,
    origen: d.origen as Origen | undefined,
    origenDetalle: d.origenDetalle,
    clienteTelefono: d.clienteTelefono,
    clienteEmail: d.clienteEmail,
    clienteUbicacion: d.clienteUbicacion,
    clienteNotas: d.clienteNotas,
    probabilidadCierre: d.probabilidadCierre,
    fechaCierre: d.fechaCierre,
    fechaInstalacion: d.fechaInstalacion,
    tags: d.tags,
    cantidadPaneles: cantidad,
    potenciaW: potencia,
    kWp: (cantidad * potencia) / 1000,
    totalMXN,
    totalClienteMXN,
    utilidadNetaMXN,
    utilidadNetaPct,
    diasSinMovimiento,
    valorPonderadoMXN,
    hasReciboCFE: !!d.reciboCFE,
    raw: d,
  };
}

function defaultProbForEtapa(e: Etapa): number {
  switch (e) {
    case "prospecto": return 10;
    case "cotizado": return 30;
    case "negociacion": return 60;
    case "cerrado_ganado": return 100;
    case "instalado": return 100;
    case "cerrado_perdido": return 0;
  }
}

export function isClosedEtapa(e: Etapa): boolean {
  return e === "cerrado_ganado" || e === "cerrado_perdido" || e === "instalado";
}

// ── Filtering / sorting ────────────────────────────────────────────────────

function norm(s: string | undefined | null): string {
  return (s ?? "").toLocaleLowerCase("es-MX");
}

export function filterRows(rows: CotizacionRow[], ui: UIState): CotizacionRow[] {
  const q = norm(ui.search).trim();
  const sinceMs = ui.rangoDias > 0 ? Date.now() - ui.rangoDias * 86400000 : 0;
  return rows.filter((r) => {
    if (ui.etapas.length > 0 && !ui.etapas.includes(r.etapa)) return false;
    if (ui.origenes.length > 0 && (!r.origen || !ui.origenes.includes(r.origen))) return false;
    if (ui.soloConCFE && !r.hasReciboCFE) return false;
    if (sinceMs > 0) {
      const t = r.actualizadoEn ? new Date(r.actualizadoEn).getTime() : 0;
      if (t < sinceMs) return false;
    }
    if (q) {
      const hay = [
        r.nombre,
        r.clienteNotas,
        r.clienteTelefono,
        r.clienteEmail,
        r.clienteUbicacion,
        r.origenDetalle,
        ...(r.tags ?? []),
      ].map(norm).join(" | ");
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

const ETAPA_ORDER: Record<Etapa, number> = {
  prospecto: 0,
  cotizado: 1,
  negociacion: 2,
  cerrado_ganado: 3,
  instalado: 4,
  cerrado_perdido: 5,
};

export function sortRows(rows: CotizacionRow[], ui: UIState): CotizacionRow[] {
  const dir = ui.sortDir === "asc" ? 1 : -1;
  const copy = [...rows];
  copy.sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    switch (ui.sortKey) {
      case "actualizadoEn":
        av = a.actualizadoEn ? new Date(a.actualizadoEn).getTime() : 0;
        bv = b.actualizadoEn ? new Date(b.actualizadoEn).getTime() : 0;
        break;
      case "creadoEn":
        av = a.creadoEn ? new Date(a.creadoEn).getTime() : 0;
        bv = b.creadoEn ? new Date(b.creadoEn).getTime() : 0;
        break;
      case "nombre":
        av = a.nombre.toLowerCase();
        bv = b.nombre.toLowerCase();
        break;
      case "totalCliente":
        av = a.totalClienteMXN ?? -Infinity;
        bv = b.totalClienteMXN ?? -Infinity;
        break;
      case "probabilidadCierre":
        av = a.probabilidadCierre ?? -1;
        bv = b.probabilidadCierre ?? -1;
        break;
      case "etapa":
        av = ETAPA_ORDER[a.etapa];
        bv = ETAPA_ORDER[b.etapa];
        break;
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return copy;
}

// ── Formatters ─────────────────────────────────────────────────────────────

export function fmtMXN(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtMXNShort(n: number | null): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function fmtRelative(iso: string | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diffMs = Date.now() - t;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `hace ${days} d`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  if (days < 365) return `hace ${Math.floor(days / 30)} mes`;
  return `hace ${Math.floor(days / 365)} año`;
}

export function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
