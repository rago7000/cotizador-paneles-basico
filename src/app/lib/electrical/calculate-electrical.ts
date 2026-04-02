import type { ElectricalInput, ElectricalResult, EquipmentProfile } from "./types";
import { getProfile } from "./profiles";
import {
  getAmperajeTotal,
  getAmperajeConTolerancia,
  distribuirUnidadesPorCircuito,
  calcularCircuito,
  calcularStringConfig,
} from "./rules";

/**
 * Main orchestrator: calculates all electrical requirements for an installation.
 *
 * Works with any equipment profile — microinverters, string inverters, hybrid inverters.
 */
export function calculateElectrical(input: ElectricalInput): ElectricalResult;
export function calculateElectrical(input: ElectricalInput, customProfile: EquipmentProfile): ElectricalResult;
export function calculateElectrical(
  input: ElectricalInput,
  customProfile?: EquipmentProfile,
): ElectricalResult {
  const warnings: string[] = [];

  // Resolve profile
  const perfil = customProfile ?? getProfile(input.equipmentProfileId);
  if (!perfil) {
    return emptyResult(input, warnings, `Perfil de equipo no encontrado: ${input.equipmentProfileId}`);
  }

  const { cantidadEquipos } = input;

  if (cantidadEquipos <= 0) {
    return emptyResult(input, warnings, "Cantidad de equipos debe ser mayor a 0", perfil);
  }

  // ── Circuit distribution ──
  const unidadesPorCircuito = distribuirUnidadesPorCircuito(
    cantidadEquipos,
    perfil.maxUnidadesPorCircuito,
  );

  const circuitos = unidadesPorCircuito.map((unidades, i) =>
    calcularCircuito(i + 1, unidades, perfil),
  );

  // Collect circuit warnings
  for (const c of circuitos) {
    warnings.push(...c.warnings);
  }

  // ── Breaker summary ──
  const breakerCounts: Record<number, number> = {};
  for (const c of circuitos) {
    if (c.breakerSeleccionado > 0) {
      breakerCounts[c.breakerSeleccionado] = (breakerCounts[c.breakerSeleccionado] || 0) + 1;
    }
  }
  const breakerResumen = Object.entries(breakerCounts)
    .map(([amp, qty]) => ({ amperaje: Number(amp), cantidad: qty }))
    .sort((a, b) => a.amperaje - b.amperaje);

  // ── Cable summary ──
  const cableCounts: Record<string, { tipo: string; calibreAWG: number; circuitos: number }> = {};
  for (const c of circuitos) {
    const key = c.tipoCable;
    if (!cableCounts[key]) {
      cableCounts[key] = { tipo: c.tipoCable, calibreAWG: c.calibreCableAWG, circuitos: 0 };
    }
    cableCounts[key].circuitos++;
  }
  const cableACResumen = Object.values(cableCounts);

  // ── Amperage totals ──
  const amperajeTotalAC = getAmperajeTotal(perfil.amperajeACPorUnidad, cantidadEquipos);
  const amperajeTotalConTolerancia = getAmperajeConTolerancia(amperajeTotalAC, perfil.toleranciaBreaker);

  // ── String config (string/hybrid inverters only) ──
  let stringConfig: ElectricalResult["stringConfig"];
  if (
    (perfil.tipo === "inversor_string" || perfil.tipo === "inversor_hibrido") &&
    input.cantidadPaneles
  ) {
    stringConfig = calcularStringConfig(perfil, input.cantidadPaneles);
    for (const sc of stringConfig) {
      warnings.push(...sc.warnings);
    }
  }

  // ── DC Disconnect ──
  let desconectorDC: ElectricalResult["desconectorDC"];
  if (perfil.requiereDesconectorDC && perfil.amperajeDesconectorDC) {
    desconectorDC = {
      requerido: true,
      amperaje: perfil.amperajeDesconectorDC,
    };
  }

  // ── Grounding ──
  let tierraFisica: ElectricalResult["tierraFisica"];
  if (perfil.requiereTierraFisica && perfil.calibreTierra) {
    tierraFisica = {
      requerida: true,
      calibreAWG: perfil.calibreTierra,
    };
  }

  // ── Cable distance estimate ──
  let metrosCableACEstimado: number | undefined;
  if (input.distanciaMetros && input.distanciaMetros > 0) {
    // Each circuit needs its own cable run
    metrosCableACEstimado = circuitos.length * input.distanciaMetros;
  }

  return {
    perfil,
    cantidadEquipos,
    totalCircuitos: circuitos.length,
    circuitos,
    totalBreakers: circuitos.length,
    breakerResumen,
    cableACResumen,
    metrosCableACEstimado,
    stringConfig,
    desconectorDC,
    tierraFisica,
    amperajeTotalAC,
    amperajeTotalConTolerancia,
    warnings,
  };
}

function emptyResult(
  input: ElectricalInput,
  warnings: string[],
  error: string,
  perfil?: EquipmentProfile,
): ElectricalResult {
  warnings.push(error);
  return {
    perfil: perfil ?? ({} as EquipmentProfile),
    cantidadEquipos: input.cantidadEquipos,
    totalCircuitos: 0,
    circuitos: [],
    totalBreakers: 0,
    breakerResumen: [],
    cableACResumen: [],
    amperajeTotalAC: 0,
    amperajeTotalConTolerancia: 0,
    warnings,
  };
}
