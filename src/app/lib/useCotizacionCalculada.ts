"use client";

// ── useCotizacionCalculada ─────────────────────────────────────────────────
// Pure computation wrapper. No side effects, no set(), no fetches.
//
// Calls normalizeState() + calc-costos functions + structure/electrical
// calculators, returning all derived values that page.tsx and its
// sub-components need.
//
// Everything here is deterministic: same inputs → same outputs.

import { useMemo } from "react";
import type { CotizacionState } from "./cotizacion-state";
import type { UtilidadConfig } from "./types";
import type { StructureRowInput, StructureCalculationResult } from "./structure";
import { normalizeState, calcularMinisplits, type CotizacionNormalized, type MinisplitResult } from "./normalize";
import {
  calcularPartidas,
  calcularPrecioCliente,
  calcularROI,
  calcularSizing,
  GEN_POR_KWP,
  type PartidasResult,
  type PrecioClienteResult,
  type ROIResult,
  type SizingResult,
} from "./calc-costos";
import { calculateStructure } from "./structure";
import { calculateElectrical } from "./electrical";

// ── Input type ─────────────────────────────────────────────────────────────

export interface UseCotizacionCalculadaInput {
  state: CotizacionState;
  utilidad: UtilidadConfig;
  structureRows: StructureRowInput[];
  electricalProfileId: string;
}

// ── Output type ────────────────────────────────────────────────────────────

export interface UseCotizacionCalculadaResult {
  // Normalized values (all numbers)
  n: CotizacionNormalized;

  // Convenience aliases (most-used normalized values, avoids n.xxx everywhere)
  cantidadNum: number;
  potenciaNum: number;
  precioNum: number;
  fletePanelesNum: number;
  garantiaPanelesNum: number;
  precioMicroNum: number;
  precioCableNum: number;
  precioECUNum: number;
  precioHerramientaNum: number;
  precioEndCapNum: number;
  fleteMicrosNum: number;
  fleteAluminioNum: number;
  panelesPorMicro: number;
  cantidadMicros: number;
  costoPanel: number;
  costoPanelesUSD: number;
  costoMicrosUSD: number;
  costoCablesUSD: number;
  costoECUUSD: number;
  costoHerramientaUSD: number;
  costoEndCapUSD: number;
  costoAluminioMXN: number;
  costoTornilleriaMXN: number;
  costoGeneralesMXN: number;
  tcLive: number;
  tcVal: number;
  tcPaneles: number;
  tcMicros: number;
  panelW: number;

  // Cost partidas
  partidas: PartidasResult;
  partidaPanelesMXN: number;
  partidaInversoresMXN: number;
  partidaEstructuraMXN: number;
  partidaTornilleriaMXN: number;
  partidaGeneralesMXN: number;
  subtotalMXN: number;
  ivaMXN: number;
  totalMXN: number;
  totalPanelesUSD: number;
  totalInversoresUSD: number;
  costoPorPanel: number;
  fleteAluminioSinIVA: number;

  // Client pricing
  precioCliente: PrecioClienteResult;
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

  // ROI
  roi: ROIResult;
  kWpSistema: number;
  generacionMensualKwh: number;
  costoCFEporKwh: number;
  ahorroMensualMXN: number;
  ahorroAnualMXN: number;
  roiMeses: number;
  roiAnios: number;

  // Sizing
  sizing: SizingResult | null;
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

  // Minisplits
  minisplitKwhMes: number;
  minisplitKwhMesProm: number;
  consumoConIncremento: number;
  panelesConIncremento: number;
  kWpConIncremento: number;

  // Structure & Electrical
  structureResult: StructureCalculationResult | null;
  electricalResult: ReturnType<typeof calculateElectrical> | null;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCotizacionCalculada({
  state: s,
  utilidad,
  structureRows,
  electricalProfileId,
}: UseCotizacionCalculadaInput): UseCotizacionCalculadaResult {
  // ── Normalize: strings → numbers ───────────────────────────────────────
  const n = normalizeState(s);

  // ── Structure & Electrical (memoized because they're heavier) ──────────
  const structureResult = useMemo(
    () => (structureRows.length > 0 ? calculateStructure(structureRows) : null),
    [structureRows],
  );

  const electricalResult = useMemo(
    () => n.cantidadMicros > 0 ? calculateElectrical({
      equipmentProfileId: electricalProfileId,
      cantidadEquipos: n.cantidadMicros,
      cantidadPaneles: n.cantidadPaneles,
    }) : null,
    [electricalProfileId, n.cantidadMicros, n.cantidadPaneles],
  );

  // ── Cost calculations ─────────────────────────────────────────────────
  const partidas = calcularPartidas({
    cantidadPaneles: n.cantidadPaneles,
    potenciaW: n.potenciaW,
    precioPorWatt: n.precioPorWatt,
    fletePaneles: n.fletePaneles,
    garantiaPaneles: n.garantiaPaneles,
    tcPaneles: n.tcPaneles,
    cantidadMicros: n.cantidadMicros,
    precioMicroinversor: n.precioMicroinversor,
    precioCable: n.precioCable,
    precioECU: n.precioECU,
    incluyeECU: n.incluyeECU,
    precioHerramienta: n.precioHerramienta,
    incluyeHerramienta: n.incluyeHerramienta,
    precioEndCap: n.precioEndCap,
    incluyeEndCap: n.incluyeEndCap,
    fleteMicros: n.fleteMicros,
    tcMicros: n.tcMicros,
    costoAluminioMXN: n.costoAluminioMXN,
    fleteAluminio: n.fleteAluminio,
    costoTornilleriaMXN: n.costoTornilleriaMXN,
    costoGeneralesMXN: n.costoGeneralesMXN,
  });

  // ── Client pricing ────────────────────────────────────────────────────
  const precioCliente = calcularPrecioCliente(partidas, utilidad, n.cantidadPaneles, n.potenciaW);

  // ── ROI ────────────────────────────────────────────────────────────────
  const roi = calcularROI(precioCliente.clienteTotalMXN, s.reciboCFE, n.cantidadPaneles, n.potenciaW);

  // ── CFE Sizing ─────────────────────────────────────────────────────────
  const sizing = s.reciboCFE ? calcularSizing(s.reciboCFE, n.panelW, s.reciboUltimoAnio) : null;

  // ── Minisplits ─────────────────────────────────────────────────────────
  const ms: MinisplitResult = calcularMinisplits(s.minisplits, s.minisplitTemporada);
  const consumoMensualCalc = sizing?.consumoMensualCalc ?? 0;
  const consumoConIncremento = consumoMensualCalc + ms.minisplitKwhMesProm;
  const panelesConIncremento = s.reciboCFE ? Math.ceil((consumoConIncremento / GEN_POR_KWP * 1000) / n.panelW) : 0;
  const kWpConIncremento = panelesConIncremento * n.panelW / 1000;

  // ── Return flat structure ──────────────────────────────────────────────
  return {
    n,

    // Convenience aliases
    cantidadNum: n.cantidadPaneles,
    potenciaNum: n.potenciaW,
    precioNum: n.precioPorWatt,
    fletePanelesNum: n.fletePaneles,
    garantiaPanelesNum: n.garantiaPaneles,
    precioMicroNum: n.precioMicroinversor,
    precioCableNum: n.precioCable,
    precioECUNum: n.precioECU,
    precioHerramientaNum: n.precioHerramienta,
    precioEndCapNum: n.precioEndCap,
    fleteMicrosNum: n.fleteMicros,
    fleteAluminioNum: n.fleteAluminio,
    panelesPorMicro: n.panelesPorMicro,
    cantidadMicros: n.cantidadMicros,
    costoPanel: n.costoPanel,
    costoPanelesUSD: n.costoPanelesUSD,
    costoMicrosUSD: n.costoMicrosUSD,
    costoCablesUSD: n.costoCablesUSD,
    costoECUUSD: n.costoECUUSD,
    costoHerramientaUSD: n.costoHerramientaUSD,
    costoEndCapUSD: n.costoEndCapUSD,
    costoAluminioMXN: n.costoAluminioMXN,
    costoTornilleriaMXN: n.costoTornilleriaMXN,
    costoGeneralesMXN: n.costoGeneralesMXN,
    tcLive: n.tcLive,
    tcVal: n.tcVal,
    tcPaneles: n.tcPaneles,
    tcMicros: n.tcMicros,
    panelW: n.panelW,

    // Partidas
    partidas,
    partidaPanelesMXN: partidas.partidaPanelesMXN,
    partidaInversoresMXN: partidas.partidaInversoresMXN,
    partidaEstructuraMXN: partidas.partidaEstructuraMXN,
    partidaTornilleriaMXN: partidas.partidaTornilleriaMXN,
    partidaGeneralesMXN: partidas.partidaGeneralesMXN,
    subtotalMXN: partidas.subtotalMXN,
    ivaMXN: partidas.ivaMXN,
    totalMXN: partidas.totalMXN,
    totalPanelesUSD: partidas.totalPanelesUSD,
    totalInversoresUSD: partidas.totalInversoresUSD,
    costoPorPanel: partidas.costoPorPanel,
    fleteAluminioSinIVA: partidas.fleteAluminioSinIVA,

    // Client pricing
    precioCliente,
    clientePanelesMXN: precioCliente.clientePanelesMXN,
    clienteInversoresMXN: precioCliente.clienteInversoresMXN,
    clienteEstructuraMXN: precioCliente.clienteEstructuraMXN,
    clienteTornilleriaMXN: precioCliente.clienteTornilleriaMXN,
    clienteGeneralesMXN: precioCliente.clienteGeneralesMXN,
    clienteSubtotalMXN: precioCliente.clienteSubtotalMXN,
    clienteIvaMXN: precioCliente.clienteIvaMXN,
    clienteTotalMXN: precioCliente.clienteTotalMXN,
    utilidadNetaMXN: precioCliente.utilidadNetaMXN,
    utilidadNetaPct: precioCliente.utilidadNetaPct,
    clientePorPanel: precioCliente.clientePorPanel,
    clientePorWatt: precioCliente.clientePorWatt,

    // ROI
    roi,
    kWpSistema: roi.kWpSistema,
    generacionMensualKwh: roi.generacionMensualKwh,
    costoCFEporKwh: roi.costoCFEporKwh,
    ahorroMensualMXN: roi.ahorroMensualMXN,
    ahorroAnualMXN: roi.ahorroAnualMXN,
    roiMeses: roi.roiMeses,
    roiAnios: roi.roiAnios,

    // Sizing
    sizing,
    consumoMensualCFE: sizing?.consumoMensualCFE ?? 0,
    consumoMensualCalc,
    panelesPromedio: sizing?.panelesPromedio ?? 0,
    kWpPromedio: sizing?.kWpPromedio ?? 0,
    panelesEquilibrado: sizing?.panelesEquilibrado ?? 0,
    kWpEquilibrado: sizing?.kWpEquilibrado ?? 0,
    panelesMax: sizing?.panelesMax ?? 0,
    kWpMax: sizing?.kWpMax ?? 0,
    consumoP75: sizing?.consumoP75 ?? 0,
    consumoMensualMax: sizing?.consumoMensualMax ?? 0,
    maxHistKwh: sizing?.maxHistKwh ?? 0,
    panelesSugeridosCFE: sizing?.panelesPromedio ?? 0,
    kWpSugerido: sizing?.kWpPromedio ?? 0,
    historicoFiltrado: sizing?.historicoFiltrado ?? [],
    todosBimestres: sizing?.todosBimestres ?? [],

    // Minisplits
    minisplitKwhMes: ms.minisplitKwhMes,
    minisplitKwhMesProm: ms.minisplitKwhMesProm,
    consumoConIncremento,
    panelesConIncremento,
    kWpConIncremento,

    // Structure & Electrical
    structureResult,
    electricalResult,
  };
}
