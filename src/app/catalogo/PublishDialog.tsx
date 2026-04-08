"use client";

// ── PublishDialog ────────────────────────────────────────────────────────
// Pre-publish confirmation dialog for an approved import run.
//
// Shows: summary of staging rows, comparison against previous active list,
// extreme price change warnings, and version info.
//
// Phase 4 UI — Step 5

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

// ── Types ─────────────────────────────────────────────────────────────────

type ImportRun = Doc<"importRuns">;
type StagingRow = Doc<"importRowStaging">;
type PriceListItem = Doc<"priceListItems">;

export interface PublishDialogProps {
  runId: Id<"importRuns">;
  run: ImportRun;
  proveedorNombre: string;
  onClose: () => void;
  onPublished: () => void;
}

// ── Thresholds ────────────────────────────────────────────────────────────

const EXTREME_CHANGE_PCT = 20; // warn if |delta| > 20%

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtPrice(valor: number, moneda: string, unidad: string): string {
  const sym = moneda === "MXN" ? "$" : "US$";
  const decimals = unidad === "por_watt" ? 3 : 2;
  const suffix = unidad === "por_watt" ? "/W" : "";
  return `${sym}${valor.toFixed(decimals)}${suffix} ${moneda}`;
}

function fmtPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function daysBetween(a: number, b: number): number {
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

// ── Comparison logic ──────────────────────────────────────────────────────

interface PriceComparison {
  productoId: string;
  modelo: string;
  oldPrice: number;
  newPrice: number;
  moneda: string;
  unidad: string;
  deltaPct: number;
}

interface ComparisonSummary {
  prevVersion: number;
  prevDate: number;
  prevItemCount: number;
  /** Stats computed only for the dominant currency+unit */
  statsMoneda: string;
  statsUnidad: string;
  statsCount: number;
  avgOld: number;
  avgNew: number;
  avgDeltaPct: number;
  medianOld: number;
  medianNew: number;
  medianDeltaPct: number;
  /** True if comparisons span multiple currencies (stats may be incomplete) */
  mixedCurrencies: boolean;
  itemsNuevos: number;
  itemsRemovidos: number;
  itemsSinCambio: number;
  extremeChanges: PriceComparison[];
}

function buildComparison(
  stagingRows: StagingRow[],
  prevItems: PriceListItem[],
  prevList: Doc<"priceLists">,
  dominantCurrency: string,
): ComparisonSummary {
  // Build maps: productoId → price
  const prevMap = new Map<string, PriceListItem>();
  for (const item of prevItems) {
    prevMap.set(item.productoId, item);
  }

  const publishable = stagingRows.filter(
    (r) => (r.resolution === "matched" || r.resolution === "new") &&
           r.matchedProductId && r.precioNormalizado,
  );

  const newMap = new Map<string, StagingRow>();
  for (const row of publishable) {
    newMap.set(row.matchedProductId!, row);
  }

  const comparisons: PriceComparison[] = [];
  let sinCambio = 0;

  // Items that exist in both lists
  for (const row of publishable) {
    const prevItem = prevMap.get(row.matchedProductId!);
    if (!prevItem) continue; // new item

    const oldPrice = prevItem.precio;
    const newPrice = row.precioNormalizado!.valor;

    if (oldPrice === 0) continue; // skip division by zero

    const deltaPct = ((newPrice - oldPrice) / oldPrice) * 100;

    if (Math.abs(deltaPct) < 0.5) {
      sinCambio++;
    } else {
      comparisons.push({
        productoId: row.matchedProductId!,
        modelo: row.rawData.modelo,
        oldPrice,
        newPrice,
        moneda: row.precioNormalizado!.moneda,
        unidad: row.precioNormalizado!.unidad,
        deltaPct,
      });
    }
  }

  // Items only in new (not in prev)
  const itemsNuevos = publishable.filter(
    (r) => !prevMap.has(r.matchedProductId!),
  ).length;

  // Items only in prev (not in new)
  const itemsRemovidos = [...prevMap.keys()].filter(
    (pid) => !newMap.has(pid),
  ).length;

  // Price averages and medians — only for dominant currency+unit to avoid mixing USD/MXN or /W vs /pza
  const dominantUnit = (() => {
    const unitCounts = new Map<string, number>();
    for (const c of comparisons) {
      if (c.moneda === dominantCurrency) {
        unitCounts.set(c.unidad, (unitCounts.get(c.unidad) ?? 0) + 1);
      }
    }
    let best = "por_watt";
    let bestCount = 0;
    for (const [u, n] of unitCounts) {
      if (n > bestCount) { best = u; bestCount = n; }
    }
    return best;
  })();

  const sameCurrency = comparisons.filter(
    (c) => c.moneda === dominantCurrency && c.unidad === dominantUnit,
  );
  const mixedCurrencies = sameCurrency.length < comparisons.length;

  const oldPrices = sameCurrency.map((c) => c.oldPrice);
  const newPrices = sameCurrency.map((c) => c.newPrice);

  const avgOld = average(oldPrices);
  const avgNew = average(newPrices);
  const medOld = median(oldPrices);
  const medNew = median(newPrices);

  const avgDeltaPct = avgOld > 0 ? ((avgNew - avgOld) / avgOld) * 100 : 0;
  const medianDeltaPct = medOld > 0 ? ((medNew - medOld) / medOld) * 100 : 0;

  // Extreme changes include ALL currencies (each shown with its own moneda)
  const extremeChanges = comparisons
    .filter((c) => Math.abs(c.deltaPct) > EXTREME_CHANGE_PCT)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  return {
    prevVersion: prevList.version,
    prevDate: prevList.fechaPublicacion,
    prevItemCount: prevItems.length,
    statsMoneda: dominantCurrency,
    statsUnidad: dominantUnit,
    statsCount: sameCurrency.length,
    avgOld,
    avgNew,
    avgDeltaPct,
    medianOld: medOld,
    medianNew: medNew,
    medianDeltaPct,
    mixedCurrencies,
    itemsNuevos,
    itemsRemovidos,
    itemsSinCambio: sinCambio,
    extremeChanges,
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function PublishDialog({
  runId,
  run,
  proveedorNombre,
  onClose,
  onPublished,
}: PublishDialogProps) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────
  const rows = useQuery(api.importRowStaging.listByImportRun, { importRunId: runId });
  const prevList = useQuery(api.priceLists.getActive, { proveedorId: run.proveedorId });
  const prevItems = useQuery(
    api.priceLists.listItems,
    prevList?._id ? { priceListId: prevList._id } : "skip",
  );
  const allLists = useQuery(api.priceLists.listByProveedor, { proveedorId: run.proveedorId });

  const publishMut = useMutation(api.priceLists.publish);

  // ── Derived data ─────────────────────────────────────────────────────
  const isLoading = !rows || allLists === undefined || prevList === undefined;

  const counts = useMemo(() => {
    if (!rows) return { matched: 0, new_: 0, discarded: 0, total: 0, publishable: 0 };
    let matched = 0, new_ = 0, discarded = 0;
    for (const r of rows) {
      if (r.resolution === "matched") matched++;
      else if (r.resolution === "new") new_++;
      else if (r.resolution === "discarded") discarded++;
    }
    return { matched, new_, discarded, total: rows.length, publishable: matched + new_ };
  }, [rows]);

  // Dominant currency
  const currencyBreakdown = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, number>();
    for (const r of rows) {
      if ((r.resolution === "matched" || r.resolution === "new") && r.precioNormalizado) {
        const m = r.precioNormalizado.moneda;
        map.set(m, (map.get(m) ?? 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const monedaPrincipal = currencyBreakdown[0]?.[0] ?? "USD";

  // Version
  const nextVersion = (allLists?.length ?? 0) + 1;

  // Comparison with previous list
  const comparison = useMemo(() => {
    if (!rows || !prevList || !prevItems) return null;
    return buildComparison(rows, prevItems, prevList, monedaPrincipal);
  }, [rows, prevList, prevItems, monedaPrincipal]);

  // ── Publish handler ──────────────────────────────────────────────────
  const handlePublish = async () => {
    if (publishing) return; // double-click guard
    setPublishing(true);
    setError("");

    try {
      const nombre = `${proveedorNombre} — v${nextVersion}`;
      await publishMut({
        importRunId: runId,
        nombre,
        monedaPrincipal,
      });
      onPublished();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar");
      setPublishing(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-100">Publicar lista de precios</h3>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Run info */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Proveedor</span>
                  <span className="text-zinc-200 font-medium">{proveedorNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Archivo</span>
                  <span className="text-zinc-300 font-mono">{run.nombreArchivo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Fecha importación</span>
                  <span className="text-zinc-400">
                    {new Date(run.creadoEn).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Resumen */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Resumen</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-green-400">✓ {counts.matched} asociados</span>
                  <span className="text-blue-400">+ {counts.new_} nuevos</span>
                  <span className="text-zinc-500">✕ {counts.discarded} descartados</span>
                  <span className="text-zinc-300 font-medium">
                    Total: {counts.publishable} items
                  </span>
                </div>
              </div>

              {/* Moneda */}
              <div className="text-xs">
                <span className="text-zinc-500">Moneda: </span>
                {currencyBreakdown.map(([m, n], i) => (
                  <span key={m} className="text-zinc-300">
                    {i > 0 && <span className="text-zinc-600"> · </span>}
                    {m} ({n} items)
                  </span>
                ))}
              </div>

              {/* Comparison with previous list */}
              {comparison ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                    vs. Lista anterior
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    v{comparison.prevVersion} — hace {daysBetween(comparison.prevDate, Date.now())} días — {comparison.prevItemCount} items
                  </p>

                  {/* Price stats — filtered by dominant currency */}
                  {comparison.statsCount > 0 && (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">
                          Promedio ({comparison.statsMoneda}{comparison.statsUnidad === "por_watt" ? "/W" : ""}, {comparison.statsCount} items)
                        </span>
                        <span className="text-zinc-300">
                          {comparison.avgOld.toFixed(3)} → {comparison.avgNew.toFixed(3)}{" "}
                          <span className={comparison.avgDeltaPct < 0 ? "text-green-400" : comparison.avgDeltaPct > 0 ? "text-red-400" : "text-zinc-500"}>
                            ({fmtPct(comparison.avgDeltaPct)})
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Mediana</span>
                        <span className="text-zinc-300">
                          {comparison.medianOld.toFixed(3)} → {comparison.medianNew.toFixed(3)}{" "}
                          <span className={comparison.medianDeltaPct < 0 ? "text-green-400" : comparison.medianDeltaPct > 0 ? "text-red-400" : "text-zinc-500"}>
                            ({fmtPct(comparison.medianDeltaPct)})
                          </span>
                        </span>
                      </div>
                      {comparison.mixedCurrencies && (
                        <p className="text-[10px] text-amber-400/70">
                          ⚠ Estadísticas solo para {comparison.statsMoneda}{comparison.statsUnidad === "por_watt" ? "/W" : "/pza"} — hay items con otra moneda o unidad
                        </p>
                      )}
                    </div>
                  )}

                  {/* Item changes */}
                  <div className="flex gap-3 text-xs text-zinc-400">
                    {comparison.itemsNuevos > 0 && (
                      <span className="text-blue-400">+{comparison.itemsNuevos} nuevos</span>
                    )}
                    {comparison.itemsRemovidos > 0 && (
                      <span className="text-red-400">-{comparison.itemsRemovidos} removidos</span>
                    )}
                    {comparison.itemsSinCambio > 0 && (
                      <span>{comparison.itemsSinCambio} sin cambio</span>
                    )}
                  </div>

                  {/* Extreme changes */}
                  {comparison.extremeChanges.length > 0 && (
                    <div className="mt-1 rounded border border-amber-400/20 bg-amber-400/5 p-2 space-y-1">
                      <p className="text-[11px] text-amber-400 font-medium">
                        ⚠ {comparison.extremeChanges.length} item{comparison.extremeChanges.length !== 1 ? "s" : ""} con cambio &gt; {EXTREME_CHANGE_PCT}%
                      </p>
                      {comparison.extremeChanges.slice(0, 5).map((c) => (
                        <p key={c.productoId} className="text-[11px] text-zinc-400">
                          {c.modelo}:{" "}
                          <span className="text-zinc-300">
                            {fmtPrice(c.oldPrice, c.moneda, c.unidad)}
                          </span>
                          {" → "}
                          <span className="text-zinc-300">
                            {fmtPrice(c.newPrice, c.moneda, c.unidad)}
                          </span>
                          {" "}
                          <span className={c.deltaPct < 0 ? "text-green-400" : "text-red-400"}>
                            ({fmtPct(c.deltaPct)})
                          </span>
                        </p>
                      ))}
                      {comparison.extremeChanges.length > 5 && (
                        <p className="text-[10px] text-zinc-600">
                          ...y {comparison.extremeChanges.length - 5} más
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : prevList === null ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <p className="text-xs text-zinc-500">
                    Primera lista de precios para este proveedor
                  </p>
                </div>
              ) : null}

              {/* Version info */}
              <div className="text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Se creará como</span>
                  <span className="text-zinc-200 font-semibold">v{nextVersion}</span>
                </div>
                {prevList && (
                  <p className="text-zinc-600 text-[11px]">
                    La lista anterior (v{prevList.version}) se desactivará
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-4">
          <div>
            {error && (
              <span className="text-xs text-red-400">{error}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={publishing}
              className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || isLoading}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                publishing || isLoading
                  ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                  : "bg-emerald-400 text-zinc-900 hover:bg-emerald-300"
              }`}
            >
              {publishing ? (
                <>
                  <span className="w-3 h-3 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  Publicando...
                </>
              ) : (
                <>Publicar v{nextVersion} ✓</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
