import type { StructureRowInput, StructureRowResult } from "./types";
import {
  getEspacios,
  getArmaduras,
  getTipoArmadura,
  getMetrosArmadura,
  getAngulosFila,
  getContraflambeoMetros,
  getContraflambeoPiezas,
  getAngulosContraflambeo,
  getBaseUnicanal,
  getUnicanalBasePiezas,
  getUnicanalesFila,
  getRestanteMetros,
  getRestanteCapacidad,
} from "./rules";

/** Calculate all structural values for a single row of panels. */
export function calculateRow(input: StructureRowInput): StructureRowResult {
  const { horizontal, vertical } = input;
  const warnings: string[] = [];

  const espacios = getEspacios(horizontal, vertical);

  const armaduras = getArmaduras(horizontal);
  if (armaduras === -1) {
    warnings.push(`horizontal=${horizontal} excede máximo 6 — se usó 0 armaduras`);
  }
  const armadurasSafe = armaduras === -1 ? 0 : armaduras;

  const tipoArmadura = getTipoArmadura(vertical);
  if (tipoArmadura === "ninguna" && vertical > 0) {
    warnings.push(`vertical=${vertical} no tiene tipo de armadura definido`);
  }

  const metrosArmadura = getMetrosArmadura(vertical);
  const angulosFila = getAngulosFila(metrosArmadura, armadurasSafe);

  const contraflambeoMetros = getContraflambeoMetros(vertical, armadurasSafe);
  const contraflambeoPiezas = getContraflambeoPiezas(contraflambeoMetros);
  const angulosContraflambeo = getAngulosContraflambeo(contraflambeoPiezas);

  const baseUnicanal = getBaseUnicanal(horizontal);
  const unicanalBasePiezas = getUnicanalBasePiezas(baseUnicanal);
  const unicanalesFila = getUnicanalesFila(unicanalBasePiezas, vertical);

  const restanteMetros = getRestanteMetros(baseUnicanal, horizontal);
  const restanteCapacidad = getRestanteCapacidad(restanteMetros, vertical);

  return {
    horizontal,
    vertical,
    espacios,
    armaduras: armadurasSafe,
    tipoArmadura,
    metrosArmadura,
    angulosFila,
    contraflambeoMetros,
    contraflambeoPiezas,
    angulosContraflambeo,
    baseUnicanal,
    unicanalBasePiezas,
    unicanalesFila,
    restanteMetros,
    restanteCapacidad,
    warnings,
  };
}
