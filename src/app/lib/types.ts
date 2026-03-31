export interface LineItem {
  nombre: string;
  cantidad: string;
  precioUnitario: string;
  unidad: string;
}

export interface TipoCambioData {
  tipoCambio: number;
  fecha: string;
  fuente: string;
  // Segundo dato (si hay): el otro día disponible
  tipoCambioAlt?: number;
  fechaAlt?: string;
  etiqueta?: string;    // "hoy" | "mañana"
  etiquetaAlt?: string;
}

export interface CotizacionData {
  nombre: string;
  fecha: string;
  // Tipos de cambio personalizados (vacío = usar DOF global)
  tcCustomPaneles: string;
  tcCustomMicros: string;
  tcSnapshot?: string;   // TC DOF at save time
  tcFrozen?: boolean;    // true = usar tcSnapshot en vez del DOF en vivo
  // Paneles
  cantidad: string;
  potencia: string;
  precioPorWatt: string;
  fletePaneles: string;
  garantiaPaneles: string;
  // Inversores
  precioMicroinversor: string;
  precioCable: string;
  precioECU: string;
  incluyeECU: boolean;
  precioHerramienta: string;
  incluyeHerramienta: boolean;
  fleteMicros: string;
  // Estructura
  aluminio: LineItem[];
  fleteAluminio: string;
  // Tornilleria
  tornilleria: LineItem[];
  // Generales
  generales: LineItem[];
  // Recibo CFE (opcional — se guarda si el usuario subió uno)
  reciboCFE?: {
    nombre: string;
    direccion: string;
    noServicio: string;
    tarifa: string;
    periodoInicio: string;
    periodoFin: string;
    diasPeriodo: number;
    consumoKwh: number;
    consumoMensualPromedio: number;
    totalFacturado: number;
    historico: { periodo: string; kwh: number; importe: number }[];
  } | null;
  reciboPDFBase64?: string | null;
  // Simulador de minisplits
  minisplits?: { id: string; cantidad: number; toneladas: string; horasDia: number; tipo: "inverter" | "convencional" }[];
  minisplitTemporada?: "anual" | "temporada";
  // Utilidad / Precio al cliente
  utilidad?: UtilidadConfig;
}

export interface CotizacionGuardada {
  nombre: string;
  fecha: string;
  data: CotizacionData;
}

// ── Catálogo (legacy — se mantienen para migración) ──────────────────────────

export interface CatalogoPanel {
  id: string;
  marca: string;
  modelo: string;
  potencia: number;
  precioPorWatt: number;
  notas: string;
  fechaActualizacion: string;
  totalOfertas?: number;
}

export interface CatalogoMicro {
  id: string;
  marca: string;
  modelo: string;
  precio: number;
  precioCable: number;
  panelesPorUnidad: number;
  notas: string;
  fechaActualizacion: string;
  totalOfertas?: number;
}

// ── Catálogo v2: Proveedores + Productos + Ofertas ───────────────────────────

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  notas: string;
}

export interface ProductoPanel {
  id: string;
  marca: string;
  modelo: string;
  potencia: number; // W
  aliases?: string[]; // nombres alternativos fusionados desde otros PDFs
}

export interface ProductoMicro {
  id: string;
  marca: string;
  modelo: string;
  panelesPorUnidad: number;
  aliases?: string[]; // nombres alternativos fusionados
}

export interface PrecioTier {
  etiqueta: string;   // ej: "1 panel", "1 pallet (36 pzas)", "+5 pallets"
  precio: number;
}

export interface Oferta {
  id: string;
  proveedorId: string;
  productoId: string;
  tipo: "panel" | "micro";
  precio: number;          // panel: USD/W sin IVA · micro: USD/unidad sin IVA — precio en uso
  precioTiers?: PrecioTier[];  // tiers de volumen (1 panel, 1 pallet, etc.)
  precioCable?: number;    // solo micros
  fecha: string;           // ISO date
  notas: string;
  archivoOrigenId?: string; // ID del ArchivoProveedor de donde se importó
}

// ── Archivos de proveedores (PDFs importados) ──────────────────────────────

export interface ArchivoProveedor {
  id: string;
  nombre: string;           // filename
  proveedorId: string;
  fechaImportacion: string; // ISO date — cuándo se subió
  fechaDocumento: string;   // fecha extraída del PDF (ej: "2026-02-01")
  condiciones: string;      // texto completo de condiciones/notas del proveedor
  resumenCondiciones: string; // resumen IA de lo más importante
  base64: string;           // PDF completo en base64
}

// ── Utilidad / Precio al cliente ─────────────────────────────────────────────

export interface UtilidadConfig {
  tipo: "global" | "por_partida";
  globalPct: number;
  panelesPct: number;
  inversoresPct: number;
  estructuraPct: number;
  tornilleriaPct: number;
  generalesPct: number;
  montoFijo: number; // MXN adicional
}

// ── Cotización Cliente (variantes) ───────────────────────────────────────────

export interface CotizacionCliente {
  id: string;
  cotizacionBase: string;      // nombre de la cotización de costos
  nombre: string;              // ej: "Opción A — 30%", "Opción B — por partida"
  fecha: string;               // ISO
  utilidad: UtilidadConfig;
  // Snapshot de costos al momento de guardar
  costos: {
    paneles: number;
    inversores: number;
    estructura: number;
    tornilleria: number;
    generales: number;
    subtotal: number;
    iva: number;
    total: number;
    cantidadPaneles: number;
    potenciaW: number;
  };
  // Precios calculados al cliente
  precios: {
    paneles: number;
    inversores: number;
    estructura: number;
    tornilleria: number;
    generales: number;
    montoFijo: number;
    subtotal: number;
    iva: number;
    total: number;
    porPanel: number;
    porWatt: number;
    utilidadNeta: number;
    utilidadPct: number;
  };
  roi?: {
    costoCFEporKwh: number;
    generacionMensualKwh: number;
    ahorroMensual: number;
    ahorroAnual: number;
    meses: number;
    anios: number;
  };
  notas: string;
  vigenciaDias: number;
}

// ── Seguimiento ──────────────────────────────────────────────────────────────

export interface SeguimientoItem {
  key: string;
  realMXN: string;
  proveedor: string;
  notas: string;
}

export interface SeguimientoData {
  cotizacionNombre: string;
  items: SeguimientoItem[];
  fechaActualizacion: string;
}
