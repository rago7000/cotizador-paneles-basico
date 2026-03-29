import {
  CotizacionData,
  CotizacionGuardada,
  CatalogoPanel,
  CatalogoMicro,
  SeguimientoData,
} from "./types";

// ── Cotizaciones ──────────────────────────────────────────────────────────────

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

// ── Catálogo — Paneles ────────────────────────────────────────────────────────

const CAT_PANELES_KEY = "catalogo_paneles";

export function listarCatalogoPaneles(): CatalogoPanel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CAT_PANELES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function guardarCatalogoPanel(panel: CatalogoPanel): void {
  const lista = listarCatalogoPaneles();
  const idx = lista.findIndex((p) => p.id === panel.id);
  if (idx >= 0) {
    lista[idx] = panel;
  } else {
    lista.push(panel);
  }
  localStorage.setItem(CAT_PANELES_KEY, JSON.stringify(lista));
}

export function eliminarCatalogoPanel(id: string): void {
  const lista = listarCatalogoPaneles().filter((p) => p.id !== id);
  localStorage.setItem(CAT_PANELES_KEY, JSON.stringify(lista));
}

// ── Catálogo — Microinversores ────────────────────────────────────────────────

const CAT_MICROS_KEY = "catalogo_micros";

export function listarCatalogoMicros(): CatalogoMicro[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CAT_MICROS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function guardarCatalogoMicro(micro: CatalogoMicro): void {
  const lista = listarCatalogoMicros();
  const idx = lista.findIndex((m) => m.id === micro.id);
  if (idx >= 0) {
    lista[idx] = micro;
  } else {
    lista.push(micro);
  }
  localStorage.setItem(CAT_MICROS_KEY, JSON.stringify(lista));
}

export function eliminarCatalogoMicro(id: string): void {
  const lista = listarCatalogoMicros().filter((m) => m.id !== id);
  localStorage.setItem(CAT_MICROS_KEY, JSON.stringify(lista));
}

// ── Seguimiento ───────────────────────────────────────────────────────────────

const SEGUIMIENTO_KEY = "seguimiento_proyectos";

export function guardarSeguimiento(data: SeguimientoData): void {
  if (typeof window === "undefined") return;
  const all = cargarTodosSeguimientos();
  const idx = all.findIndex((s) => s.cotizacionNombre === data.cotizacionNombre);
  if (idx >= 0) all[idx] = data; else all.push(data);
  localStorage.setItem(SEGUIMIENTO_KEY, JSON.stringify(all));
}

export function cargarSeguimiento(nombre: string): SeguimientoData | null {
  const all = cargarTodosSeguimientos();
  return all.find((s) => s.cotizacionNombre === nombre) ?? null;
}

function cargarTodosSeguimientos(): SeguimientoData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEGUIMIENTO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
