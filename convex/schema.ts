import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { cotizacionFieldsV } from "./validators";

export default defineSchema({
  // ── Proveedores ──
  proveedores: defineTable({
    nombre: v.string(),
    contacto: v.string(),
    telefono: v.string(),
    notas: v.string(),
  }),

  // ── Productos: Paneles ──
  productosPaneles: defineTable({
    marca: v.string(),
    modelo: v.string(),
    potencia: v.number(),
    aliases: v.optional(v.array(v.string())),
  }),

  // ── Productos: Microinversores ──
  productosMicros: defineTable({
    marca: v.string(),
    modelo: v.string(),
    panelesPorUnidad: v.number(),
    aliases: v.optional(v.array(v.string())),
  }),

  // ── Productos: Generales (monitoreo, cable, herramienta, etc.) ──
  productosGenerales: defineTable({
    categoria: v.string(), // TipoOferta
    marca: v.string(),
    modelo: v.string(),
    descripcion: v.string(),
    aliases: v.optional(v.array(v.string())),
  }),

  // ── Ofertas ──
  ofertas: defineTable({
    proveedorId: v.id("proveedores"),
    productoId: v.string(), // ID from any product table
    productoTabla: v.string(), // "productosPaneles" | "productosMicros" | "productosGenerales"
    tipo: v.string(), // TipoOferta
    precio: v.number(),
    precioTiers: v.optional(
      v.array(v.object({ etiqueta: v.string(), precio: v.number() }))
    ),
    precioCable: v.optional(v.number()),
    fecha: v.string(), // ISO date
    notas: v.string(),
    archivoOrigenId: v.optional(v.id("archivosProveedor")),
  }).index("by_productoId", ["productoId"])
    .index("by_proveedorId", ["proveedorId"]),

  // ── Archivos de proveedor (PDFs importados) ──
  archivosProveedor: defineTable({
    nombre: v.string(),
    proveedorId: v.id("proveedores"),
    fechaImportacion: v.string(),
    fechaDocumento: v.string(),
    condiciones: v.string(),
    resumenCondiciones: v.string(),
    storageId: v.optional(v.id("_storage")), // PDF in Convex file storage
  }),

  // ── Cotizaciones (quotes) — structured fields ──
  cotizaciones: defineTable({
    ...cotizacionFieldsV,
    // Legacy JSON blob — kept as optional during migration, will be removed
    data: v.optional(v.string()),
  }).index("by_nombre", ["nombre"]),

  // ── Cotizaciones Cliente (customer pricing variants) ──
  cotizacionesCliente: defineTable({
    cotizacionBase: v.string(),
    nombre: v.string(),
    fecha: v.string(),
    data: v.string(), // JSON-serialized (utilidad, costos, precios, roi, notas, vigencia)
  }).index("by_cotizacionBase", ["cotizacionBase"]),

  // ── Seguimiento (cost tracking) ──
  seguimiento: defineTable({
    cotizacionNombre: v.string(),
    items: v.string(), // JSON-serialized SeguimientoItem[]
    fechaActualizacion: v.string(),
  }).index("by_cotizacionNombre", ["cotizacionNombre"]),

  // ── Catálogo legacy (v1 — for migration) ──
  catalogoPaneles: defineTable({
    marca: v.string(),
    modelo: v.string(),
    potencia: v.number(),
    precioWatt: v.number(),
  }),

  catalogoMicros: defineTable({
    marca: v.string(),
    modelo: v.string(),
    precio: v.number(),
    precioCable: v.number(),
    panelesPorUnidad: v.number(),
  }),
});
