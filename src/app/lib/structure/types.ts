// ── Structure Calculation Types ─────────────────────────────────────────────

/** Input: one row of panel arrangement */
export type StructureRowInput = {
  horizontal: number;
  vertical: number;
};

/** Computed result for a single row */
export type StructureRowResult = {
  horizontal: number;
  vertical: number;
  espacios: number;

  armaduras: number;
  tipoArmadura: "sencilla" | "doble" | "ninguna";

  metrosArmadura: number;

  angulosFila: number;

  contraflambeoMetros: number;
  contraflambeoPiezas: number;
  angulosContraflambeo: number;

  baseUnicanal: number;
  unicanalBasePiezas: number;
  unicanalesFila: number;

  restanteMetros: number;
  restanteCapacidad: number;

  warnings: string[];
};

/** Aggregated totals across all rows */
export type StructureTotals = {
  totalPaneles: number;

  totalAngulos: number;
  totalAngulosCompra: number;

  totalContraflambeoMetros: number;
  totalAngulosContraflambeo: number;
  totalAngulosContraflambeoCompra: number;

  totalUnicanales: number;
  totalUnicanalesCompra: number;

  totalRestanteMetros: number;
  totalRestanteCapacidad: number;

  clipsBase: number;
  clipsConDesperdicio: number;

  warnings: string[];
};

/** Final result container */
export type StructureCalculationResult = {
  rows: StructureRowResult[];
  totals: StructureTotals;
};
