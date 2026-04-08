// ── Import-to-Staging Transformer ─────────────────────────────────────────
//
// Phase 4: Converts raw Claude extraction output into staging rows
// ready for Convex insertion.
//
// Pure function. No side effects, no Convex calls.
// Called from catalogo/page.tsx after /api/leer-catalogo returns.

import type { Id } from "../../../convex/_generated/dataModel";
import {
  computeHashFila,
  normalizePrice,
  inferProductType,
  autoMatch,
  type CanonicalProduct,
  type NormalizedPrice,
} from "./import-utils";

// ── Types for Claude extraction output ───────────────────────────────────

/** Shape of a single item from /api/leer-catalogo response */
export interface ExtractedItem {
  tipo: string;
  marca: string;
  modelo: string;
  descripcion: string;
  potencia: number;
  panelesPorUnidad: number;
  precio: number;
  precioTiers: { etiqueta: string; precio: number }[];
  moneda: string;
  unidad: string;
  notas: string;
}

/** Full response from /api/leer-catalogo */
export interface ExtractionResult {
  proveedor: string;
  fechaDocumento: string;
  condiciones: string;
  resumenCondiciones: string;
  items: ExtractedItem[];
}

// ── Types for staging rows ───────────────────────────────────────────────

/** Shape ready for Convex importRowStaging.create / createBatch */
export interface StagingRowInput {
  importRunId: Id<"importRuns">;
  rawData: {
    modelo: string;
    potencia?: string;
    precio?: string;
    moneda?: string;
    unidad?: string;
    marca?: string;
    notas?: string;
    paginaOrigen?: number;
    textoOriginal?: string;
  };
  hashFila: string;
  tipo: "panel" | "micro" | "general" | "desconocido";
  resolution?: "pending" | "matched";
  matchedProductId?: string;
  matchedProductTable?: "productosPaneles" | "productosMicros" | "productosGenerales";
  matchConfidence?: "auto" | "suggested";
  precioNormalizado?: NormalizedPrice;
  precioTiers?: {
    minQty: number;
    maxQty?: number;
    precio: number;
    moneda: string;
    unidad: string;
  }[];
}

// ── Transformer ──────────────────────────────────────────────────────────

/**
 * Transform extracted items into staging rows with auto-matching.
 *
 * @param items - Raw items from Claude extraction
 * @param importRunId - The Convex ID of the import run
 * @param productIndex - Pre-built index of canonical products for matching
 * @param pageNumber - Optional page number (for multi-page imports)
 */
export function transformToStagingRows(
  items: ExtractedItem[],
  importRunId: Id<"importRuns">,
  productIndex: Map<string, CanonicalProduct>,
  pageNumber?: number,
): StagingRowInput[] {
  return items.map((item) => {
    // ── 1. Map tipo from Claude's vocabulary to our staging types ─────
    const tipo = mapTipoToStaging(item.tipo);

    // ── 2. Build raw data (preserving original extraction) ───────────
    const rawData: StagingRowInput["rawData"] = {
      modelo: item.modelo,
      potencia: item.potencia > 0 ? `${item.potencia}W` : undefined,
      precio: item.precio > 0
        ? (item.unidad === "por_watt" ? `$${item.precio}/W` : `$${item.precio}`)
        : undefined,
      moneda: item.moneda || undefined,
      unidad: item.unidad || undefined,
      marca: item.marca || undefined,
      notas: item.notas || undefined,
      paginaOrigen: pageNumber,
      textoOriginal: buildTextoOriginal(item),
    };

    // ── 3. Compute hash ──────────────────────────────────────────────
    const hashFila = computeHashFila({
      modelo: item.modelo,
      precio: rawData.precio,
      textoOriginal: rawData.textoOriginal,
    });

    // ── 4. Try auto-matching ─────────────────────────────────────────
    const match = autoMatch(item.modelo, productIndex);

    // ── 5. Normalize price ───────────────────────────────────────────
    const precioNormalizado = normalizePrice(
      rawData.precio,
      item.moneda,
      item.unidad,
      item.potencia > 0 ? item.potencia : undefined,
    );

    // ── 6. Convert precioTiers ───────────────────────────────────────
    const precioTiers = item.precioTiers.length > 0
      ? convertTiers(item.precioTiers, item.moneda, item.unidad)
      : undefined;

    // ── 7. Build staging row ─────────────────────────────────────────
    const row: StagingRowInput = {
      importRunId,
      rawData,
      hashFila,
      tipo: tipo !== "desconocido" ? tipo : inferProductType(rawData),
      precioNormalizado: precioNormalizado ?? undefined,
      precioTiers,
    };

    if (match) {
      row.resolution = "pending"; // Auto-matched but still pending user confirmation
      row.matchedProductId = match.product.id;
      row.matchedProductTable = match.product.table;
      row.matchConfidence = match.confidence;
    }

    return row;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Map Claude's tipo values to our staging type enum. */
function mapTipoToStaging(
  tipo: string,
): "panel" | "micro" | "general" | "desconocido" {
  switch (tipo.toLowerCase()) {
    case "panel":
      return "panel";
    case "micro":
      return "micro";
    case "cable":
    case "monitoreo":
    case "herramienta":
    case "estructura":
    case "tornilleria":
    case "otro":
      return "general";
    default:
      return "desconocido";
  }
}

/** Build a textoOriginal string from all extracted fields. */
function buildTextoOriginal(item: ExtractedItem): string {
  const parts = [
    item.marca,
    item.modelo,
    item.descripcion,
    item.potencia > 0 ? `${item.potencia}W` : "",
    item.precio > 0
      ? (item.unidad === "por_watt" ? `$${item.precio}/W` : `$${item.precio}`)
      : "",
    item.moneda,
    item.notas,
  ].filter(Boolean);
  return parts.join(" | ");
}

/** Convert Claude's tier format to our staging tier format. */
function convertTiers(
  tiers: { etiqueta: string; precio: number }[],
  moneda: string,
  unidad: string,
): StagingRowInput["precioTiers"] {
  return tiers.map((t, i) => {
    // Try to extract min/max quantities from etiqueta
    const qtyMatch = t.etiqueta.match(/(\d+)/g);
    const minQty = qtyMatch ? Number.parseInt(qtyMatch[0], 10) : i + 1;
    const maxQty = qtyMatch && qtyMatch.length > 1
      ? Number.parseInt(qtyMatch[1], 10)
      : undefined;

    return {
      minQty,
      maxQty,
      precio: t.precio,
      moneda: moneda || "USD",
      unidad: unidad || "por_watt",
    };
  });
}
