// ── Import Utilities ──────────────────────────────────────────────────────
//
// Phase 4: Pure functions for catalog import processing.
// Used by /api/leer-catalogo and potentially by UI components.
//
// No side effects, no Convex calls — just data transformation.

// ── Hash computation ─────────────────────────────────────────────────────

/**
 * Compute a deterministic hash for a staging row.
 * Used to detect duplicates across imports.
 *
 * Based on: modelo (normalized) + precio text + textoOriginal
 */
export function computeHashFila(raw: {
  modelo: string;
  precio?: string;
  textoOriginal?: string;
}): string {
  const normalized = [
    normalizeModelString(raw.modelo),
    (raw.precio ?? "").trim().toLowerCase(),
    (raw.textoOriginal ?? "").trim().toLowerCase(),
  ].join("|");

  // Simple string hash (djb2) — deterministic and fast.
  // Not cryptographic, but sufficient for dedup.
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) | 0;
  }
  // Convert to hex, ensure positive
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// ── String normalization ─────────────────────────────────────────────────

/**
 * Normalize a model string for matching:
 * - lowercase
 * - remove spaces, dashes, underscores
 * - trim
 */
export function normalizeModelString(model: string): string {
  return model
    .toLowerCase()
    .replace(/[\s\-_]/g, "")
    .trim();
}

// ── Auto-matching ────────────────────────────────────────────────────────

export interface CanonicalProduct {
  id: string;
  table: "productosPaneles" | "productosMicros" | "productosGenerales";
  modelo: string;
  marca: string;
  aliases: string[];
  /** Normalized modelo + aliases for fast lookup */
  normalizedNames: string[];
}

/**
 * Build a lookup index from canonical products for fast matching.
 */
export function buildProductIndex(products: CanonicalProduct[]): Map<string, CanonicalProduct> {
  const index = new Map<string, CanonicalProduct>();
  for (const p of products) {
    for (const name of p.normalizedNames) {
      // First match wins (if two products normalize to the same string,
      // keep the first — user can resolve manually)
      if (!index.has(name)) {
        index.set(name, p);
      }
    }
  }
  return index;
}

/**
 * Try to auto-match a raw modelo string against the product index.
 *
 * Returns the matched product and confidence level, or null if no match.
 */
export function autoMatch(
  rawModelo: string,
  productIndex: Map<string, CanonicalProduct>,
): { product: CanonicalProduct; confidence: "auto" | "suggested" } | null {
  const normalized = normalizeModelString(rawModelo);

  // 1. Exact match (after normalization)
  const exact = productIndex.get(normalized);
  if (exact) return { product: exact, confidence: "auto" };

  // 2. Substring match: check if any product name is contained in the raw string
  //    or vice versa (e.g., "RSM144-10-545BHDG" matching "RSM14410545BHDG")
  //    Guards: minimum 6 chars on both sides, and >70% length ratio.
  if (normalized.length >= 6) {
    for (const [key, product] of productIndex) {
      if (key.length < 6) continue;
      if (normalized.includes(key) || key.includes(normalized)) {
        const shorter = Math.min(normalized.length, key.length);
        const longer = Math.max(normalized.length, key.length);
        if (shorter / longer > 0.7) {
          return { product, confidence: "suggested" };
        }
      }
    }
  }

  return null;
}

// ── Product type detection ───────────────────────────────────────────────

/**
 * Infer product type from raw extracted data.
 * Uses heuristics based on common patterns in solar equipment catalogs.
 */
export function inferProductType(raw: {
  modelo: string;
  potencia?: string;
  marca?: string;
  notas?: string;
}): "panel" | "micro" | "general" | "desconocido" {
  const modelo = raw.modelo.toLowerCase();
  const potencia = (raw.potencia ?? "").toLowerCase();
  const notas = (raw.notas ?? "").toLowerCase();
  const marca = (raw.marca ?? "").toLowerCase();

  // Panel indicators
  const panelKeywords = ["solar", "mono", "poly", "bifacial", "perc", "topcon", "hjt"];
  const panelBrands = ["risen", "longi", "canadian", "trina", "jinko", "ja solar", "seraphim"];
  const panelWattage = /\b[3-7]\d{2}\s*w/i;

  if (
    panelBrands.some((b) => marca.includes(b) || modelo.includes(b)) ||
    panelKeywords.some((k) => modelo.includes(k) || notas.includes(k)) ||
    panelWattage.test(raw.potencia ?? "") ||
    panelWattage.test(raw.modelo) ||
    (potencia && /w/i.test(potencia) && Number.parseInt(potencia) >= 300)
  ) {
    return "panel";
  }

  // Micro indicators
  const microKeywords = ["micro", "inversor", "inverter", "gateway", "ecu", "ds3", "iq", "enphase", "apsystems", "hoymiles"];
  if (
    microKeywords.some((k) => modelo.includes(k) || marca.includes(k) || notas.includes(k))
  ) {
    return "micro";
  }

  // General (cable, structure, tools)
  const generalKeywords = ["cable", "conector", "mc4", "aluminio", "riel", "clamp", "tornillo", "herramienta", "end cap"];
  if (
    generalKeywords.some((k) => modelo.includes(k) || notas.includes(k))
  ) {
    return "general";
  }

  return "desconocido";
}

// ── Price normalization ──────────────────────────────────────────────────

export interface NormalizedPrice {
  valor: number;
  moneda: string;
  unidad: string;
  valorPorWatt?: number;
}

/**
 * Parse and normalize a raw price string from PDF extraction.
 *
 * Handles formats like:
 * - "$0.185/W" → { valor: 0.185, moneda: "USD", unidad: "por_watt" }
 * - "$125.00" → { valor: 125, moneda: "USD", unidad: "por_pieza" }
 * - "3,250 MXN" → { valor: 3250, moneda: "MXN", unidad: "por_pieza" }
 */
export function normalizePrice(
  rawPrecio: string | undefined,
  rawMoneda: string | undefined,
  rawUnidad: string | undefined,
  potenciaW?: number,
): NormalizedPrice | null {
  if (!rawPrecio) return null;

  // Clean price string
  let cleanPrice = rawPrecio
    .replace(/[$,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Detect /W or /Watt suffix
  const isPerWatt = /\/w(att)?/i.test(cleanPrice) ||
    (rawUnidad ?? "").toLowerCase().includes("watt") ||
    (rawUnidad ?? "").toLowerCase().includes("por_watt");

  // Remove unit suffixes for parsing
  cleanPrice = cleanPrice.replace(/\/w(att)?/i, "").trim();

  // Parse number
  const valor = Number.parseFloat(cleanPrice);
  if (!Number.isFinite(valor) || valor <= 0) return null;

  // Determine currency
  let moneda = (rawMoneda ?? "USD").toUpperCase();
  if (moneda !== "USD" && moneda !== "MXN") {
    // Default to USD for unrecognized currencies (most supplier PDFs are USD)
    moneda = "USD";
  }

  const unidad = isPerWatt ? "por_watt" : "por_pieza";

  // Calculate per-watt if we have a per-piece price and potencia
  let valorPorWatt: number | undefined;
  if (isPerWatt) {
    valorPorWatt = valor;
  } else if (potenciaW && potenciaW > 0) {
    valorPorWatt = valor / potenciaW;
  }

  return { valor, moneda, unidad, valorPorWatt };
}
