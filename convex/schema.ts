import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { cotizacionFieldsV, seguimientoItemEstadoV, ordenCompraEstadoV, lineaOCV } from "./validators";

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
    esDefault: v.optional(v.boolean()),
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
    fecha: v.string(), // ISO date — fecha de la lista de precios
    creadoEn: v.optional(v.string()), // ISO date — cuándo se capturó/importó al sistema
    notas: v.string(),
    archivoOrigenId: v.optional(v.id("archivosProveedor")),
    // ── Phase 4: Trazabilidad ──
    priceListId: v.optional(v.id("priceLists")),
    importRunId: v.optional(v.id("importRuns")),
  }).index("by_productoId", ["productoId"])
    .index("by_proveedorId", ["proveedorId"]),

  // ── Import Runs (registro de cada importación de catálogo) ──
  importRuns: defineTable({
    proveedorId: v.id("proveedores"),
    archivoProveedorId: v.id("archivosProveedor"),
    nombreArchivo: v.string(),

    status: v.union(
      v.literal("extracting"),
      v.literal("staging"),
      v.literal("reviewing"),
      v.literal("approved"),
      v.literal("published"),
      v.literal("failed"),
    ),

    paginasTotal: v.number(),
    paginasProcesadas: v.number(),
    filasExtraidas: v.number(),
    filasAsociadas: v.number(),
    filasDescartadas: v.number(),
    filasNuevas: v.number(),
    errorExtraccion: v.optional(v.string()),

    creadoPor: v.optional(v.string()),
    creadoEn: v.number(),
    revisadoEn: v.optional(v.number()),
    publicadoEn: v.optional(v.number()),
  })
    .index("by_proveedor_and_creadoEn", ["proveedorId", "creadoEn"])
    .index("by_status", ["status"]),

  // ── Import Row Staging (filas extraídas pendientes de revisión) ──
  importRowStaging: defineTable({
    importRunId: v.id("importRuns"),

    rawData: v.object({
      modelo: v.string(),
      potencia: v.optional(v.string()),
      precio: v.optional(v.string()),
      moneda: v.optional(v.string()),
      unidad: v.optional(v.string()),
      marca: v.optional(v.string()),
      notas: v.optional(v.string()),
      paginaOrigen: v.optional(v.number()),
      textoOriginal: v.optional(v.string()),
    }),

    // Hash para detectar duplicados entre importaciones
    hashFila: v.string(),

    tipo: v.union(
      v.literal("panel"),
      v.literal("micro"),
      v.literal("general"),
      v.literal("desconocido"),
    ),
    resolution: v.union(
      v.literal("pending"),
      v.literal("matched"),
      v.literal("new"),
      v.literal("discarded"),
    ),

    matchedProductId: v.optional(v.string()),
    matchedProductTable: v.optional(v.union(
      v.literal("productosPaneles"),
      v.literal("productosMicros"),
      v.literal("productosGenerales"),
    )),
    matchConfidence: v.optional(v.union(
      v.literal("auto"),
      v.literal("suggested"),
      v.literal("manual"),
    )),

    precioNormalizado: v.optional(v.object({
      valor: v.number(),
      moneda: v.string(),
      unidad: v.string(),
      valorPorWatt: v.optional(v.number()),
    })),

    precioTiers: v.optional(v.array(v.object({
      minQty: v.number(),
      maxQty: v.optional(v.number()),
      precio: v.number(),
      moneda: v.string(),
      unidad: v.string(),
    }))),
  })
    .index("by_importRunId", ["importRunId"])
    .index("by_importRunId_and_resolution", ["importRunId", "resolution"])
    .index("by_hashFila", ["hashFila"]),

  // ── Price Lists (listas de precios publicadas) ──
  priceLists: defineTable({
    proveedorId: v.id("proveedores"),
    importRunId: v.id("importRuns"),
    archivoProveedorId: v.id("archivosProveedor"),

    nombre: v.string(),
    version: v.number(),
    fechaPublicacion: v.number(),
    fechaVigencia: v.optional(v.number()),
    activa: v.boolean(),

    totalItems: v.number(),
    monedaPrincipal: v.string(),

    creadoPor: v.optional(v.string()),
    notas: v.optional(v.string()),
  })
    .index("by_proveedorId_and_activa", ["proveedorId", "activa"])
    .index("by_proveedorId_and_fechaPublicacion", ["proveedorId", "fechaPublicacion"]),

  // ── Price List Items (precios individuales dentro de una lista) ──
  priceListItems: defineTable({
    priceListId: v.id("priceLists"),
    productoId: v.string(),
    productoTable: v.union(
      v.literal("productosPaneles"),
      v.literal("productosMicros"),
      v.literal("productosGenerales"),
    ),

    precio: v.number(),
    moneda: v.string(),
    unidad: v.string(),
    precioTiers: v.optional(v.array(v.object({
      minQty: v.number(),
      maxQty: v.optional(v.number()),
      precio: v.number(),
    }))),

    importRowStagingId: v.id("importRowStaging"),

    // Texto original del PDF para debugging rápido sin ir a staging
    precioOriginalTexto: v.string(),

    productoSnapshot: v.object({
      modelo: v.string(),
      marca: v.optional(v.string()),
      potencia: v.optional(v.number()),
    }),
  })
    .index("by_priceListId", ["priceListId"])
    .index("by_productoId_and_productoTable", ["productoId", "productoTable"]),

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
  }).index("by_nombre", ["nombre"])
    .index("by_etapa", ["etapa"]),

  // ── Cotizaciones Cliente (customer pricing variants) ──
  cotizacionesCliente: defineTable({
    cotizacionBase: v.string(),
    nombre: v.string(),
    fecha: v.string(),
    data: v.string(), // JSON-serialized (utilidad, costos, precios, roi, notas, vigencia)
  }).index("by_cotizacionBase", ["cotizacionBase"]),

  // ── Seguimiento (cost tracking) — legacy JSON blob ──
  seguimiento: defineTable({
    cotizacionNombre: v.string(),
    items: v.string(), // JSON-serialized SeguimientoItem[]
    fechaActualizacion: v.string(),
  }).index("by_cotizacionNombre", ["cotizacionNombre"]),

  // ── Seguimiento Items (v2 — one doc per concept per quote) ──
  seguimientoItems: defineTable({
    cotizacionNombre: v.string(),
    key: v.string(),

    // Cost tracking
    realMXN: v.optional(v.number()),
    incluyeIVA: v.optional(v.boolean()),
    tcCompra: v.optional(v.number()),
    montoOriginal: v.optional(v.number()),
    monedaOriginal: v.optional(v.string()),

    // Supplier
    proveedorNombre: v.optional(v.string()),

    // Status & dates
    estado: v.optional(seguimientoItemEstadoV),
    fechaPedido: v.optional(v.string()),
    fechaPago: v.optional(v.string()),
    fechaRecibido: v.optional(v.string()),

    // Notes & reference
    notas: v.optional(v.string()),
    facturaRef: v.optional(v.string()),

    // Phase 2 forward-link
    ordenCompraId: v.optional(v.string()),

    actualizadoEn: v.string(),
  })
    .index("by_cotizacionNombre", ["cotizacionNombre"])
    .index("by_cotizacionNombre_and_key", ["cotizacionNombre", "key"])
    .index("by_estado", ["estado"]),

  // ── Órdenes de Compra ──
  ordenesCompra: defineTable({
    folio: v.string(),
    nombre: v.optional(v.string()),
    proveedorNombre: v.string(),
    lineas: v.array(lineaOCV),
    estado: ordenCompraEstadoV,
    tcCompra: v.optional(v.number()),
    subtotalEst: v.optional(v.number()),
    moneda: v.string(),
    fechaCreacion: v.string(),
    fechaEnvio: v.optional(v.string()),
    fechaRecepcion: v.optional(v.string()),
    notas: v.optional(v.string()),
  })
    .index("by_folio", ["folio"])
    .index("by_estado", ["estado"]),

  // ── Contador de folios OC (auto-increment por año) ──
  ordenesCompraContador: defineTable({
    anio: v.number(),
    siguiente: v.number(),
  }).index("by_anio", ["anio"]),

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
