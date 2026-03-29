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
