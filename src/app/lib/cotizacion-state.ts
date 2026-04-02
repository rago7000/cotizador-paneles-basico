// ── Cotización State: reducer, types, and serialization ──────────────────────
//
// Replaces 42 individual useState calls in page.tsx with a single useReducer.
// The state shape is flat — logical groups exist as comments only.

import type {
  CotizacionData,
  LineItem,
  TipoCambioData,
  CatalogoPanel,
  CatalogoMicro,
  UtilidadConfig,
} from "./types";
import type { StructureRowInput } from "./structure";
import type { ArrangementResult } from "./structure/generate-arrangements";

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ── ReciboCFE type (moved from page.tsx) ─────────────────────────────────────

export interface ReciboCFEData {
  nombre: string;
  direccion: string;
  noServicio: string;
  tarifa: string;
  periodoInicio: string;
  periodoFin: string;
  diasPeriodo: number;
  consumoKwh: number;
  consumoMensualPromedio: number;
  totalFacturado: number;
  historico: { periodo: string; kwh: number; importe: number }[];
}

// ── Minisplit type (moved from page.tsx) ─────────────────────────────────────

export interface Minisplit {
  id: string;
  cantidad: number;
  toneladas: string;
  horasDia: number;
  tipo: "inverter" | "convencional";
}

// ── State ────────────────────────────────────────────────────────────────────

export interface CotizacionState {
  // ── Paneles ──
  cantidad: string;
  potencia: string;
  precioPorWatt: string;
  fletePaneles: string;
  garantiaPaneles: string;

  // ── Microinversores ──
  precioMicroinversor: string;
  precioCable: string;
  precioECU: string;
  incluyeECU: boolean;
  precioHerramienta: string;
  incluyeHerramienta: boolean;
  fleteMicros: string;

  // ── Estructura ──
  aluminio: LineItem[];
  fleteAluminio: string;
  structureRows: StructureRowInput[];
  showStructure: boolean;
  electricalProfileId: string;
  showElectrical: boolean;

  // ── Auto-cotización ──
  structureMode: "conservador" | "optimo" | "manual";
  autoArrangements: ArrangementResult | null;

  // ── Tornillería ──
  tornilleria: LineItem[];

  // ── Generales ──
  generales: LineItem[];

  // ── Tipo de cambio ──
  tc: TipoCambioData | null;
  tcError: string;
  tcFrozen: boolean;
  tcManual: boolean;
  tcSnapshotLocal: string;
  tcUsarManana: boolean;
  tcCustomPaneles: string;
  tcCustomMicros: string;

  // ── Cotización meta ──
  nombreCotizacion: string;
  mostrarGuardadas: boolean;
  mostrarPDF: boolean;
  msgGuardado: "ok" | "err" | "";

  // ── Picker / Catálogo ──
  pickerPanel: boolean;
  pickerMicro: boolean;
  pickerSearch: string;
  pickerMarca: string;
  pickerOrden: "nombre" | "potencia" | "precio";
  sugerirGuardarPanel: boolean;
  sugerirGuardarMicro: boolean;
  panelSeleccionado: CatalogoPanel | null;
  microSeleccionado: CatalogoMicro | null;

  // ── Recibo CFE ──
  reciboCFE: ReciboCFEData | null;
  loadingRecibo: boolean;
  errorRecibo: string;
  reciboDetalle: boolean;
  reciboPDFBase64: string | null;
  reciboUltimoAnio: boolean;

  // ── Minisplits ──
  minisplits: Minisplit[];
  minisplitTemporada: "anual" | "temporada";

  // ── Utilidad / Precio al cliente ──
  mostrarPrecioCliente: boolean;
  utilidad: UtilidadConfig;
  nombreVariante: string;
  mostrarVariantes: boolean;
  mostrarPDFCliente: boolean;
  mostrarComparador: boolean;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const aluminioDefault: LineItem[] = [
  { id: uid(), nombre: "Angulo - 1 1/2 X 1 1/2 X 0.1875\" (3/16)", cantidad: "3", precioUnitario: "700.94", unidad: "Pza" },
  { id: uid(), nombre: "Unicanal - PARA PANEL SOLAR GRANDE", cantidad: "3", precioUnitario: "839.34", unidad: "Pza" },
  { id: uid(), nombre: "Clip - PARA PANEL SOLAR", cantidad: "27", precioUnitario: "41.58", unidad: "Pza" },
];

const tornilleriaDefault: LineItem[] = [
  { id: uid(), nombre: "Tornillo acero inox (largo: ..)", cantidad: "40", precioUnitario: "3.00", unidad: "Pza" },
  { id: uid(), nombre: "Tuerca de presion - Acero inox.", cantidad: "40", precioUnitario: "2.00", unidad: "Pza" },
  { id: uid(), nombre: "Guasa de presion - Acero inox.", cantidad: "40", precioUnitario: "1.00", unidad: "Pza" },
  { id: uid(), nombre: "Guasa grande (microinversores)", cantidad: "1", precioUnitario: "80.95", unidad: "Lote" },
  { id: uid(), nombre: "Pijas con taquete", cantidad: "1", precioUnitario: "61.64", unidad: "Lote" },
];

const generalesDefault: LineItem[] = [
  { id: uid(), nombre: "Centro de carga (p/1 pastilla doble)", cantidad: "1", precioUnitario: "229.00", unidad: "Pza" },
  { id: uid(), nombre: "Pastilla 2 polos (15 amp)", cantidad: "1", precioUnitario: "589.00", unidad: "Pza" },
  { id: uid(), nombre: "Cemento plastico", cantidad: "1", precioUnitario: "79.80", unidad: "Lote" },
  { id: uid(), nombre: "Cable de uso rudo", cantidad: "20", precioUnitario: "37.97", unidad: "mL" },
  { id: uid(), nombre: "Instalacion - Precio base", cantidad: "1", precioUnitario: "3000.00", unidad: "Lote" },
  { id: uid(), nombre: "Instalacion - Paneles adicionales", cantidad: "0", precioUnitario: "150.00", unidad: "Pza" },
  { id: uid(), nombre: "Instalacion - Vueltas gasolina", cantidad: "1", precioUnitario: "2500.00", unidad: "Pza" },
];

export const UTILIDAD_DEFAULT: UtilidadConfig = {
  tipo: "global",
  globalPct: 25,
  panelesPct: 25,
  inversoresPct: 25,
  estructuraPct: 25,
  tornilleriaPct: 25,
  generalesPct: 25,
  montoFijo: 0,
};

export const INITIAL_STATE: CotizacionState = {
  // Paneles
  cantidad: "",
  potencia: "",
  precioPorWatt: "",
  fletePaneles: "100",
  garantiaPaneles: "20",
  // Microinversores
  precioMicroinversor: "",
  precioCable: "",
  precioECU: "145",
  incluyeECU: true,
  precioHerramienta: "",
  incluyeHerramienta: false,
  fleteMicros: "35",
  // Estructura
  aluminio: aluminioDefault,
  fleteAluminio: "500",
  structureRows: [],
  showStructure: false,
  electricalProfileId: "apsystems-ds3d",
  showElectrical: false,
  structureMode: "conservador",
  autoArrangements: null,
  // Tornillería
  tornilleria: tornilleriaDefault,
  // Generales
  generales: generalesDefault,
  // Tipo de cambio
  tc: null,
  tcError: "",
  tcFrozen: false,
  tcManual: false,
  tcSnapshotLocal: "",
  tcUsarManana: false,
  tcCustomPaneles: "",
  tcCustomMicros: "",
  // Cotización meta
  nombreCotizacion: "",
  mostrarGuardadas: false,
  mostrarPDF: false,
  msgGuardado: "",
  // Picker
  pickerPanel: false,
  pickerMicro: false,
  pickerSearch: "",
  pickerMarca: "",
  pickerOrden: "nombre",
  sugerirGuardarPanel: false,
  sugerirGuardarMicro: false,
  panelSeleccionado: null,
  microSeleccionado: null,
  // Recibo CFE
  reciboCFE: null,
  loadingRecibo: false,
  errorRecibo: "",
  reciboDetalle: false,
  reciboPDFBase64: null,
  reciboUltimoAnio: true,
  // Minisplits
  minisplits: [],
  minisplitTemporada: "temporada",
  // Utilidad
  mostrarPrecioCliente: false,
  utilidad: UTILIDAD_DEFAULT,
  nombreVariante: "",
  mostrarVariantes: false,
  mostrarPDFCliente: false,
  mostrarComparador: false,
};

// ── Actions ──────────────────────────────────────────────────────────────────

type LineItemList = "aluminio" | "tornilleria" | "generales";

export type CotizacionAction =
  | { type: "SET_FIELD"; field: keyof CotizacionState; value: CotizacionState[keyof CotizacionState] }
  | { type: "SET_FIELDS"; fields: Partial<CotizacionState> }
  | { type: "LOAD_COTIZACION"; data: CotizacionData }
  | { type: "UPDATE_LINE_ITEM"; list: LineItemList; index: number; field: keyof LineItem; value: string }
  | { type: "ADD_MINISPLIT" }
  | { type: "REMOVE_MINISPLIT"; id: string }
  | { type: "UPDATE_MINISPLIT"; id: string; field: keyof Minisplit; value: string | number }
  | { type: "RESET" };

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Ensure every line item has an id (backward compat for saved cotizaciones) */
function ensureIds(items: LineItem[]): LineItem[] {
  return items.map((it) => it.id ? it : { ...it, id: uid() });
}

// ── Reducer ──────────────────────────────────────────────────────────────────

export function cotizacionReducer(
  state: CotizacionState,
  action: CotizacionAction,
): CotizacionState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };

    case "SET_FIELDS":
      return { ...state, ...action.fields };

    case "LOAD_COTIZACION": {
      const d = action.data;
      return {
        ...state,
        // Paneles
        cantidad: d.cantidad ?? "",
        potencia: d.potencia ?? "",
        precioPorWatt: d.precioPorWatt ?? "",
        fletePaneles: d.fletePaneles ?? "100",
        garantiaPaneles: d.garantiaPaneles ?? "20",
        // Microinversores
        precioMicroinversor: d.precioMicroinversor ?? "",
        precioCable: d.precioCable ?? "",
        precioECU: d.precioECU ?? "145",
        incluyeECU: d.incluyeECU ?? true,
        precioHerramienta: d.precioHerramienta ?? "",
        incluyeHerramienta: d.incluyeHerramienta ?? false,
        fleteMicros: d.fleteMicros ?? "35",
        // Estructura
        aluminio: ensureIds(d.aluminio ?? aluminioDefault),
        fleteAluminio: d.fleteAluminio ?? "500",
        // Tornillería
        tornilleria: ensureIds(d.tornilleria ?? tornilleriaDefault),
        // Generales
        generales: ensureIds(d.generales ?? generalesDefault),
        // Tipo de cambio
        tcCustomPaneles: d.tcCustomPaneles ?? "",
        tcCustomMicros: d.tcCustomMicros ?? "",
        tcFrozen: d.tcFrozen ?? false,
        tcSnapshotLocal: d.tcSnapshot ?? "",
        // Cotización meta
        nombreCotizacion: d.nombre ?? "",
        // Recibo CFE
        reciboCFE: d.reciboCFE ?? null,
        reciboPDFBase64: d.reciboPDFBase64 ?? null,
        // Minisplits
        minisplits: d.minisplits ?? [],
        minisplitTemporada: d.minisplitTemporada ?? "temporada",
        // Utilidad
        mostrarPrecioCliente: !!d.utilidad,
        utilidad: d.utilidad ?? UTILIDAD_DEFAULT,
        // Reset UI flags on load
        reciboDetalle: false,
        mostrarGuardadas: false,
        structureMode: "conservador",
        autoArrangements: null,
      };
    }

    case "UPDATE_LINE_ITEM": {
      const { list, index, field, value } = action;
      const items = [...state[list]];
      items[index] = { ...items[index], [field]: value };
      return { ...state, [list]: items };
    }

    case "ADD_MINISPLIT":
      return {
        ...state,
        minisplits: [
          ...state.minisplits,
          { id: uid(), cantidad: 1, toneladas: "1", horasDia: 8, tipo: "inverter" as const },
        ],
      };

    case "REMOVE_MINISPLIT":
      return {
        ...state,
        minisplits: state.minisplits.filter((m) => m.id !== action.id),
      };

    case "UPDATE_MINISPLIT":
      return {
        ...state,
        minisplits: state.minisplits.map((m) =>
          m.id === action.id ? { ...m, [action.field]: action.value } : m,
        ),
      };

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

// ── Serialization: state → CotizacionData ────────────────────────────────────

export function stateToFormData(state: CotizacionState): CotizacionData {
  const tcLive = state.tc
    ? (state.tcUsarManana && state.tc.tipoCambioAlt ? state.tc.tipoCambioAlt : state.tc.tipoCambio)
    : 0;

  return {
    nombre: state.nombreCotizacion,
    fecha: new Date().toISOString(),
    tcCustomPaneles: state.tcCustomPaneles,
    tcCustomMicros: state.tcCustomMicros,
    tcSnapshot: (state.tcFrozen || state.tcManual) ? state.tcSnapshotLocal : String(tcLive),
    tcFrozen: state.tcFrozen || state.tcManual,
    cantidad: state.cantidad,
    potencia: state.potencia,
    precioPorWatt: state.precioPorWatt,
    fletePaneles: state.fletePaneles,
    garantiaPaneles: state.garantiaPaneles,
    precioMicroinversor: state.precioMicroinversor,
    precioCable: state.precioCable,
    precioECU: state.precioECU,
    incluyeECU: state.incluyeECU,
    precioHerramienta: state.precioHerramienta,
    incluyeHerramienta: state.incluyeHerramienta,
    fleteMicros: state.fleteMicros,
    aluminio: state.aluminio,
    fleteAluminio: state.fleteAluminio,
    tornilleria: state.tornilleria,
    generales: state.generales,
    panelCatalogoId: state.panelSeleccionado?.id,
    microCatalogoId: state.microSeleccionado?.id,
    reciboCFE: state.reciboCFE,
    reciboPDFBase64: state.reciboPDFBase64,
    minisplits: state.minisplits.length > 0 ? state.minisplits : undefined,
    minisplitTemporada: state.minisplits.length > 0 ? state.minisplitTemporada : undefined,
    utilidad: state.mostrarPrecioCliente ? state.utilidad : undefined,
  };
}
