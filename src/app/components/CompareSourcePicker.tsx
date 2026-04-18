"use client";

import type { CotizacionGuardada, CotizacionCliente } from "../lib/types";

interface Props {
  open: boolean;
  cotizaciones: CotizacionGuardada[];
  variantes: CotizacionCliente[];
  primaryName: string;
  onClose: () => void;
  onPickCotizacion: (nombre: string) => void;
  onPickVariante: (variante: CotizacionCliente) => void;
}

export default function CompareSourcePicker({
  open,
  cotizaciones,
  variantes,
  primaryName,
  onClose,
  onPickCotizacion,
  onPickVariante,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Comparar lado a lado</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Elige qué cargar en el panel sandbox</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Variantes de la cotización actual ── */}
          {variantes.length > 0 && (
            <section>
              <div className="px-5 pt-4 pb-2 sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/50">
                <h3 className="text-[11px] uppercase tracking-wider font-semibold text-violet-400">
                  Variantes de «{primaryName || "(sin nombre)"}»
                </h3>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Snapshots de precio cliente guardados para esta cotización
                </p>
              </div>
              <ul className="divide-y divide-zinc-800/50">
                {variantes.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => onPickVariante(v)}
                      className="w-full text-left px-5 py-3 hover:bg-violet-400/5 transition-colors flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{v.nombre}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          {v.fecha?.slice(0, 10) ?? ""} · ${v.precios.total.toLocaleString()} total
                          {v.precios.utilidadPct ? ` · ${v.precios.utilidadPct.toFixed(1)}% util` : ""}
                          {v.notas ? ` · ${v.notas}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] text-violet-400/60 shrink-0">variante →</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Cotizaciones guardadas ── */}
          <section>
            <div className="px-5 pt-4 pb-2 sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/50">
              <h3 className="text-[11px] uppercase tracking-wider font-semibold text-amber-400">
                Otras cotizaciones guardadas
              </h3>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                Carga otra cotización completa para compararla
              </p>
            </div>
            {cotizaciones.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-zinc-600">
                No hay otras cotizaciones guardadas todavía.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800/50">
                {cotizaciones.map((c) => (
                  <li key={c.nombre}>
                    <button
                      onClick={() => onPickCotizacion(c.nombre)}
                      className="w-full text-left px-5 py-3 hover:bg-amber-400/5 transition-colors flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{c.nombre}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{c.fecha}</p>
                      </div>
                      <span className="text-[10px] text-amber-400/60 shrink-0">cotización →</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
