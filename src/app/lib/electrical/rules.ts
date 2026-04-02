// ── Pure electrical calculation rules ────────────────────────────────────────

import type { EquipmentProfile, CableRule, CircuitResult, StringConfig } from "./types";

// ── Breaker / Circuit Rules ─────────────────────────────────────────────────

/** Total AC amperage for N units */
export function getAmperajeTotal(amperajePorUnidad: number, cantidad: number): number {
  return amperajePorUnidad * cantidad;
}

/** Amperage with NEC tolerance (typically ×1.25) */
export function getAmperajeConTolerancia(amperaje: number, tolerancia: number): number {
  return amperaje * tolerancia;
}

/** Number of circuits needed: ceil(totalUnits / maxPerCircuit) */
export function getCantidadCircuitos(totalUnidades: number, maxPorCircuito: number): number {
  if (maxPorCircuito <= 0) return 0;
  return Math.ceil(totalUnidades / maxPorCircuito);
}

/** Distribute units across circuits as evenly as possible.
 *  Returns array of unit counts per circuit.
 *  E.g. 7 units, max 3 per circuit → [3, 3, 1] (but balanced: [3, 2, 2])
 *  We balance to avoid one circuit with very few units.
 */
export function distribuirUnidadesPorCircuito(
  totalUnidades: number,
  maxPorCircuito: number,
): number[] {
  if (totalUnidades <= 0 || maxPorCircuito <= 0) return [];
  const numCircuitos = Math.ceil(totalUnidades / maxPorCircuito);
  const base = Math.floor(totalUnidades / numCircuitos);
  const remainder = totalUnidades % numCircuitos;

  const circuits: number[] = [];
  for (let i = 0; i < numCircuitos; i++) {
    // Distribute remainder to first circuits
    circuits.push(base + (i < remainder ? 1 : 0));
  }
  return circuits;
}

/** Select the smallest breaker that covers the amperage with tolerance.
 *  Allows up to +5% tolerance on breaker selection.
 *  Returns -1 if no breaker covers it.
 */
export function seleccionarBreaker(
  amperajeConTolerancia: number,
  breakersDisponibles: number[],
): number {
  const sorted = [...breakersDisponibles].sort((a, b) => a - b);
  for (const breaker of sorted) {
    // Allow up to 5% over breaker rating
    if (amperajeConTolerancia <= breaker * 1.05) {
      return breaker;
    }
  }
  return -1; // no breaker covers the load
}

// ── Cable Rules ─────────────────────────────────────────────────────────────

/** Select cable for a circuit based on units in that circuit.
 *  Returns the matching cable rule, or undefined if none matches.
 */
export function seleccionarCable(
  unidadesEnCircuito: number,
  cableRules: CableRule[],
): CableRule | undefined {
  // Rules are sorted by maxUnidades ascending — find first that covers
  const sorted = [...cableRules].sort((a, b) => a.maxUnidades - b.maxUnidades);
  for (const rule of sorted) {
    if (unidadesEnCircuito <= rule.maxUnidades) {
      return rule;
    }
  }
  // If units exceed all rules, use the thickest cable (last rule)
  return sorted[sorted.length - 1];
}

/** Calculate a complete circuit result */
export function calcularCircuito(
  circuitoNumero: number,
  unidadesEnCircuito: number,
  profile: EquipmentProfile,
): CircuitResult {
  const warnings: string[] = [];

  const amperajeCircuito = getAmperajeTotal(profile.amperajeACPorUnidad, unidadesEnCircuito);
  const amperajeConTolerancia = getAmperajeConTolerancia(amperajeCircuito, profile.toleranciaBreaker);
  const breakerSeleccionado = seleccionarBreaker(amperajeConTolerancia, profile.breakersDisponibles);

  if (breakerSeleccionado === -1) {
    warnings.push(
      `Circuito ${circuitoNumero}: ${amperajeConTolerancia.toFixed(1)}A excede todos los breakers disponibles (max ${Math.max(...profile.breakersDisponibles)}A)`,
    );
  }

  const cableRule = seleccionarCable(unidadesEnCircuito, profile.cableRulesAC);
  const calibreCableAWG = cableRule?.calibreAWG ?? 0;
  const tipoCable = cableRule?.tipoUsoRudo ?? "No definido";

  if (!cableRule) {
    warnings.push(`Circuito ${circuitoNumero}: no hay regla de cable definida para ${unidadesEnCircuito} unidades`);
  }

  return {
    circuitoNumero,
    unidadesEnCircuito,
    amperajeCircuito,
    amperajeConTolerancia,
    breakerSeleccionado: breakerSeleccionado === -1 ? 0 : breakerSeleccionado,
    calibreCableAWG,
    tipoCable,
    warnings,
  };
}

// ── String Configuration (for string/hybrid inverters) ──────────────────────

/** Calculate string configuration for a string/hybrid inverter */
export function calcularStringConfig(
  profile: EquipmentProfile,
  totalPaneles: number,
): StringConfig[] {
  if (!profile.mpptInputs || !profile.maxPanelesString) return [];

  const maxStrings = profile.mpptInputs * (profile.maxStringsPorMPPT ?? 1);
  const totalStrings = Math.min(
    Math.ceil(totalPaneles / profile.maxPanelesString),
    maxStrings,
  );

  if (totalStrings === 0) return [];

  const panelesPorString = Math.ceil(totalPaneles / totalStrings);
  const configs: StringConfig[] = [];

  let panelesRestantes = totalPaneles;
  let stringNum = 0;

  for (let mppt = 1; mppt <= profile.mpptInputs; mppt++) {
    const stringsEnMPPT = Math.min(
      profile.maxStringsPorMPPT ?? 1,
      Math.ceil(panelesRestantes / panelesPorString),
    );

    if (stringsEnMPPT === 0 || panelesRestantes <= 0) break;

    const warnings: string[] = [];
    const panelesEnEsteMPPT = Math.min(panelesRestantes, stringsEnMPPT * panelesPorString);

    const panelesPorStringReal = Math.ceil(panelesEnEsteMPPT / stringsEnMPPT);
    if (panelesPorStringReal > profile.maxPanelesString) {
      warnings.push(`MPPT ${mppt}: ${panelesPorStringReal} paneles/string excede máximo ${profile.maxPanelesString}`);
    }

    const calibreDC = profile.cableRulesDC?.[0]?.calibreAWG;

    configs.push({
      mpptNumero: mppt,
      stringsEnMPPT,
      panelesPorString: panelesPorStringReal,
      calibreCableDC: calibreDC,
      warnings,
    });

    panelesRestantes -= panelesEnEsteMPPT;
    stringNum += stringsEnMPPT;
  }

  return configs;
}
