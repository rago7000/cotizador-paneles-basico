"use client";

// ── StagingReview ─────────────────────────────────────────────────────────
// Main staging review table with inline editing.
// Shows all extracted rows from an import run with status indicators.
//
// Phase 4 UI — Steps 2-4: Table + Batch actions + Inline editing

import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import type { CanonicalProduct } from "../lib/import-utils";
import StagingActions from "./StagingActions";
import InlinePriceEdit from "./InlinePriceEdit";
import InlineMatchEdit from "./InlineMatchEdit";

// ── Types ─────────────────────────────────────────────────────────────────

type StagingRow = Doc<"importRowStaging">;
type ImportRun = Doc<"importRuns">;

export interface StagingReviewProps {
  runId: Id<"importRuns">;
  run: ImportRun;
  canonicalProducts: CanonicalProduct[];
  onBack: () => void;
  onApproved: () => void;
}

// ── Resolution visual config ──────────────────────────────────────────────

const RESOLUTION_CONFIG: Record<
  StagingRow["resolution"],
  { icon: string; label: string; rowClass: string; textClass: string }
> = {
  pending: {
    icon: "?",
    label: "Pendiente",
    rowClass: "bg-amber-400/5 border-l-2 border-l-amber-400",
    textClass: "text-amber-400",
  },
  matched: {
    icon: "✓",
    label: "Asociado",
    rowClass: "bg-green-400/5 border-l-2 border-l-green-500",
    textClass: "text-green-400",
  },
  new: {
    icon: "+",
    label: "Nuevo",
    rowClass: "bg-blue-400/5 border-l-2 border-l-blue-500",
    textClass: "text-blue-400",
  },
  discarded: {
    icon: "✕",
    label: "Descartado",
    rowClass: "bg-zinc-800/50 border-l-2 border-l-zinc-700 opacity-60",
    textClass: "text-zinc-500",
  },
};

const CONFIDENCE_BADGE: Record<string, { label: string; cls: string }> = {
  auto: { label: "auto", cls: "bg-green-400/15 text-green-400" },
  suggested: { label: "sugerido", cls: "bg-yellow-400/15 text-yellow-500" },
  manual: { label: "manual", cls: "bg-blue-400/15 text-blue-400" },
};

const TIPO_LABELS: Record<string, string> = {
  panel: "Panel",
  micro: "Micro",
  general: "General",
  desconocido: "?",
};

// ── Helpers ───────────────────────────────────────────────────────────────

/** Extract potencia in watts from rawData.potencia string like "545W" */
function parsePotenciaW(raw?: string): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function StagingReview({
  runId,
  run,
  canonicalProducts,
  onBack,
  onApproved,
}: StagingReviewProps) {
  const rows = useQuery(api.importRowStaging.listByImportRun, { importRunId: runId });
  const approveMut = useMutation(api.importRuns.approve);
  const updateRow = useMutation(api.importRowStaging.update);

  // ── Counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    if (!rows) return { total: 0, pending: 0, matched: 0, new_: 0, discarded: 0, autoMatchable: 0 };
    let pending = 0, matched = 0, new_ = 0, discarded = 0, autoMatchable = 0;
    for (const r of rows) {
      if (r.resolution === "pending") {
        pending++;
        if (r.matchConfidence === "auto" && r.matchedProductId) autoMatchable++;
      }
      else if (r.resolution === "matched") matched++;
      else if (r.resolution === "new") new_++;
      else if (r.resolution === "discarded") discarded++;
    }
    return { total: rows.length, pending, matched, new_, discarded, autoMatchable };
  }, [rows]);

  const canApprove = counts.pending === 0 && (counts.matched + counts.new_) > 0;
  const isPublished = run.status === "published";
  const isReadOnly = isPublished || run.status === "approved";

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleApprove = async () => {
    try {
      await approveMut({ id: runId });
      onApproved();
    } catch (err) {
      console.error("Error approving:", err);
    }
  };

  const handleToggleDiscard = async (row: StagingRow) => {
    if (isReadOnly) return;
    if (row.resolution === "discarded") {
      await updateRow({ id: row._id, resolution: "pending" });
    } else if (row.resolution === "pending" && !row.matchedProductId) {
      await updateRow({ id: row._id, resolution: "discarded" });
    }
  };

  const handlePriceSave = async (
    rowId: Id<"importRowStaging">,
    currentResolution: StagingRow["resolution"],
    price: { valor: number; moneda: string; unidad: string; valorPorWatt?: number },
  ) => {
    await updateRow({
      id: rowId,
      resolution: currentResolution, // Preserve current resolution when editing price
      precioNormalizado: price,
    });
  };

  const handleMatchSave = async (
    rowId: Id<"importRowStaging">,
    match: {
      matchedProductId: string | undefined;
      matchedProductTable: "productosPaneles" | "productosMicros" | "productosGenerales" | undefined;
      matchConfidence: "manual" | undefined;
      resolution: "matched" | "pending";
    },
  ) => {
    const isClear = !match.matchedProductId;
    await updateRow({
      id: rowId,
      resolution: match.resolution,
      ...(isClear
        ? { clearMatch: true }
        : {
            matchedProductId: match.matchedProductId,
            matchedProductTable: match.matchedProductTable,
            matchConfidence: match.matchConfidence,
          }),
    });
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (!rows) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            ← Volver
          </button>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              {run.nombreArchivo}
            </h2>
            <p className="text-xs text-zinc-500">
              {counts.total} filas extraídas
            </p>
          </div>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleApprove}
            disabled={!canApprove}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              canApprove
                ? "bg-emerald-400 text-zinc-900 hover:bg-emerald-300"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }`}
            title={
              !canApprove && counts.pending > 0
                ? `${counts.pending} filas pendientes — resolver para aprobar`
                : undefined
            }
          >
            Aprobar ✓
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <SummaryBadge icon="✓" count={counts.matched} label="asociados" color="text-green-400" />
        <SummaryBadge icon="?" count={counts.pending} label="pendientes" color="text-amber-400" />
        <SummaryBadge icon="+" count={counts.new_} label="nuevos" color="text-blue-400" />
        <SummaryBadge icon="✕" count={counts.discarded} label="descartados" color="text-zinc-500" />
      </div>

      {/* Batch actions */}
      {!isReadOnly && (
        <StagingActions
          runId={runId}
          autoMatchableCount={counts.autoMatchable}
          pendingCount={counts.pending}
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500 text-left">
              <th className="py-2 px-3 font-medium w-20">Estado</th>
              <th className="py-2 px-3 font-medium">Modelo (PDF)</th>
              <th className="py-2 px-3 font-medium w-16">Tipo</th>
              <th className="py-2 px-3 font-medium min-w-[160px]">Match</th>
              <th className="py-2 px-3 font-medium text-right w-32">Precio</th>
              <th className="py-2 px-3 font-medium w-16">Conf.</th>
              {!isReadOnly && <th className="py-2 px-3 font-medium w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const resCfg = RESOLUTION_CONFIG[row.resolution];
              const confBadge = row.matchConfidence
                ? CONFIDENCE_BADGE[row.matchConfidence]
                : null;
              const isManuallyEdited = row.matchConfidence === "manual";

              return (
                <tr
                  key={row._id}
                  className={`border-b border-zinc-800/50 transition-colors ${resCfg.rowClass}`}
                >
                  {/* Status icon + manual edit indicator */}
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center gap-1 font-medium ${resCfg.textClass}`}>
                      <span className="text-sm">{resCfg.icon}</span>
                      <span className="hidden sm:inline">{resCfg.label}</span>
                    </span>
                    {isManuallyEdited && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 ml-1" title="Editado manualmente" />
                    )}
                  </td>

                  {/* Modelo from PDF */}
                  <td className="py-2 px-3">
                    <div>
                      <span className="text-zinc-200 font-mono text-xs">
                        {row.rawData.modelo}
                      </span>
                      {row.rawData.marca && (
                        <span className="ml-2 text-zinc-600">{row.rawData.marca}</span>
                      )}
                    </div>
                    {row.rawData.textoOriginal && (
                      <p className="text-zinc-600 truncate max-w-xs mt-0.5" title={row.rawData.textoOriginal}>
                        {row.rawData.textoOriginal}
                      </p>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="py-2 px-3">
                    <span className="text-zinc-400">{TIPO_LABELS[row.tipo] ?? row.tipo}</span>
                  </td>

                  {/* Match — inline editable */}
                  <td className="py-2 px-3">
                    <InlineMatchEdit
                      matchedProductId={row.matchedProductId}
                      matchedProductTable={row.matchedProductTable}
                      matchConfidence={row.matchConfidence}
                      resolution={row.resolution}
                      products={canonicalProducts}
                      rowTipo={row.tipo}
                      onSave={(match) => handleMatchSave(row._id, match as Parameters<typeof handleMatchSave>[1])}
                      readOnly={isReadOnly}
                    />
                  </td>

                  {/* Price — inline editable */}
                  <td className="py-2 px-3">
                    <InlinePriceEdit
                      current={row.precioNormalizado ?? undefined}
                      originalText={row.rawData.precio}
                      potenciaW={parsePotenciaW(row.rawData.potencia)}
                      onSave={(price) => handlePriceSave(row._id, row.resolution, price)}
                      readOnly={isReadOnly}
                    />
                  </td>

                  {/* Confidence */}
                  <td className="py-2 px-3">
                    {confBadge && (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${confBadge.cls}`}>
                        {confBadge.label}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  {!isReadOnly && (
                    <td className="py-2 px-3 text-center">
                      {(row.resolution === "pending" && !row.matchedProductId) && (
                        <button
                          onClick={() => handleToggleDiscard(row)}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                          title="Descartar"
                        >
                          ✕
                        </button>
                      )}
                      {row.resolution === "discarded" && (
                        <button
                          onClick={() => handleToggleDiscard(row)}
                          className="text-zinc-600 hover:text-amber-400 transition-colors"
                          title="Restaurar"
                        >
                          ↩
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pending warning */}
      {!isReadOnly && counts.pending > 0 && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-xs text-amber-400">
          {counts.pending} fila{counts.pending !== 1 ? "s" : ""} pendiente{counts.pending !== 1 ? "s" : ""} — resolver para poder aprobar
        </div>
      )}
    </div>
  );
}

// ── Summary badge ─────────────────────────────────────────────────────────

function SummaryBadge({
  icon,
  count,
  label,
  color,
}: {
  icon: string;
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      <span className="text-sm">{icon}</span>
      <span className="font-semibold tabular-nums">{count}</span>
      <span className="text-zinc-500">{label}</span>
    </div>
  );
}
