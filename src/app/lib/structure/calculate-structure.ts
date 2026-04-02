import type { StructureRowInput, StructureCalculationResult } from "./types";
import { validateInput, validateRow } from "./validators";
import { calculateRow } from "./calculate-row";
import { calculateTotals } from "./calculate-totals";

/**
 * Main orchestrator: calculates structural requirements for a panel layout.
 *
 * - Validates all inputs
 * - Calculates per-row structural values
 * - Aggregates totals with purchase rounding
 * - Collects all warnings
 */
export function calculateStructure(
  rows: StructureRowInput[],
): StructureCalculationResult {
  const validation = validateInput(rows);

  if (!validation.valid && validation.warnings.some((w) => w.startsWith("No se"))) {
    // No rows at all — return empty result with warning
    return {
      rows: [],
      totals: {
        totalPaneles: 0,
        totalAngulos: 0,
        totalAngulosCompra: 0,
        totalContraflambeoMetros: 0,
        totalAngulosContraflambeo: 0,
        totalAngulosContraflambeoCompra: 0,
        totalUnicanales: 0,
        totalUnicanalesCompra: 0,
        totalRestanteMetros: 0,
        totalRestanteCapacidad: 0,
        clipsBase: 0,
        clipsConDesperdicio: 0,
        warnings: validation.warnings,
      },
    };
  }

  // Process each row: skip invalid rows but collect their warnings
  const computedRows = [];
  const skippedWarnings: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowValidation = validateRow(rows[i], i);

    if (rowValidation.warnings.some((w) => w.includes("no permitidos") || w.includes("no numéricos") || w.includes("se omitirá"))) {
      // Invalid row — skip calculation, keep warnings
      skippedWarnings.push(...rowValidation.warnings);
      continue;
    }

    // Row may have soft warnings (e.g. horizontal > 6) but is still calculable
    const result = calculateRow(rows[i]);
    result.warnings.push(...rowValidation.warnings);
    computedRows.push(result);
  }

  const totals = calculateTotals(computedRows);
  totals.warnings.push(...skippedWarnings);

  return {
    rows: computedRows,
    totals,
  };
}
