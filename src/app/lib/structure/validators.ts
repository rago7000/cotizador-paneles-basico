import type { StructureRowInput } from "./types";

export type ValidationResult = {
  valid: boolean;
  warnings: string[];
};

/** Validate a single row input. Returns warnings for out-of-range values. */
export function validateRow(row: StructureRowInput, index: number): ValidationResult {
  const warnings: string[] = [];
  const label = `Fila ${index + 1}`;

  if (!Number.isFinite(row.horizontal) || !Number.isFinite(row.vertical)) {
    warnings.push(`${label}: valores no numéricos (horizontal=${row.horizontal}, vertical=${row.vertical})`);
    return { valid: false, warnings };
  }

  if (row.horizontal < 0 || row.vertical < 0) {
    warnings.push(`${label}: valores negativos no permitidos (horizontal=${row.horizontal}, vertical=${row.vertical})`);
    return { valid: false, warnings };
  }

  if (row.horizontal === 0 && row.vertical === 0) {
    warnings.push(`${label}: fila vacía (horizontal=0, vertical=0), se omitirá del cálculo`);
    return { valid: false, warnings };
  }

  if (row.horizontal === 0 || row.vertical === 0) {
    warnings.push(`${label}: fila con dimensión en cero (horizontal=${row.horizontal}, vertical=${row.vertical})`);
    return { valid: false, warnings };
  }

  if (row.horizontal > 6) {
    warnings.push(`${label}: horizontal=${row.horizontal} excede el máximo soportado (6). No hay regla de armaduras definida para este valor.`);
  }

  if (row.vertical > 2) {
    warnings.push(`${label}: vertical=${row.vertical} excede el máximo soportado (2). No hay tipo de armadura definido para este valor.`);
  }

  if (!Number.isInteger(row.horizontal)) {
    warnings.push(`${label}: horizontal=${row.horizontal} no es entero`);
  }

  if (!Number.isInteger(row.vertical)) {
    warnings.push(`${label}: vertical=${row.vertical} no es entero`);
  }

  return { valid: warnings.length === 0, warnings };
}

/** Validate the entire input array. */
export function validateInput(rows: StructureRowInput[]): ValidationResult {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { valid: false, warnings: ["No se proporcionaron filas de acomodo"] };
  }

  const allWarnings: string[] = [];
  let hasAnyValid = false;

  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], i);
    allWarnings.push(...result.warnings);
    if (result.valid) hasAnyValid = true;
  }

  return { valid: hasAnyValid, warnings: allWarnings };
}
