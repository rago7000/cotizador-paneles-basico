"use client";

import { fmtUSD } from "../components/primitives";
import type { CatalogoMicro } from "../lib/types";

interface PickerMicrosProps {
  open: boolean;
  catalogoMicros: CatalogoMicro[];
  pickerMicrosFiltrados: CatalogoMicro[];
  pickerSearch: string;
  pickerMarca: string;
  pickerMarcasMicros: string[];
  onClose: () => void;
  onSelect: (micro: CatalogoMicro) => void;
  onSetSearch: (v: string) => void;
  onSetMarca: (v: string) => void;
}

export default function PickerMicros({
  open,
  catalogoMicros,
  pickerMicrosFiltrados,
  pickerSearch,
  pickerMarca,
  pickerMarcasMicros,
  onClose,
  onSelect,
  onSetSearch,
  onSetMarca,
}: PickerMicrosProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Seleccionar microinversor del catalogo</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Search & filters */}
        {catalogoMicros.length > 0 && (
          <div className="px-4 py-3 border-b border-zinc-800 space-y-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => onSetSearch(e.target.value)}
                placeholder="Buscar marca o modelo..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-8 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400"
                autoFocus
              />
              {pickerSearch && (
                <button onClick={() => onSetSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select value={pickerMarca} onChange={(e) => onSetMarca(e.target.value)} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-amber-400">
                <option value="">Todas las marcas</option>
                {pickerMarcasMicros.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {(pickerSearch || pickerMarca) && (
                <span className="self-center text-[10px] text-zinc-600 whitespace-nowrap">{pickerMicrosFiltrados.length} result.</span>
              )}
            </div>
          </div>
        )}
        <div className="max-h-[50vh] overflow-y-auto">
          {catalogoMicros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600 text-sm">
              <p>No hay microinversores en el catalogo</p>
              <a href="/catalogo" className="mt-2 text-xs text-amber-400 hover:text-amber-300">Ir al catalogo →</a>
            </div>
          ) : pickerMicrosFiltrados.length === 0 ? (
            <p className="text-center text-sm text-zinc-600 py-8">Sin resultados</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {pickerMicrosFiltrados.map((m) => (
                <button key={m.id} onClick={() => onSelect(m)} className="w-full flex items-start justify-between px-5 py-3.5 hover:bg-zinc-800/60 transition-colors text-left">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-100">{m.marca} — {m.modelo}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {m.panelesPorUnidad ?? 4} panel{(m.panelesPorUnidad ?? 4) !== 1 ? "es" : ""}/micro
                      {m.precioCable > 0 && ` · cable ${fmtUSD(m.precioCable)}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {m.totalOfertas && m.totalOfertas > 0 && (
                        <span className="text-[10px] text-zinc-600">
                          {m.totalOfertas} {m.totalOfertas === 1 ? "cotizacion" : "cotizaciones"}
                        </span>
                      )}
                      {m.fechaActualizacion && (
                        <span className="text-[10px] text-zinc-600">
                          · act. {m.fechaActualizacion}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-amber-400 font-mono shrink-0 ml-3">{fmtUSD(m.precio)} USD</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
