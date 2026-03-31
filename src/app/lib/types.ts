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
}

export interface ProductoMicro {
  id: string;
  marca: string;
  modelo: string;
  panelesPorUnidad: number;
}

export interface Oferta {
  id: string;
  proveedorId: string;
  productoId: string;
  tipo: "panel" | "micro";
  precio: number;          // panel: USD/W sin IVA · micro: USD/unidad sin IVA
  precioCable?: number;    // solo micros
  fecha: string;           // ISO date
  notas: string;
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
