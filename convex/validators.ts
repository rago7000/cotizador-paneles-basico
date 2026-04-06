// ── Shared Convex validators for cotizaciones ──────────────────────────────
//
// Used by both schema.ts (table definition) and cotizaciones.ts (mutation args).
// Keeps validators DRY and ensures the mutation args always match the schema.

import { v } from "convex/values";

export const lineItemV = v.object({
  id: v.string(),
  nombre: v.string(),
  cantidad: v.string(),
  precioUnitario: v.string(),
  unidad: v.string(),
});

export const reciboCFEV = v.object({
  nombre: v.string(),
  direccion: v.string(),
  noServicio: v.string(),
  tarifa: v.string(),
  periodoInicio: v.string(),
  periodoFin: v.string(),
  diasPeriodo: v.number(),
  consumoKwh: v.number(),
  consumoMensualPromedio: v.number(),
  totalFacturado: v.number(),
  historico: v.array(
    v.object({
      periodo: v.string(),
      kwh: v.number(),
      importe: v.number(),
    }),
  ),
});

export const minisplitV = v.object({
  id: v.string(),
  cantidad: v.number(),
  toneladas: v.string(),
  horasDia: v.number(),
  tipo: v.union(v.literal("inverter"), v.literal("convencional")),
});

export const utilidadV = v.object({
  tipo: v.union(v.literal("global"), v.literal("por_partida")),
  globalPct: v.number(),
  panelesPct: v.number(),
  inversoresPct: v.number(),
  estructuraPct: v.number(),
  tornilleriaPct: v.number(),
  generalesPct: v.number(),
  montoFijo: v.number(),
});

/**
 * All cotización structured fields.
 * Used as both the table columns (in schema.ts) and the save mutation args.
 */
export const cotizacionFieldsV = {
  nombre: v.string(),
  fecha: v.string(),

  // ── Tipo de cambio ──
  tcCustomPaneles: v.optional(v.string()),
  tcCustomMicros: v.optional(v.string()),
  tcSnapshot: v.optional(v.string()),
  tcFrozen: v.optional(v.boolean()),

  // ── Paneles ──
  cantidad: v.optional(v.string()),
  potencia: v.optional(v.string()),
  precioPorWatt: v.optional(v.string()),
  fletePaneles: v.optional(v.string()),
  garantiaPaneles: v.optional(v.string()),

  // ── Microinversores ──
  precioMicroinversor: v.optional(v.string()),
  precioCable: v.optional(v.string()),
  precioECU: v.optional(v.string()),
  incluyeECU: v.optional(v.boolean()),
  precioHerramienta: v.optional(v.string()),
  incluyeHerramienta: v.optional(v.boolean()),
  fleteMicros: v.optional(v.string()),

  // ── Estructura / Aluminio ──
  aluminio: v.optional(v.array(lineItemV)),
  fleteAluminio: v.optional(v.string()),

  // ── Tornillería ──
  tornilleria: v.optional(v.array(lineItemV)),

  // ── Generales ──
  generales: v.optional(v.array(lineItemV)),

  // ── Catálogo refs ──
  panelCatalogoId: v.optional(v.string()),
  microCatalogoId: v.optional(v.string()),

  // ── Recibo CFE ──
  reciboCFE: v.optional(reciboCFEV),
  reciboPDFBase64: v.optional(v.string()),

  // ── Minisplits ──
  minisplits: v.optional(v.array(minisplitV)),
  minisplitTemporada: v.optional(v.string()),

  // ── Utilidad ──
  utilidad: v.optional(utilidadV),

  // ── Cliente / Contacto ──
  clienteTelefono: v.optional(v.string()),
  clienteEmail: v.optional(v.string()),
  clienteUbicacion: v.optional(v.string()), // Ciudad, estado o dirección libre
  clienteNotas: v.optional(v.string()),     // Notas libres sobre el cliente

  // ── Pipeline / Estado comercial ──
  etapa: v.optional(
    v.union(
      v.literal("prospecto"),      // Recién captado, aún sin cotización formal
      v.literal("cotizado"),       // Cotización entregada al cliente
      v.literal("negociacion"),    // Cliente interesado, ajustando precio/condiciones
      v.literal("cerrado_ganado"), // Venta cerrada, proceder a instalación
      v.literal("cerrado_perdido"), // Cliente no compró
      v.literal("instalado"),      // Sistema instalado y funcionando
    )
  ),
  etapaNotas: v.optional(v.string()),       // Razón de pérdida, condición de cierre, etc.
  fechaCierre: v.optional(v.string()),       // Fecha en que se cerró (ganado o perdido)
  fechaInstalacion: v.optional(v.string()),  // Fecha de instalación real
  probabilidadCierre: v.optional(v.number()), // 0-100, estimación subjetiva

  // ── Origen / Canal de captación ──
  origen: v.optional(
    v.union(
      v.literal("referido"),
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("google"),
      v.literal("tiktok"),
      v.literal("sitio_web"),
      v.literal("volanteo"),
      v.literal("feria"),
      v.literal("otro"),
    )
  ),
  origenDetalle: v.optional(v.string()), // "Referido por Juan Pérez", "Campaña Feb 2026"

  // ── Timestamps automáticos ──
  creadoEn: v.optional(v.string()),        // ISO — primera vez que se guardó
  actualizadoEn: v.optional(v.string()),   // ISO — última modificación
  vistoPorUltimaVez: v.optional(v.string()), // ISO — última vez que se abrió en el cotizador

  // ── Tags libres (para agrupación y búsqueda) ──
  tags: v.optional(v.array(v.string())),   // ["residencial", "hermosillo", "urgente"]
};
