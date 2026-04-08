// ── Shared calculation functions ─────────────────────────────────────────────
// Pure functions used by both the Cotizador (page.tsx) and Cliente pages.
// Extracted from page.tsx to avoid duplication.

import type { UtilidadConfig } from "./types";
import type { ReciboCFEData } from "./cotizacion-state";

// ── Constants ────────────────────────────────────────────────────────────────

export const GEN_POR_KWP = 5.5 * 30 * 0.8; // ~132 kWh/kWp/mes
export const KWH_PER_KWP_MES = 132;

// ── Partidas (cost calculation) ─────────────────────────────────────────────

export interface PartidasInput {
  cantidadPaneles: number;
  potenciaW: number;
  precioPorWatt: number;
  fletePaneles: number;
  garantiaPaneles: number;
  tcPaneles: number;
  cantidadMicros: number;
  precioMicroinversor: number;
  precioCable: number;
  precioECU: number;
  incluyeECU: boolean;
  precioHerramienta: number;
  incluyeHerramienta: boolean;
  precioEndCap: number;
  incluyeEndCap: boolean;
  fleteMicros: number;
  tcMicros: number;
  costoAluminioMXN: number;
  fleteAluminio: number;
  costoTornilleriaMXN: number;
  costoGeneralesMXN: number;
}

export interface PartidasResult {
  partidaPanelesMXN: number;
  partidaInversoresMXN: number;
  partidaEstructuraMXN: number;
  partidaTornilleriaMXN: number;
  partidaGeneralesMXN: number;
  subtotalMXN: number;
  ivaMXN: number;
  totalMXN: number;
  // Intermediate values useful for display
  totalPanelesUSD: number;
  totalInversoresUSD: number;
  costoPorPanel: number;
  fleteAluminioSinIVA: number;
}

export function calcularPartidas(input: PartidasInput): PartidasResult {
  const {
    cantidadPaneles, potenciaW, precioPorWatt, fletePaneles, garantiaPaneles, tcPaneles,
    cantidadMicros, precioMicroinversor, precioCable, precioECU, incluyeECU,
    precioHerramienta, incluyeHerramienta, precioEndCap, incluyeEndCap, fleteMicros, tcMicros,
    costoAluminioMXN, fleteAluminio, costoTornilleriaMXN, costoGeneralesMXN,
  } = input;

  const costoPanelesUSD = potenciaW * precioPorWatt * cantidadPaneles;
  const totalPanelesUSD = cantidadPaneles > 0 ? costoPanelesUSD + fletePaneles + garantiaPaneles : 0;
  const partidaPanelesMXN = totalPanelesUSD * tcPaneles;

  const costoMicrosUSD = cantidadMicros * precioMicroinversor;
  const costoCablesUSD = cantidadMicros * precioCable;
  const costoECUUSD = incluyeECU ? precioECU : 0;
  const costoHerramientaUSD = incluyeHerramienta ? precioHerramienta : 0;
  const costoEndCapUSD = incluyeEndCap ? precioEndCap * cantidadMicros : 0;
  const totalInversoresUSD = cantidadPaneles > 0 ? costoMicrosUSD + costoCablesUSD + costoECUUSD + costoHerramientaUSD + costoEndCapUSD + fleteMicros : 0;
  const partidaInversoresMXN = totalInversoresUSD * tcMicros;

  const fleteAluminioSinIVA = fleteAluminio / 1.16;
  const partidaEstructuraMXN = costoAluminioMXN + fleteAluminioSinIVA;
  const partidaTornilleriaMXN = costoTornilleriaMXN;
  const partidaGeneralesMXN = costoGeneralesMXN;

  const subtotalMXN = partidaPanelesMXN + partidaInversoresMXN + partidaEstructuraMXN + partidaTornilleriaMXN + partidaGeneralesMXN;
  const ivaMXN = subtotalMXN * 0.16;
  const totalMXN = subtotalMXN + ivaMXN;
  const costoPorPanel = cantidadPaneles > 0 ? totalMXN / cantidadPaneles : 0;

  return {
    partidaPanelesMXN, partidaInversoresMXN, partidaEstructuraMXN,
    partidaTornilleriaMXN, partidaGeneralesMXN,
    subtotalMXN, ivaMXN, totalMXN,
    totalPanelesUSD, totalInversoresUSD, costoPorPanel,
    fleteAluminioSinIVA,
  };
}

// ── Precio al cliente ───────────────────────────────────────────────────────

export interface PrecioClienteResult {
  clientePanelesMXN: number;
  clienteInversoresMXN: number;
  clienteEstructuraMXN: number;
  clienteTornilleriaMXN: number;
  clienteGeneralesMXN: number;
  clienteSubtotalMXN: number;
  clienteIvaMXN: number;
  clienteTotalMXN: number;
  utilidadNetaMXN: number;
  utilidadNetaPct: number;
  clientePorPanel: number;
  clientePorWatt: number;
}

export function calcularPrecioCliente(
  partidas: PartidasResult,
  utilidad: UtilidadConfig,
  cantidadPaneles: number,
  potenciaW: number,
): PrecioClienteResult {
  const pctPaneles = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.panelesPct;
  const pctInversores = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.inversoresPct;
  const pctEstructura = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.estructuraPct;
  const pctTornilleria = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.tornilleriaPct;
  const pctGenerales = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.generalesPct;

  const clientePanelesMXN = partidas.partidaPanelesMXN * (1 + pctPaneles / 100);
  const clienteInversoresMXN = partidas.partidaInversoresMXN * (1 + pctInversores / 100);
  const clienteEstructuraMXN = partidas.partidaEstructuraMXN * (1 + pctEstructura / 100);
  const clienteTornilleriaMXN = partidas.partidaTornilleriaMXN * (1 + pctTornilleria / 100);
  const clienteGeneralesMXN = partidas.partidaGeneralesMXN * (1 + pctGenerales / 100);
  const clienteSubtotalMXN = clientePanelesMXN + clienteInversoresMXN + clienteEstructuraMXN + clienteTornilleriaMXN + clienteGeneralesMXN + utilidad.montoFijo;
  const clienteIvaMXN = clienteSubtotalMXN * 0.16;
  const clienteTotalMXN = clienteSubtotalMXN + clienteIvaMXN;
  const utilidadNetaMXN = clienteSubtotalMXN - partidas.subtotalMXN;
  const utilidadNetaPct = partidas.subtotalMXN > 0 ? (utilidadNetaMXN / partidas.subtotalMXN) * 100 : 0;
  const clientePorPanel = cantidadPaneles > 0 ? clienteTotalMXN / cantidadPaneles : 0;
  const clientePorWatt = cantidadPaneles > 0 && potenciaW > 0 ? clienteTotalMXN / (cantidadPaneles * potenciaW) : 0;

  return {
    clientePanelesMXN, clienteInversoresMXN, clienteEstructuraMXN,
    clienteTornilleriaMXN, clienteGeneralesMXN,
    clienteSubtotalMXN, clienteIvaMXN, clienteTotalMXN,
    utilidadNetaMXN, utilidadNetaPct, clientePorPanel, clientePorWatt,
  };
}

// ── ROI ─────────────────────────────────────────────────────────────────────

export interface ROIResult {
  kWpSistema: number;
  generacionMensualKwh: number;
  costoCFEporKwh: number;
  ahorroMensualMXN: number;
  ahorroAnualMXN: number;
  roiMeses: number;
  roiAnios: number;
}

export function calcularROI(
  clienteTotalMXN: number,
  reciboCFE: ReciboCFEData | null,
  cantidadPaneles: number,
  potenciaW: number,
): ROIResult {
  const kWpSistema = cantidadPaneles * potenciaW / 1000;
  const generacionMensualKwh = kWpSistema * KWH_PER_KWP_MES;
  const costoCFEporKwh = reciboCFE && reciboCFE.consumoKwh > 0
    ? reciboCFE.totalFacturado / reciboCFE.consumoKwh : 0;
  const ahorroMensualMXN = generacionMensualKwh * costoCFEporKwh;
  const ahorroAnualMXN = ahorroMensualMXN * 12;
  const roiMeses = ahorroMensualMXN > 0 ? clienteTotalMXN / ahorroMensualMXN : 0;
  const roiAnios = roiMeses / 12;

  return { kWpSistema, generacionMensualKwh, costoCFEporKwh, ahorroMensualMXN, ahorroAnualMXN, roiMeses, roiAnios };
}

// ── Sizing from CFE receipt ─────────────────────────────────────────────────

export interface SizingResult {
  consumoMensualCFE: number;
  consumoMensualCalc: number;
  panelesPromedio: number;
  kWpPromedio: number;
  panelesEquilibrado: number;
  kWpEquilibrado: number;
  panelesMax: number;
  kWpMax: number;
  consumoP75: number;
  consumoMensualMax: number;
  maxHistKwh: number;
  panelesSugeridosCFE: number;
  kWpSugerido: number;
  historicoFiltrado: { periodo: string; kwh: number; importe: number }[];
  todosBimestres: number[];
}

export function calcularSizing(
  reciboCFE: ReciboCFEData,
  panelW: number,
  reciboUltimoAnio: boolean,
): SizingResult {
  const consumoMensualCFE = reciboCFE.consumoMensualPromedio > 0
    ? reciboCFE.consumoMensualPromedio
    : Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1));

  const historicoFiltrado = reciboUltimoAnio
    ? reciboCFE.historico.slice(0, 5)
    : reciboCFE.historico;

  const todosBimestres = [reciboCFE.consumoKwh, ...historicoFiltrado.map((h) => h.kwh)];

  const consumoMensualCalc = todosBimestres.length > 0
    ? Math.round(todosBimestres.reduce((s, kwh) => s + kwh, 0) / todosBimestres.length / 2)
    : Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1));

  const panelesPromedio = Math.ceil((consumoMensualCalc / GEN_POR_KWP * 1000) / panelW);
  const kWpPromedio = panelesPromedio * panelW / 1000;

  const maxHistKwh = Math.max(...todosBimestres);
  const consumoMensualMax = Math.round(maxHistKwh / 2);
  const panelesMax = Math.ceil((consumoMensualMax / GEN_POR_KWP * 1000) / panelW);
  const kWpMax = panelesMax * panelW / 1000;

  const todosKwhSorted = [...todosBimestres].sort((a, b) => a - b);
  const p75Index = Math.floor(todosKwhSorted.length * 0.75);
  const consumoP75 = todosKwhSorted.length > 0 ? Math.round(todosKwhSorted[p75Index] / 2) : 0;
  const panelesEquilibrado = Math.ceil((consumoP75 / GEN_POR_KWP * 1000) / panelW);
  const kWpEquilibrado = panelesEquilibrado * panelW / 1000;

  return {
    consumoMensualCFE, consumoMensualCalc,
    panelesPromedio, kWpPromedio,
    panelesEquilibrado, kWpEquilibrado,
    panelesMax, kWpMax,
    consumoP75, consumoMensualMax, maxHistKwh,
    panelesSugeridosCFE: panelesPromedio,
    kWpSugerido: kWpPromedio,
    historicoFiltrado, todosBimestres,
  };
}

// ── Line item sum helper ────────────────────────────────────────────────────

export function sumLineItems(items: { cantidad: string; precioUnitario: string }[]): number {
  return items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0);
}
