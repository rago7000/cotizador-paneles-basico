"use client";

// ── ImportRunsList ────────────────────────────────────────────────────────
// Shows the history of import runs with status badges.
// Each row is clickable to open the staging review.

import type { Doc, Id } from "../../../convex/_generated/dataModel";

// ── Types ─────────────────────────────────────────────────────────────────

type ImportRun = Doc<"importRuns">;

interface ImportRunsListProps {
  runs: ImportRun[];
  proveedoresMap: Map<string, string>; // id → nombre
  onReview: (runId: Id<"importRuns">) => void;
  onPublish: (runId: Id<"importRuns">) => void;
  onViewList: (runId: Id<"importRuns">) => void;
  onDelete: (runId: Id<"importRuns">) => void;
}

// ── Status config ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ImportRun["status"],
  { label: string; color: string; icon: string; pulse?: boolean }
> = {
  extracting: { label: "Extrayendo...", color: "text-blue-400", icon: "⏳", pulse: true },
  staging: { label: "Listo para revisión", color: "text-blue-400", icon: "📋" },
  reviewing: { label: "En revisión", color: "text-amber-400", icon: "✏️" },
  approved: { label: "Aprobado", color: "text-emerald-400", icon: "✓" },
  published: { label: "Publicado", color: "text-green-400", icon: "🟢" },
  failed: { label: "Error", color: "text-red-400", icon: "✕" },
};

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + " " + d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ImportRunsList({
  runs,
  proveedoresMap,
  onReview,
  onPublish,
  onViewList,
  onDelete,
}: ImportRunsListProps) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm">No hay importaciones todavía</p>
        <p className="text-xs text-zinc-600 mt-1">Sube un PDF de proveedor para comenzar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500 text-left">
            <th className="py-2 px-3 font-medium">Estado</th>
            <th className="py-2 px-3 font-medium">Archivo</th>
            <th className="py-2 px-3 font-medium">Proveedor</th>
            <th className="py-2 px-3 font-medium text-right">Filas</th>
            <th className="py-2 px-3 font-medium text-right">Fecha</th>
            <th className="py-2 px-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const cfg = STATUS_CONFIG[run.status];
            const provName = proveedoresMap.get(run.proveedorId) ?? "—";

            return (
              <tr
                key={run._id}
                className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
              >
                {/* Status */}
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center gap-1.5 ${cfg.color}`}>
                    <span className={cfg.pulse ? "animate-pulse" : ""}>{cfg.icon}</span>
                    <span className="font-medium">{cfg.label}</span>
                  </span>
                </td>

                {/* Filename */}
                <td className="py-2.5 px-3">
                  <span className="text-zinc-200 font-mono">{run.nombreArchivo}</span>
                </td>

                {/* Proveedor */}
                <td className="py-2.5 px-3 text-zinc-400">{provName}</td>

                {/* Row count */}
                <td className="py-2.5 px-3 text-right text-zinc-400 tabular-nums">
                  {run.status === "failed" ? "—" : run.filasExtraidas}
                </td>

                {/* Date */}
                <td className="py-2.5 px-3 text-right text-zinc-500" title={fmtDateTime(run.creadoEn)}>
                  {fmtDate(run.creadoEn)}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {(run.status === "staging" || run.status === "reviewing") && (
                      <button
                        onClick={() => onReview(run._id)}
                        className="rounded-md bg-amber-400/10 px-2.5 py-1 text-amber-400 hover:bg-amber-400/20 transition-colors font-medium"
                      >
                        {run.status === "staging" ? "Revisar" : "Continuar"}
                      </button>
                    )}
                    {run.status === "approved" && (
                      <button
                        onClick={() => onPublish(run._id)}
                        className="rounded-md bg-emerald-400/10 px-2.5 py-1 text-emerald-400 hover:bg-emerald-400/20 transition-colors font-medium"
                      >
                        Publicar
                      </button>
                    )}
                    {run.status === "published" && (
                      <button
                        onClick={() => onViewList(run._id)}
                        className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-400 hover:bg-zinc-700 transition-colors"
                      >
                        Ver lista
                      </button>
                    )}
                    {(run.status === "failed" || run.status === "staging") && (
                      <button
                        onClick={() => onDelete(run._id)}
                        className="rounded-md px-2 py-1 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
