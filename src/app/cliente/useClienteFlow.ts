"use client";

import { useReducer, useMemo } from "react";
import type { ReciboCFEData } from "../lib/cotizacion-state";
import { UTILIDAD_DEFAULT, uid } from "../lib/cotizacion-state";
import type { CatalogoPanel, CatalogoMicro, TipoCambioData, UtilidadConfig } from "../lib/types";
import {
  calcularPartidas,
  calcularPrecioCliente,
  calcularROI,
  calcularSizing,
  sumLineItems,
  type PartidasResult,
  type PrecioClienteResult,
  type ROIResult,
  type SizingResult,
} from "../lib/calc-costos";

// ── Default cost line items (same as INITIAL_STATE in cotizacion-state.ts) ──

const ALUMINIO_DEFAULT_SUM = 3 * 700.94 + 3 * 839.34 + 27 * 41.58; // ~5,743.50
const FLETE_ALUMINIO_DEFAULT = 500;
const TORNILLERIA_DEFAULT_SUM = 40 * 3 + 40 * 2 + 40 * 1 + 80.95 + 61.64; // ~382.59
const GENERALES_DEFAULT_SUM = 229 + 589 + 79.80 + 20 * 37.97 + 3000 + 0 + 2500; // ~7,157.20

// ── State ────────────────────────────────────────────────────────────────────

export type ClienteStep = 1 | 2 | 3 | 4;
export type SizingOption = "basica" | "recomendada" | "maxima";

export interface ClienteFlowState {
  step: ClienteStep;
  reciboCFE: ReciboCFEData | null;
  reciboPDFBase64: string | null;
  loadingRecibo: boolean;
  errorRecibo: string;
  reciboUltimoAnio: boolean;
  sizingOption: SizingOption;
  cantidadPaneles: number;
  nombreCliente: string;
  cotizacionId: string;
}

const INITIAL: ClienteFlowState = {
  step: 1,
  reciboCFE: null,
  reciboPDFBase64: null,
  loadingRecibo: false,
  errorRecibo: "",
  reciboUltimoAnio: true,
  sizingOption: "recomendada",
  cantidadPaneles: 0,
  nombreCliente: "",
  cotizacionId: uid(),
};

// ── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_RECIBO"; data: ReciboCFEData; base64: string | null }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "SELECT_SIZING"; option: SizingOption; paneles: number }
  | { type: "SET_CANTIDAD"; cantidad: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; step: ClienteStep }
  | { type: "RESET" };

function reducer(state: ClienteFlowState, action: Action): ClienteFlowState {
  switch (action.type) {
    case "SET_RECIBO":
      return {
        ...state,
        reciboCFE: action.data,
        reciboPDFBase64: action.base64,
        nombreCliente: action.data.nombre || state.nombreCliente,
        loadingRecibo: false,
        errorRecibo: "",
      };
    case "SET_LOADING":
      return { ...state, loadingRecibo: action.loading, errorRecibo: "" };
    case "SET_ERROR":
      return { ...state, errorRecibo: action.error, loadingRecibo: false };
    case "SELECT_SIZING":
      return { ...state, sizingOption: action.option, cantidadPaneles: action.paneles };
    case "SET_CANTIDAD":
      return { ...state, cantidadPaneles: action.cantidad };
    case "NEXT_STEP":
      return { ...state, step: Math.min(state.step + 1, 4) as ClienteStep };
    case "PREV_STEP":
      return { ...state, step: Math.max(state.step - 1, 1) as ClienteStep };
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    case "RESET":
      return { ...INITIAL, cotizacionId: uid() };
    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface ClienteFlowConfig {
  panelSeleccionado: CatalogoPanel | null;
  microSeleccionado: CatalogoMicro | null;
  tc: TipoCambioData | null;
}

export interface ClienteFlowComputed {
  sizing: SizingResult | null;
  partidas: PartidasResult | null;
  precioCliente: PrecioClienteResult | null;
  roi: ROIResult | null;
  panelesPorMicro: number;
  cantidadMicros: number;
  kWpSistema: number;
  generacionMensualKwh: number;
  coberturaPct: number;
}

export function useClienteFlow(config: ClienteFlowConfig) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { panelSeleccionado, microSeleccionado, tc } = config;

  const tcVal = tc?.tipoCambio || 0;
  const panelW = panelSeleccionado?.potencia || 545;
  const panelesPorMicro = microSeleccionado?.panelesPorUnidad ?? 4;
  const utilidad: UtilidadConfig = UTILIDAD_DEFAULT;

  // Sizing from CFE receipt
  const sizing = useMemo<SizingResult | null>(() => {
    if (!state.reciboCFE) return null;
    return calcularSizing(state.reciboCFE, panelW, state.reciboUltimoAnio);
  }, [state.reciboCFE, panelW, state.reciboUltimoAnio]);

  // Auto-set paneles when sizing changes and no manual override
  const cantidadPaneles = state.cantidadPaneles > 0
    ? state.cantidadPaneles
    : (sizing?.panelesEquilibrado ?? 0);

  const cantidadMicros = cantidadPaneles > 0 ? Math.ceil(cantidadPaneles / panelesPorMicro) : 0;
  const kWpSistema = cantidadPaneles * panelW / 1000;
  const generacionMensualKwh = kWpSistema * 132;

  // Consumption coverage %
  const consumoMensual = sizing?.consumoMensualCalc ?? 0;
  const coberturaPct = consumoMensual > 0 ? Math.round((generacionMensualKwh / consumoMensual) * 100) : 0;

  // Cost partidas
  const partidas = useMemo<PartidasResult | null>(() => {
    if (cantidadPaneles <= 0 || tcVal <= 0 || !panelSeleccionado || !microSeleccionado) return null;
    return calcularPartidas({
      cantidadPaneles,
      potenciaW: panelSeleccionado.potencia,
      precioPorWatt: panelSeleccionado.precioPorWatt,
      fletePaneles: 100,
      garantiaPaneles: 20,
      tcPaneles: tcVal,
      cantidadMicros,
      precioMicroinversor: microSeleccionado.precio,
      precioCable: microSeleccionado.precioCable,
      precioECU: 145,
      incluyeECU: true,
      precioHerramienta: 0,
      incluyeHerramienta: false,
      precioEndCap: 5,
      incluyeEndCap: true,
      fleteMicros: 35,
      tcMicros: tcVal,
      costoAluminioMXN: ALUMINIO_DEFAULT_SUM,
      fleteAluminio: FLETE_ALUMINIO_DEFAULT,
      costoTornilleriaMXN: TORNILLERIA_DEFAULT_SUM,
      costoGeneralesMXN: GENERALES_DEFAULT_SUM,
    });
  }, [cantidadPaneles, tcVal, panelSeleccionado, microSeleccionado, cantidadMicros]);

  // Client pricing
  const precioCliente = useMemo<PrecioClienteResult | null>(() => {
    if (!partidas || !panelSeleccionado) return null;
    return calcularPrecioCliente(partidas, utilidad, cantidadPaneles, panelSeleccionado.potencia);
  }, [partidas, utilidad, cantidadPaneles, panelSeleccionado]);

  // ROI
  const roi = useMemo<ROIResult | null>(() => {
    if (!precioCliente || !panelSeleccionado) return null;
    return calcularROI(precioCliente.clienteTotalMXN, state.reciboCFE, cantidadPaneles, panelSeleccionado.potencia);
  }, [precioCliente, state.reciboCFE, cantidadPaneles, panelSeleccionado]);

  const computed: ClienteFlowComputed = {
    sizing, partidas, precioCliente, roi,
    panelesPorMicro, cantidadMicros,
    kWpSistema, generacionMensualKwh, coberturaPct,
  };

  return { state, dispatch, computed, cantidadPaneles, panelW, utilidad };
}
