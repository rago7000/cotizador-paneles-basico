export interface LineItem {
  id: string;
  nombre: string;
  cantidad: string;
  precioUnitario: string;
  unidad: string;
}

export interface TipoCambioData {
  tipoCambio: number;
  fecha: string;
  fuente: string;
  etiqueta?: string;
  // Metadata de la consulta
  fechaSolicitada?: string;  // Fecha que se intentó consultar (hora México)
  fechaResuelta?: string;    // Fecha real del dato devuelto
  timezone?: string;         // "America/Mexico_City"
  fallbackUsed?: boolean;    // true si se usó API de respaldo
  // Segundo dato (FIX determinado hoy, publicado mañana en DOF)
  tipoCambioAlt?: number;
  fechaAlt?: string;
  etiquetaAlt?: string;
  // Últimos ~10 datos históricos (más reciente primero)
  historico?: { fecha: string; valor: number }[];
}

export interface CotizacionData {
  nombre: string;
  cotizacionId?: string;  // unique ID per quotation — variants are keyed by this
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
  precioEndCap?: string;
  incluyeEndCap?: boolean;
  fleteMicros: string;
  // Estructura
  aluminio: LineItem[];
  fleteAluminio: string;
  // Tornilleria
  tornilleria: LineItem[];
  // Generales
  generales: LineItem[];
  // IDs de catálogo seleccionados (para restaurar al cargar)
  panelCatalogoId?: string;
  microCatalogoId?: string;
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

  // ── Cliente / Contacto ──
  clienteTelefono?: string;
  clienteEmail?: string;
  clienteUbicacion?: string;
  clienteNotas?: string;

  // ── Pipeline / Estado comercial ──
  etapa?: "prospecto" | "cotizado" | "negociacion" | "cerrado_ganado" | "cerrado_perdido" | "instalado";
  etapaNotas?: string;
  fechaCierre?: string;
  fechaInstalacion?: string;
  probabilidadCierre?: number;

  // ── Origen / Canal de captación ──
  origen?: "referido" | "facebook" | "instagram" | "google" | "tiktok" | "sitio_web" | "volanteo" | "feria" | "otro";
  origenDetalle?: string;

  // ── Timestamps ──
  creadoEn?: string;
  actualizadoEn?: string;
  vistoPorUltimaVez?: string;

  // ── Tags ──
  tags?: string[];
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

// ── Tipos de oferta expandidos ──────────────────────────────────────────────

export type TipoOferta = "panel" | "micro" | "monitoreo" | "herramienta" | "cable" | "estructura" | "tornilleria" | "otro";

export interface ProductoGeneral {
  id: string;
  categoria: TipoOferta;
  marca: string;
  modelo: string;
  descripcion: string;
  aliases?: string[];
}

export interface PrecioTier {
  etiqueta: string;   // ej: "1 panel", "1 pallet (36 pzas)", "+5 pallets"
  precio: number;
}

export interface Oferta {
  id: string;
  proveedorId: string;
  productoId: string;
  tipo: TipoOferta;
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
  /** Full state snapshot for restoring via "Usar" */
  stateSnapshot?: CotizacionData;
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

// ── Seguimiento v2 (one doc per concept) ────────────────────────────────────

export type SeguimientoEstado = "pendiente" | "pedido" | "pagado" | "recibido";

export interface SeguimientoItemV2 {
  _id?: string;
  cotizacionNombre: string;
  key: string;

  realMXN?: number;
  incluyeIVA?: boolean;
  tcCompra?: number;
  montoOriginal?: number;
  monedaOriginal?: string;

  proveedorNombre?: string;

  estado?: SeguimientoEstado;
  fechaPedido?: string;
  fechaPago?: string;
  fechaRecibido?: string;

  notas?: string;
  facturaRef?: string;
  ordenCompraId?: string;

  actualizadoEn: string;
}

// ── Órdenes de Compra ───────────────────────────────────────────────────────

export type OrdenCompraEstado =
  | "borrador"
  | "enviada"
  | "confirmada"
  | "parcial"
  | "recibida"
  | "cancelada";

export interface OrigenOC {
  cotizacionNombre: string;
  seguimientoKey: string;
  cantidad: number;
}

export interface LineaOC {
  id: string;
  descripcion: string;
  productoId?: string;
  productoTabla?: string;
  cantidad: number;
  unidad: string;
  precioUnitarioEst?: number;
  moneda: string;
  origenes: OrigenOC[];
  notaBulk?: string;
}

export interface OrdenCompra {
  _id: string;
  folio: string;
  nombre?: string;
  proveedorNombre: string;
  lineas: LineaOC[];
  estado: OrdenCompraEstado;
  tcCompra?: number;
  subtotalEst?: number;
  moneda: string;
  fechaCreacion: string;
  fechaEnvio?: string;
  fechaRecepcion?: string;
  notas?: string;
}

// ── Consolidador ────────────────────────────────────────────────────────────

export interface ItemDemanda {
  id: string;
  seccion: string;
  descripcion: string;
  productoId?: string;
  productoTabla?: string;
  unidad: string;
  moneda: string;
  cantidadTotal: number;
  origenes: OrigenOC[];
}
