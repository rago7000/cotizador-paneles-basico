"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CotizacionGuardada } from "../lib/types";
import EtapaPill from "../cotizaciones/_components/EtapaPill";
import { toRow, fmtMXN, fmtRelative } from "../cotizaciones/_lib/derive";
import type { CotizacionRow } from "../cotizaciones/_lib/types-shared";

interface MisCotizacionesModalProps {
  open: boolean;
  cotizaciones: CotizacionGuardada[];
  onClose: () => void;
  onCargar: (nombre: string) => void;
  onEliminar: (nombre: string) => void;
  onDuplicar: (nombre: string) => void;
}

export default function MisCotizacionesModal({
  open,
  cotizaciones,
  onClose,
  onCargar,
  onEliminar,
  onDuplicar,
}: MisCotizacionesModalProps) {
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const rows: CotizacionRow[] = useMemo(() => {
    return cotizaciones
      .map((c) => (c.data && Object.keys(c.data).length > 0 ? toRow(c.data) : null))
      .filter((r): r is CotizacionRow => r !== null)
      .sort((a, b) => {
        const at = a.actualizadoEn ? new Date(a.actualizadoEn).getTime() : 0;
        const bt = b.actualizadoEn ? new Date(b.actualizadoEn).getTime() : 0;
        return bt - at;
      });
  }, [cotizaciones]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("es-MX");
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.nombre,
        r.clienteUbicacion,
        r.clienteTelefono,
        r.clienteEmail,
        r.clienteNotas,
        ...(r.tags ?? []),
      ]
        .filter(Boolean)
        .join(" | ")
        .toLocaleLowerCase("es-MX");
      return hay.includes(q);
    });
  }, [rows, search]);

  if (!open) return null;

  const handleClose = () => {
    setConfirmandoEliminar(null);
    setSearch("");
    onClose();
  };

  const handleCargar = (nombre: string) => {
    setConfirmandoEliminar(null);
    onCargar(nombre);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />

      <div
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">Mis cotizaciones</h2>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 tabular-nums">
              {rows.length}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="border-b border-zinc-800 px-5 py-2.5">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
            </svg>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cliente, tags…"
              className="w-full rounded-md border border-zinc-700 bg-zinc-950/50 py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
              <svg className="mb-3 h-8 w-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">
                {rows.length === 0 ? "No hay cotizaciones guardadas" : "Ningún resultado para esa búsqueda"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filtered.map((r) => (
                <div
                  key={r.nombre}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 transition-colors"
                >
                  {confirmandoEliminar === r.nombre ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <p className="flex-1 truncate text-xs text-zinc-200">
                        ¿Eliminar «{r.nombre}»?
                      </p>
                      <button
                        onClick={() => setConfirmandoEliminar(null)}
                        className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          onEliminar(r.nombre);
                          setConfirmandoEliminar(null);
                        }}
                        className="shrink-0 rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleCargar(r.nombre)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <EtapaPill etapa={r.etapa} size="sm" />
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                            {r.nombre}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {[r.clienteUbicacion, r.clienteTelefono].filter(Boolean).join(" · ") || "Sin contacto"}
                          {r.cantidadPaneles > 0 && (
                            <> · {r.cantidadPaneles} paneles · {r.kWp.toFixed(1)} kWp</>
                          )}
                        </p>
                      </button>
                      <div className="hidden shrink-0 text-right sm:block">
                        <div className="text-xs font-medium text-zinc-100 tabular-nums">
                          {fmtMXN(r.totalClienteMXN)}
                        </div>
                        <div className="text-[10px] text-zinc-500">{fmtRelative(r.actualizadoEn)}</div>
                      </div>
                      <button
                        onClick={() => onDuplicar(r.nombre)}
                        className="shrink-0 rounded-lg p-1.5 text-zinc-600 hover:bg-blue-400/10 hover:text-blue-400 transition-colors"
                        title="Duplicar"
                        aria-label="Duplicar"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmandoEliminar(r.nombre)}
                        className="shrink-0 rounded-lg p-1.5 text-zinc-600 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-800 px-5 py-2.5">
          <p className="text-[11px] text-zinc-600">Clic para cargar · buscar por cualquier campo</p>
          <Link
            href="/cotizaciones"
            onClick={handleClose}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300"
          >
            Ver todas
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </footer>
      </div>
    </div>
  );
}
