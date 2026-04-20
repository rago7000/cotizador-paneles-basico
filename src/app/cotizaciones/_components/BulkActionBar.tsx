"use client";

import { useEffect, useRef, useState } from "react";
import type { CotizacionRow, Etapa } from "../_lib/types-shared";
import { ETAPAS, ETAPA_LABEL, ETAPA_COLOR } from "../_lib/types-shared";

interface Props {
  rows: CotizacionRow[];
  selected: Set<string>;
  onClear: () => void;
  onBulkDelete: (rows: CotizacionRow[]) => void;
  onBulkArchivar: (rows: CotizacionRow[]) => void;
  onBulkChangeEtapa: (rows: CotizacionRow[], etapa: Etapa) => void;
}

export default function BulkActionBar({ rows, selected, onClear, onBulkDelete, onBulkArchivar, onBulkChangeEtapa }: Props) {
  const [etapaOpen, setEtapaOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!etapaOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setEtapaOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [etapaOpen]);

  const selectedRows = rows.filter((r) => selected.has(r.nombre));
  if (selectedRows.length === 0) return null;

  const allArchived = selectedRows.every((r) => r.archived);
  const anyNotArchived = selectedRows.some((r) => !r.archived);

  const handleExportCSV = () => {
    const headers = [
      "nombre", "cliente_ubicacion", "cliente_telefono", "cliente_email",
      "etapa", "origen", "probabilidad", "total_cliente_mxn", "utilidad_pct",
      "creada", "actualizada", "fecha_cierre", "fecha_instalacion", "tags",
    ];
    const escape = (v: string | number | null | undefined) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const body = selectedRows.map((r) => [
      r.nombre,
      r.clienteUbicacion,
      r.clienteTelefono,
      r.clienteEmail,
      r.etapa,
      r.origen,
      r.probabilidadCierre,
      r.totalClienteMXN,
      r.utilidadNetaPct?.toFixed(1),
      r.creadoEn,
      r.actualizadoEn,
      r.fechaCierre,
      r.fechaInstalacion,
      (r.tags ?? []).join("; "),
    ].map(escape).join(","));
    const csv = [headers.join(","), ...body].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cotizaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-2xl backdrop-blur-sm">
        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-zinc-900">
          {selectedRows.length}
        </span>
        <span className="text-xs text-zinc-300">seleccionada{selectedRows.length === 1 ? "" : "s"}</span>

        <span className="mx-1 h-5 w-px bg-zinc-700" />

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setEtapaOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Cambiar etapa
            <svg className="h-3 w-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {etapaOpen && (
            <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[160px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
              {ETAPAS.map((e) => {
                const c = ETAPA_COLOR[e];
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setEtapaOpen(false); onBulkChangeEtapa(selectedRows, e); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-zinc-800"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                    <span className={c.text}>{ETAPA_LABEL[e]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV
        </button>

        {anyNotArchived && (
          <button
            type="button"
            onClick={() => onBulkArchivar(selectedRows)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            title="Archivar (luego se podrán eliminar)"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archivar
          </button>
        )}

        {allArchived && (
          confirmDelete ? (
            <>
              <span className="mx-1 h-5 w-px bg-zinc-700" />
              <span className="text-xs text-zinc-300">¿Eliminar {selectedRows.length} permanentemente?</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); onBulkDelete(selectedRows); }}
                className="rounded-md bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
              >
                Sí, borrar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar…
            </button>
          )
        )}

        <span className="mx-1 h-5 w-px bg-zinc-700" />

        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Deseleccionar"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
