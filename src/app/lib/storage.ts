import {
  CotizacionData,
  CotizacionGuardada,
  CatalogoPanel,
  CatalogoMicro,
  SeguimientoData,
  Proveedor,
  ProductoPanel,
  ProductoMicro,
  ProductoGeneral,
  Oferta,
  CotizacionCliente,
  ArchivoProveedor,
  TipoOferta,
} from "./types";

// ── Constantes de tipos ──────────────────────────────────────────────────────

export const TIPO_LABELS: Record<TipoOferta, string> = {
  panel: "Panel",
  micro: "Microinversor",
  monitoreo: "Monitoreo/ECU",
  herramienta: "Herramienta",
  cable: "Cable/Protección",
  estructura: "Estructura",
  tornilleria: "Tornillería",
  otro: "Otro",
};

export const TIPOS_GENERALES: TipoOferta[] = ["monitoreo", "herramienta", "cable", "estructura", "tornilleria", "otro"];

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

// ── Productos — Generales (monitoreo, cable, herramienta, etc.) ─────────────

const PROD_GENERALES_KEY = "productos_general";

export function listarProductosGenerales(): ProductoGeneral[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(PROD_GENERALES_KEY) || "[]");
}

export function guardarProductoGeneral(p: ProductoGeneral): void {
  const all = listarProductosGenerales();
  const idx = all.findIndex((x) => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  localStorage.setItem(PROD_GENERALES_KEY, JSON.stringify(all));
}

export function eliminarProductoGeneral(id: string): void {
  localStorage.setItem(PROD_GENERALES_KEY, JSON.stringify(listarProductosGenerales().filter((x) => x.id !== id)));
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

// ── Consolidar proveedores duplicados ────────────────────────────────────────

const normalizeName = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").trim();

/**
 * Merges proveedores with the same normalized name into a single entity.
 * Updates all references in ofertas and archivos_proveedor.
 * Returns true if any merges were performed.
 */
export function consolidarProveedores(): boolean {
  if (typeof window === "undefined") return false;
  const proveedores = listarProveedores();
  if (proveedores.length <= 1) return false;

  // Group by normalized name
  const groups = new Map<string, Proveedor[]>();
  for (const p of proveedores) {
    const key = normalizeName(p.nombre);
    const group = groups.get(key) || [];
    group.push(p);
    groups.set(key, group);
  }

  // Find groups with duplicates
  const merges: { keep: Proveedor; remove: string[] }[] = [];
  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    // Keep the one with the longest name (most complete), or first
    const sorted = [...group].sort((a, b) => b.nombre.length - a.nombre.length || a.id.localeCompare(b.id));
    const keep = sorted[0];
    const removeIds = sorted.slice(1).map((p) => p.id);
    merges.push({ keep, remove: removeIds });
  }

  if (merges.length === 0) return false;

  // Build a mapping: old ID → new ID
  const idMap = new Map<string, string>();
  for (const { keep, remove } of merges) {
    for (const oldId of remove) {
      idMap.set(oldId, keep.id);
    }
  }

  // Update ofertas
  const ofertas = listarOfertas();
  let ofertasChanged = false;
  for (const o of ofertas) {
    const newId = idMap.get(o.proveedorId);
    if (newId) { o.proveedorId = newId; ofertasChanged = true; }
  }
  if (ofertasChanged) {
    localStorage.setItem(OFERTAS_KEY, JSON.stringify(ofertas));
  }

  // Update archivos
  const archivos = listarArchivosProveedor();
  let archivosChanged = false;
  for (const a of archivos) {
    const newId = idMap.get(a.proveedorId);
    if (newId) { a.proveedorId = newId; archivosChanged = true; }
  }
  if (archivosChanged) {
    localStorage.setItem(ARCHIVOS_PROV_KEY, JSON.stringify(archivos));
  }

  // Remove duplicate proveedores
  const removeSet = new Set<string>();
  for (const { remove } of merges) remove.forEach((id) => removeSet.add(id));
  const cleaned = proveedores.filter((p) => !removeSet.has(p.id));
  localStorage.setItem(PROVEEDORES_KEY, JSON.stringify(cleaned));

  return true;
}

/**
 * Merges duplicate products (same normalized marca+modelo) into a single entity.
 * Updates all ofertas to point to the surviving product.
 */
// Extract the core model code from a description string.
// E.g. "TRINA BIFACIAL TSM-NEG19RC.20-630W" → "tsm-neg19rc.20-630w"
// E.g. "RENESOLA N-TYPE BIFACIAL RS5J-640NBG-E1" → "rs5j-640nbg-e1"
// Strategy: find the token that looks most like a model code (has digits + letters + dashes/dots)
function extractModelCode(modelo: string): string {
  const norm = modelo.trim().toLowerCase();
  // Split into tokens and score each by "model-code-likeness"
  const tokens = norm.split(/\s+/);
  let best = "";
  let bestScore = 0;
  for (const t of tokens) {
    const hasDigit = /\d/.test(t);
    const hasDash = /[-.]/.test(t);
    const hasLetter = /[a-z]/.test(t);
    const len = t.length;
    // Skip common descriptive words
    if (/^(bifacial|doble|vidrio|anti-dust|n-type|topcon|black|frame|type|mono|poly|perc|hjt|half|cut|cell)$/.test(t)) continue;
    // Skip brand names that may appear in model field
    if (/^(trina|canadian|solar|renesola|longi|jinko|ja|risen|hanwha|qcells|aps)$/.test(t)) continue;
    const score = (hasDigit ? 3 : 0) + (hasDash ? 2 : 0) + (hasLetter ? 1 : 0) + (len > 6 ? 2 : 0);
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best || normalizeName(modelo);
}

// Check if two panels are the same product using fuzzy model matching
function isSamePanel(a: ProductoPanel, b: ProductoPanel): boolean {
  if (normalizeName(a.marca) !== normalizeName(b.marca)) return false;
  // Exact match after normalization
  if (normalizeName(a.modelo) === normalizeName(b.modelo)) return true;
  // Same potencia + one modelo contains the other
  if (a.potencia === b.potencia) {
    const na = normalizeName(a.modelo);
    const nb = normalizeName(b.modelo);
    if (na.includes(nb) || nb.includes(na)) return true;
  }
  // Same core model code + same potencia
  if (a.potencia === b.potencia) {
    const ca = extractModelCode(a.modelo);
    const cb = extractModelCode(b.modelo);
    if (ca && cb && ca === cb) return true;
  }
  return false;
}

function isSameMicro(a: ProductoMicro, b: ProductoMicro): boolean {
  if (normalizeName(a.marca) !== normalizeName(b.marca)) return false;
  if (normalizeName(a.modelo) === normalizeName(b.modelo)) return true;
  const na = normalizeName(a.modelo);
  const nb = normalizeName(b.modelo);
  if (na.includes(nb) || nb.includes(na)) return true;
  const ca = extractModelCode(a.modelo);
  const cb = extractModelCode(b.modelo);
  if (ca && cb && ca === cb) return true;
  return false;
}

export function consolidarProductos(): boolean {
  if (typeof window === "undefined") return false;

  let changed = false;

  // ── Panels: fuzzy grouping ──
  const paneles = listarProductosPaneles();
  const panelIdMap = new Map<string, string>();
  const panelRemove = new Set<string>();
  // Build groups using pairwise comparison
  const panelGroups: ProductoPanel[][] = [];
  const assigned = new Set<string>();
  for (let i = 0; i < paneles.length; i++) {
    if (assigned.has(paneles[i].id)) continue;
    const group = [paneles[i]];
    assigned.add(paneles[i].id);
    for (let j = i + 1; j < paneles.length; j++) {
      if (assigned.has(paneles[j].id)) continue;
      if (isSamePanel(paneles[i], paneles[j])) {
        group.push(paneles[j]);
        assigned.add(paneles[j].id);
      }
    }
    if (group.length > 1) panelGroups.push(group);
  }
  for (const group of panelGroups) {
    // Keep the one with the shortest modelo (cleaner name)
    group.sort((a, b) => a.modelo.length - b.modelo.length);
    const keep = group[0];
    // Collect all alternate names as aliases
    const existingAliases = new Set(keep.aliases || []);
    for (let i = 1; i < group.length; i++) {
      const alt = `${group[i].marca} — ${group[i].modelo}`;
      existingAliases.add(alt);
      // Also carry over any aliases from the removed product
      if (group[i].aliases) group[i].aliases!.forEach((a) => existingAliases.add(a));
      panelIdMap.set(group[i].id, keep.id);
      panelRemove.add(group[i].id);
    }
    keep.aliases = [...existingAliases];
  }

  // ── Micros: fuzzy grouping ──
  const micros = listarProductosMicros();
  const microIdMap = new Map<string, string>();
  const microRemove = new Set<string>();
  const microGroups: ProductoMicro[][] = [];
  const mAssigned = new Set<string>();
  for (let i = 0; i < micros.length; i++) {
    if (mAssigned.has(micros[i].id)) continue;
    const group = [micros[i]];
    mAssigned.add(micros[i].id);
    for (let j = i + 1; j < micros.length; j++) {
      if (mAssigned.has(micros[j].id)) continue;
      if (isSameMicro(micros[i], micros[j])) {
        group.push(micros[j]);
        mAssigned.add(micros[j].id);
      }
    }
    if (group.length > 1) microGroups.push(group);
  }
  for (const group of microGroups) {
    group.sort((a, b) => a.modelo.length - b.modelo.length);
    const keep = group[0];
    const existingAliases = new Set(keep.aliases || []);
    for (let i = 1; i < group.length; i++) {
      const alt = `${group[i].marca} — ${group[i].modelo}`;
      existingAliases.add(alt);
      if (group[i].aliases) group[i].aliases!.forEach((a) => existingAliases.add(a));
      microIdMap.set(group[i].id, keep.id);
      microRemove.add(group[i].id);
    }
    keep.aliases = [...existingAliases];
  }

  // Update ofertas with new product IDs
  if (panelIdMap.size > 0 || microIdMap.size > 0) {
    const ofertas = listarOfertas();
    let ofChanged = false;
    for (const o of ofertas) {
      const newId = panelIdMap.get(o.productoId) || microIdMap.get(o.productoId);
      if (newId) { o.productoId = newId; ofChanged = true; }
    }
    if (ofChanged) localStorage.setItem(OFERTAS_KEY, JSON.stringify(ofertas));
  }

  // Remove duplicate products and save updated aliases
  if (panelRemove.size > 0 || panelGroups.length > 0) {
    localStorage.setItem(PROD_PANELES_KEY, JSON.stringify(paneles.filter((p) => !panelRemove.has(p.id))));
    if (panelRemove.size > 0) changed = true;
  }
  if (microRemove.size > 0 || microGroups.length > 0) {
    localStorage.setItem(PROD_MICROS_KEY, JSON.stringify(micros.filter((m) => !microRemove.has(m.id))));
    if (microRemove.size > 0) changed = true;
  }

  return changed;
}

// Reconstruct aliases from offer notas for products that were merged without saving aliases.
// The notas contain the original PDF description (first segment before " · ").
export function reconstruirAliases(): boolean {
  if (typeof window === "undefined") return false;

  const paneles = listarProductosPaneles();
  const micros = listarProductosMicros();
  const ofertas = listarOfertas();
  let changed = false;

  for (const p of paneles) {
    const ofertasProd = ofertas.filter((o) => o.productoId === p.id);
    const existingAliases = new Set(p.aliases || []);
    const before = existingAliases.size;
    for (const o of ofertasProd) {
      if (!o.notas) continue;
      // The first segment of notas is the original descripcion from the PDF
      const desc = o.notas.split(" · ")[0].trim();
      if (!desc) continue;
      // Only add if it's meaningfully different from the current modelo
      if (normalizeName(desc) !== normalizeName(p.modelo) &&
          normalizeName(desc) !== normalizeName(`${p.marca} ${p.modelo}`) &&
          desc.length > 3) {
        existingAliases.add(desc);
      }
    }
    if (existingAliases.size > before) {
      p.aliases = [...existingAliases];
      changed = true;
    }
  }

  for (const m of micros) {
    const ofertasProd = ofertas.filter((o) => o.productoId === m.id);
    const existingAliases = new Set(m.aliases || []);
    const before = existingAliases.size;
    for (const o of ofertasProd) {
      if (!o.notas) continue;
      const desc = o.notas.split(" · ")[0].trim();
      if (!desc) continue;
      if (normalizeName(desc) !== normalizeName(m.modelo) &&
          normalizeName(desc) !== normalizeName(`${m.marca} ${m.modelo}`) &&
          desc.length > 3) {
        existingAliases.add(desc);
      }
    }
    if (existingAliases.size > before) {
      m.aliases = [...existingAliases];
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(PROD_PANELES_KEY, JSON.stringify(paneles));
    localStorage.setItem(PROD_MICROS_KEY, JSON.stringify(micros));
  }

  return changed;
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
