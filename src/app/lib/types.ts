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
}

export interface CotizacionGuardada {
  nombre: string;
  fecha: string;
  data: CotizacionData;
}

// ── Catálogo ──────────────────────────────────────────────────────────────────

export interface CatalogoPanel {
  id: string;
  marca: string;
  modelo: string;
  potencia: number;       // W
  precioPorWatt: number;  // USD sin IVA
  notas: string;
  fechaActualizacion: string;
}

export interface SeguimientoItem {
  key: string;       // matches a ConceptoCotizado key
  realMXN: string;
  proveedor: string;
  notas: string;
}

export interface SeguimientoData {
  cotizacionNombre: string;
  items: SeguimientoItem[];
  fechaActualizacion: string;
}

export interface CatalogoMicro {
  id: string;
  marca: string;
  modelo: string;
  precio: number;            // USD por unidad, sin IVA
  precioCable: number;       // USD por cable troncal, sin IVA
  panelesPorUnidad: number;  // cuántos paneles soporta cada microinversor
  notas: string;
  fechaActualizacion: string;
}
