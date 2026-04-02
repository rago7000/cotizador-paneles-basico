// ── Pure business-rule functions ─────────────────────────────────────────────
// Each function implements exactly one rule from the structural calculation spec.
// No side effects, no rounding for purchase — that happens only in totals.

/** 1) Espacios = horizontal × vertical */
export function getEspacios(horizontal: number, vertical: number): number {
  return horizontal * vertical;
}

/** 2) Armaduras por fila según tramo horizontal.
 *  horizontal 1–3 → 2 armaduras
 *  horizontal 4–6 → 3 armaduras
 *  horizontal ≤ 0  → 0
 *  horizontal > 6  → -1 (señal de valor fuera de rango)
 */
export function getArmaduras(horizontal: number): number {
  if (horizontal <= 0) return 0;
  if (horizontal <= 3) return 2;
  if (horizontal <= 6) return 3;
  return -1; // fuera de rango — el caller debe emitir warning
}

/** 3) Tipo de armadura según vertical */
export function getTipoArmadura(vertical: number): "sencilla" | "doble" | "ninguna" {
  if (vertical === 1) return "sencilla";
  if (vertical === 2) return "doble";
  return "ninguna";
}

/** 4) Metros de armadura por fila: vertical × 3 */
export function getMetrosArmadura(vertical: number): number {
  return vertical * 3;
}

/** 5) Ángulos por fila: (metrosArmadura / 6) × armaduras */
export function getAngulosFila(metrosArmadura: number, armaduras: number): number {
  return (metrosArmadura / 6) * armaduras;
}

/** 6a) Contraflambeo metros: solo armaduras dobles (vertical=2).
 *  contraflambeo = armaduras × 1.4
 */
export function getContraflambeoMetros(vertical: number, armaduras: number): number {
  if (vertical !== 2) return 0;
  return armaduras * 1.4;
}

/** 6b) Piezas de contraflambeo: metros / 1.4 (cada pieza mide 1.4 m) */
export function getContraflambeoPiezas(contraflambeoMetros: number): number {
  if (contraflambeoMetros === 0) return 0;
  return contraflambeoMetros / 1.4;
}

/** 6c) Ángulos equivalentes por contraflambeo: piezas × 0.25 */
export function getAngulosContraflambeo(contraflambeoPiezas: number): number {
  return contraflambeoPiezas * 0.25;
}

/** 7) Base unicanal según horizontal:
 *  horizontal = 2 → 2
 *  horizontal = 3 → 3
 *  horizontal > 3 → 6
 *  horizontal ≤ 0 → 0
 */
export function getBaseUnicanal(horizontal: number): number {
  if (horizontal <= 0) return 0;
  if (horizontal === 1) return 2; // mínimo 2 m (no hay unicanal de 1 m)
  if (horizontal === 2) return 2;
  if (horizontal === 3) return 3;
  return 6; // horizontal > 3
}

/** 8) Conversión a piezas de 6 m (sin redondeo) */
export function getUnicanalBasePiezas(baseUnicanal: number): number {
  if (baseUnicanal === 0) return 0;
  return baseUnicanal / 6;
}

/** 9) Unicanales reales por fila: basePiezas × 2 × vertical */
export function getUnicanalesFila(unicanalBasePiezas: number, vertical: number): number {
  return unicanalBasePiezas * 2 * vertical;
}

/** 10a) Metros restantes por fila: baseUnicanal - horizontal */
export function getRestanteMetros(baseUnicanal: number, horizontal: number): number {
  return baseUnicanal - horizontal;
}

/** 10b) Capacidad restante: si hay restante, vertical × 2; si no, 0 */
export function getRestanteCapacidad(restanteMetros: number, vertical: number): number {
  if (restanteMetros === 0) return 0;
  return vertical * 2;
}

/** 11a) Clips base: totalPaneles × 4 */
export function getClipsBase(totalPaneles: number): number {
  return totalPaneles * 4;
}

/** 11b) Clips con desperdicio 5% redondeado hacia arriba */
export function getClipsConDesperdicio(clipsBase: number): number {
  return Math.ceil(clipsBase * 1.05);
}
