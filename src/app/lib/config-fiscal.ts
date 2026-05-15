// ── Configuración fiscal (México) ────────────────────────────────────────────
// Tasas de IVA y helpers de cálculo. Punto único de cambio si la tasa fiscal
// cambia (frontera 8%, reformas, etc.) o si en el futuro hay que parametrizar
// por proyecto / régimen.

/** Tasa de IVA general en México (16%). */
export const IVA_RATE = 0.16;

/** Factor multiplicativo para extraer monto sin IVA desde uno con IVA incluido. */
export const IVA_FACTOR = 1 + IVA_RATE;

/** Calcula el IVA de un monto SIN IVA. */
export function calcularIVA(montoSinIVA: number): number {
  return montoSinIVA * IVA_RATE;
}

/** Dado un monto CON IVA incluido, devuelve el monto SIN IVA. */
export function extraerMontoSinIVA(montoConIVA: number): number {
  return montoConIVA / IVA_FACTOR;
}
