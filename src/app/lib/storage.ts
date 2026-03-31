import {
  CotizacionData,
  CotizacionGuardada,
  CatalogoPanel,
  CatalogoMicro,
  SeguimientoData,
  Proveedor,
  ProductoPanel,
  ProductoMicro,
  Oferta,
  CotizacionCliente,
  ArchivoProveedor,
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

// ── Proveedores ──────────────────────────────────────────────────────────────

const PROVEEDORES_KEY = "proveedores";

export function listarProveedores(): Proveedor[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PROVEEDORES_KEY) || "[]"); } catch { return []; }
}

export function guardarProveedor(p: Proveedor): void {
  const lista = listarProveedores();
  const idx = lista.findIndex((x) => x.id === p.id);
  if (idx >= 0) lista[idx] = p; else lista.push(p);
  localStorage.setItem(PROVEEDORES_KEY, JSON.stringify(lista));
}

export function eliminarProveedor(id: string): void {
  localStorage.setItem(PROVEEDORES_KEY, JSON.stringify(listarProveedores().filter((x) => x.id !== id)));
}

// ── Productos — Paneles ──────────────────────────────────────────────────────

const PROD_PANELES_KEY = "productos_panel";

export function listarProductosPaneles(): ProductoPanel[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PROD_PANELES_KEY) || "[]"); } catch { return []; }
}

export function guardarProductoPanel(p: ProductoPanel): void {
  const lista = listarProductosPaneles();
  const idx = lista.findIndex((x) => x.id === p.id);
  if (idx >= 0) lista[idx] = p; else lista.push(p);
  localStorage.setItem(PROD_PANELES_KEY, JSON.stringify(lista));
}

export function eliminarProductoPanel(id: string): void {
  localStorage.setItem(PROD_PANELES_KEY, JSON.stringify(listarProductosPaneles().filter((x) => x.id !== id)));
  // Cascade: eliminar ofertas de este producto
  localStorage.setItem(OFERTAS_KEY, JSON.stringify(listarOfertas().filter((o) => o.productoId !== id)));
}

// ── Productos — Microinversores ──────────────────────────────────────────────

const PROD_MICROS_KEY = "productos_micro";

export function listarProductosMicros(): ProductoMicro[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PROD_MICROS_KEY) || "[]"); } catch { return []; }
}

export function guardarProductoMicro(p: ProductoMicro): void {
  const lista = listarProductosMicros();
  const idx = lista.findIndex((x) => x.id === p.id);
  if (idx >= 0) lista[idx] = p; else lista.push(p);
  localStorage.setItem(PROD_MICROS_KEY, JSON.stringify(lista));
}

export function eliminarProductoMicro(id: string): void {
  localStorage.setItem(PROD_MICROS_KEY, JSON.stringify(listarProductosMicros().filter((x) => x.id !== id)));
  localStorage.setItem(OFERTAS_KEY, JSON.stringify(listarOfertas().filter((o) => o.productoId !== id)));
}

// ── Ofertas ──────────────────────────────────────────────────────────────────

const OFERTAS_KEY = "ofertas";

export function listarOfertas(): Oferta[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(OFERTAS_KEY) || "[]"); } catch { return []; }
}

export function guardarOferta(o: Oferta): void {
  const lista = listarOfertas();
  const idx = lista.findIndex((x) => x.id === o.id);
  if (idx >= 0) lista[idx] = o; else lista.push(o);
  localStorage.setItem(OFERTAS_KEY, JSON.stringify(lista));
}

export function eliminarOferta(id: string): void {
  localStorage.setItem(OFERTAS_KEY, JSON.stringify(listarOfertas().filter((x) => x.id !== id)));
}

// ── Helpers derivados ────────────────────────────────────────────────────────

export function ofertasPorProducto(productoId: string, ofertas: Oferta[]): Oferta[] {
  return ofertas.filter((o) => o.productoId === productoId).sort((a, b) => a.precio - b.precio);
}

export function mejorOferta(productoId: string, ofertas: Oferta[]): Oferta | null {
  const sorted = ofertasPorProducto(productoId, ofertas);
  return sorted.length > 0 ? sorted[0] : null;
}

export function ultimaOferta(productoId: string, proveedorId: string, ofertas: Oferta[]): Oferta | null {
  const matching = ofertas
    .filter((o) => o.productoId === productoId && o.proveedorId === proveedorId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return matching[0] ?? null;
}

export function tendenciaOferta(productoId: string, proveedorId: string, ofertas: Oferta[]): "up" | "down" | "stable" | "new" {
  const hist = ofertas
    .filter((o) => o.productoId === productoId && o.proveedorId === proveedorId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (hist.length <= 1) return "new";
  if (hist[0].precio > hist[1].precio) return "up";
  if (hist[0].precio < hist[1].precio) return "down";
  return "stable";
}

export function historialPrecios(productoId: string, proveedorId: string, ofertas: Oferta[]): Oferta[] {
  return ofertas
    .filter((o) => o.productoId === productoId && o.proveedorId === proveedorId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ── Archivos de proveedores (PDFs importados) ──────────────────────────────

const ARCHIVOS_PROV_KEY = "archivos_proveedor";

export function listarArchivosProveedor(): ArchivoProveedor[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(ARCHIVOS_PROV_KEY) || "[]"); } catch { return []; }
}

export function guardarArchivoProveedor(a: ArchivoProveedor): void {
  const lista = listarArchivosProveedor();
  const idx = lista.findIndex((x) => x.id === a.id);
  if (idx >= 0) lista[idx] = a; else lista.push(a);
  localStorage.setItem(ARCHIVOS_PROV_KEY, JSON.stringify(lista));
}

export function obtenerArchivoProveedor(id: string): ArchivoProveedor | null {
  return listarArchivosProveedor().find((x) => x.id === id) ?? null;
}

export function eliminarArchivoProveedor(id: string): void {
  localStorage.setItem(ARCHIVOS_PROV_KEY, JSON.stringify(listarArchivosProveedor().filter((x) => x.id !== id)));
}

// ── Cotizaciones Cliente ────────────────────────────────────────────────────

const COT_CLIENTE_KEY = "cotizaciones_cliente";

export function listarCotizacionesCliente(cotizacionBase?: string): CotizacionCliente[] {
  if (typeof window === "undefined") return [];
  try {
    const all: CotizacionCliente[] = JSON.parse(localStorage.getItem(COT_CLIENTE_KEY) || "[]");
    return cotizacionBase ? all.filter((c) => c.cotizacionBase === cotizacionBase) : all;
  } catch { return []; }
}

export function guardarCotizacionCliente(c: CotizacionCliente): void {
  const lista = listarCotizacionesCliente();
  const idx = lista.findIndex((x) => x.id === c.id);
  if (idx >= 0) lista[idx] = c; else lista.push(c);
  localStorage.setItem(COT_CLIENTE_KEY, JSON.stringify(lista));
}

export function eliminarCotizacionCliente(id: string): void {
  localStorage.setItem(COT_CLIENTE_KEY, JSON.stringify(listarCotizacionesCliente().filter((x) => x.id !== id)));
}

// ── Migración de catálogo legacy ─────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function migrarCatalogoLegacy(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("catalogo_migrated") === "1") return;

  const oldPaneles = listarCatalogoPaneles();
  const oldMicros = listarCatalogoMicros();
  if (oldPaneles.length === 0 && oldMicros.length === 0) {
    localStorage.setItem("catalogo_migrated", "1");
    return;
  }

  // Crear proveedor placeholder
  const provId = uid();
  guardarProveedor({ id: provId, nombre: "Proveedor (migrado)", contacto: "", telefono: "", notas: "Creado automáticamente al migrar el catálogo anterior" });

  // Migrar paneles
  for (const p of oldPaneles) {
    const prodId = uid();
    guardarProductoPanel({ id: prodId, marca: p.marca, modelo: p.modelo, potencia: p.potencia });
    guardarOferta({ id: uid(), proveedorId: provId, productoId: prodId, tipo: "panel", precio: p.precioPorWatt, fecha: p.fechaActualizacion || new Date().toISOString(), notas: p.notas || "" });
  }

  // Migrar micros
  for (const m of oldMicros) {
    const prodId = uid();
    guardarProductoMicro({ id: prodId, marca: m.marca, modelo: m.modelo, panelesPorUnidad: m.panelesPorUnidad });
    guardarOferta({ id: uid(), proveedorId: provId, productoId: prodId, tipo: "micro", precio: m.precio, precioCable: m.precioCable, fecha: m.fechaActualizacion || new Date().toISOString(), notas: m.notas || "" });
  }

  localStorage.setItem("catalogo_migrated", "1");
}
