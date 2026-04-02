import type { StructureRowResult, StructureTotals } from "./types";
import { getClipsBase, getClipsConDesperdicio } from "./rules";

/** Aggregate all row results into purchase-ready totals. */
export function calculateTotals(rows: StructureRowResult[]): StructureTotals {
  const warnings: string[] = [];

  let totalPaneles = 0;
  let totalAngulos = 0;
  let totalContraflambeoMetros = 0;
  let totalAngulosContraflambeo = 0;
  let totalUnicanales = 0;
  let totalRestanteMetros = 0;
  let totalRestanteCapacidad = 0;

  for (const row of rows) {
    totalPaneles += row.espacios;
    totalAngulos += row.angulosFila;
    totalContraflambeoMetros += row.contraflambeoMetros;
    totalAngulosContraflambeo += row.angulosContraflambeo;
    totalUnicanales += row.unicanalesFila;
    totalRestanteMetros += row.restanteMetros;
    totalRestanteCapacidad += row.restanteCapacidad;

    warnings.push(...row.warnings);
  }

  const clipsBase = getClipsBase(totalPaneles);
  const clipsConDesperdicio = getClipsConDesperdicio(clipsBase);

  return {
    totalPaneles,

    totalAngulos,
    totalAngulosCompra: Math.ceil(totalAngulos),

    totalContraflambeoMetros,
    totalAngulosContraflambeo,
    totalAngulosContraflambeoCompra: Math.ceil(totalAngulosContraflambeo),

    totalUnicanales,
    totalUnicanalesCompra: Math.ceil(totalUnicanales),

    totalRestanteMetros,
    totalRestanteCapacidad,

    clipsBase,
    clipsConDesperdicio,

    warnings,
  };
}
