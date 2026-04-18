"use client";

import { useState } from "react";
import type { CotizacionGuardada } from "../lib/types";

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

  if (!open) return null;

  const handleClose = () => {
    setConfirmandoEliminar(null);
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Mis cotizaciones</h2>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {cotizaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
              <svg className="w-8 h-8 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No hay cotizaciones guardadas</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {cotizaciones.map((c) => (
                <div
                  key={c.nombre}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/60 transition-colors"
                >
                  {confirmandoEliminar === c.nombre ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <p className="flex-1 text-xs text-zinc-200 truncate">
                        ¿Eliminar «{c.nombre}»?
                      </p>
                      <button
                        onClick={() => setConfirmandoEliminar(null)}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          onEliminar(c.nombre);
                          setConfirmandoEliminar(null);
                        }}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleCargar(c.nombre)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium text-zinc-100 truncate">{c.nombre}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{c.fecha}</p>
                      </button>
                      <button
                        onClick={() => onDuplicar(c.nombre)}
                        className="shrink-0 p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                        title="Duplicar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmandoEliminar(c.nombre)}
                        className="shrink-0 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div className="px-5 py-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-600 text-center">
            Haz clic en una cotizacion para cargarla
          </p>
        </div>
      </div>
    </div>
  );
}
