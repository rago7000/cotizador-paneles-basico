// ── Configuración de generación solar ────────────────────────────────────────
// Constantes de generación promedio por kWp/mes. Punto único de cambio cuando
// la app empiece a vender en regiones con irradiación distinta a la asumida
// (5.5 sun-hours, 30 días, 0.8 PR ≈ 132 kWh/kWp/mes).
//
// TODO (Fase C): parametrizar por proyecto en `convex/schema.ts > proyectos.
//   genPorKwpMes` y leer ese valor antes de caer al default.

/**
 * Generación promedio mensual estimada por kWp instalado.
 * Asume: 5.5 sun-hours × 30 días × 0.8 performance ratio.
 * Suficiente para la región actual de operación; revisar al expandir.
 */
export const KWH_PER_KWP_MES = 132;

/** Alias histórico, mismo valor. Conservado por compatibilidad. */
export const GEN_POR_KWP = KWH_PER_KWP_MES;
