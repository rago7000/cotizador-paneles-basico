import { CotizacionData, CotizacionGuardada } from "./types";

const STORAGE_KEY = "cotizaciones_paneles";

export function listarCotizaciones(): CotizacionGuardada[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function guardarCotizacion(data: CotizacionData): void {
  const lista = listarCotizaciones();
  const existente = lista.findIndex((c) => c.nombre === data.nombre);
  const entry: CotizacionGuardada = {
    nombre: data.nombre,
    fecha: new Date().toLocaleString("es-MX"),
    data,
  };
  if (existente >= 0) {
    lista[existente] = entry;
  } else {
    lista.push(entry);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

export function cargarCotizacion(nombre: string): CotizacionData | null {
  const lista = listarCotizaciones();
  const found = lista.find((c) => c.nombre === nombre);
  return found?.data || null;
}

export function eliminarCotizacion(nombre: string): void {
  const lista = listarCotizaciones().filter((c) => c.nombre !== nombre);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}
