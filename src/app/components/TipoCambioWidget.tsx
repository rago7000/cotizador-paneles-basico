"use client";

import { useState } from "react";
import type { TipoCambioData } from "../lib/types";

interface TipoCambioWidgetProps {
  tc: TipoCambioData | null;
  tcError: string;
  tcFrozen: boolean;
  tcManual: boolean;
  tcUsarManana: boolean;
  tcSnapshotLocal: string;
  tcLive: number;
  tcVal: number;
  onSetFrozen: (v: boolean) => void;
  onSetManual: (v: boolean) => void;
  onSetSnapshot: (v: string) => void;
  onSetUsarManana: (v: boolean) => void;
}

export default function TipoCambioWidget({
  tc,
  tcError,
  tcFrozen,
  tcManual,
  tcUsarManana,
  tcSnapshotLocal,
  tcLive,
  tcVal,
  onSetFrozen,
  onSetManual,
  onSetSnapshot,
  onSetUsarManana,
}: TipoCambioWidgetProps) {
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${
      tcFrozen ? "border-blue-400/40 bg-blue-400/5" : tcManual ? "border-amber-400/40 bg-amber-400/5" : "border-zinc-800 bg-zinc-900"
    }`}>
      {tc || tcFrozen || tcManual ? (
        <>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs uppercase tracking-wide font-medium ${
              tcFrozen ? "text-blue-400" : tcManual ? "text-amber-400" : "text-zinc-500"
            }`}>
              {tcManual ? "TC Manual" : tcFrozen ? "TC Congelado" : "Tipo de cambio FIX"}
            </span>
            <span className="text-xs text-zinc-600">
              {tcManual ? "editable" : tcFrozen ? "fijo en cotización" : tc?.fecha}
            </span>
          </div>

          {/* Hoy / Mañana toggle — only when live mode and alt rate exists */}
          {!tcFrozen && !tcManual && tc?.tipoCambioAlt && (
            <div className="flex rounded-lg border border-zinc-700 overflow-hidden mb-2">
              <button
                onClick={() => onSetUsarManana(false)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  !tcUsarManana
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Hoy <span className="font-mono text-[10px] ml-1">${tc.tipoCambio.toFixed(4)}</span>
              </button>
              <button
                onClick={() => onSetUsarManana(true)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-l border-zinc-700 ${
                  tcUsarManana
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Mañana <span className="font-mono text-[10px] ml-1">${tc.tipoCambioAlt.toFixed(4)}</span>
              </button>
            </div>
          )}

          <div className="flex items-end justify-between gap-2">
            <div className="flex items-end gap-2">
              {tcManual ? (
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 text-xl font-mono">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.0001}
                    value={tcSnapshotLocal}
                    onChange={(e) => onSetSnapshot(e.target.value)}
                    className="w-32 text-2xl font-bold text-amber-300 font-mono bg-transparent border-b border-amber-400/40 outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ) : (
                <span className={`text-2xl font-bold font-mono ${tcFrozen ? "text-blue-300" : "text-zinc-100"}`}>
                  ${tcVal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              )}
              <span className="text-sm text-zinc-500 mb-0.5">MXN/USD</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 mt-2.5">
            {/* Congelar / Descongelar */}
            <button
              onClick={() => {
                if (tcFrozen) {
                  onSetFrozen(false);
                  onSetSnapshot("");
                } else {
                  onSetManual(false);
                  onSetSnapshot(String(tcLive || tcVal));
                  onSetFrozen(true);
                }
              }}
              disabled={!tcLive && !tcFrozen && !tcManual}
              title={tcFrozen ? "Descongelar — volver al DOF en vivo" : "Congelar este TC en la cotización"}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                tcFrozen
                  ? "bg-blue-400/20 text-blue-300 border border-blue-400/40 hover:bg-blue-400/10"
                  : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {tcFrozen ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Descongelar
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z M12 7a4 4 0 00-4 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a4 4 0 014 4" />
                  </svg>
                  Congelar
                </>
              )}
            </button>

            {/* Manual / Auto */}
            <button
              onClick={() => {
                if (tcManual) {
                  onSetManual(false);
                  onSetSnapshot("");
                } else {
                  onSetFrozen(false);
                  onSetSnapshot(String(tcLive || tcVal));
                  onSetManual(true);
                }
              }}
              disabled={!tcLive && !tcFrozen && !tcManual}
              title={tcManual ? "Volver al TC automático" : "Escribir TC manualmente"}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                tcManual
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/10"
                  : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {tcManual ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Auto
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Manual
                </>
              )}
            </button>
          </div>

          {tcManual && (
            <p className="text-xs text-zinc-500 mt-1.5">
              Escribe el TC exacto del DOF para tu pago
            </p>
          )}
          {tcFrozen && tcLive > 0 && tcLive !== tcVal && (
            <p className="text-xs text-zinc-600 mt-1.5">
              DOF actual: ${tcLive.toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
            </p>
          )}
          {!tcFrozen && !tcManual && tc && (
            <p className="text-xs text-zinc-600 mt-1">
              {tcUsarManana && tc.tipoCambioAlt ? tc.etiquetaAlt || "DOF mañana" : tc.etiqueta || tc.fuente}
              {" — "}{tcUsarManana && tc.fechaAlt ? tc.fechaAlt : tc.fecha}
            </p>
          )}

          {/* Histórico FIX */}
          {tc?.historico && tc.historico.length > 0 && (
            <HistoricoToggle historico={tc.historico} />
          )}
        </>
      ) : tcError ? (
        <p className="text-xs text-red-400">{tcError}</p>
      ) : (
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <div className="h-3 w-3 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin" />
          Cargando tipo de cambio…
        </div>
      )}
    </div>
  );
}

// ── Subcomponente: mini-tabla histórico FIX ──────────────────────────────

function HistoricoToggle({ historico }: { historico: { fecha: string; valor: number }[] }) {
  const [open, setOpen] = useState(false);

  // Calcular min/max para resaltar
  const valores = historico.map((h) => h.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Últimos {historico.length} datos FIX
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 overflow-hidden">
          {historico.map((h, i) => {
            const isMin = h.valor === min && min !== max;
            const isMax = h.valor === max && min !== max;
            return (
              <div
                key={i}
                className={`flex items-center justify-between px-2.5 py-1 text-[11px] font-mono ${
                  i === 0 ? "bg-zinc-800/40" : i % 2 === 0 ? "bg-zinc-800/20" : ""
                }`}
              >
                <span className="text-zinc-500">{h.fecha}</span>
                <span className={
                  isMin ? "text-red-400" : isMax ? "text-emerald-400" : "text-zinc-300"
                }>
                  ${h.valor.toFixed(4)}
                  {isMin && <span className="text-[9px] ml-1 text-red-500">min</span>}
                  {isMax && <span className="text-[9px] ml-1 text-emerald-500">max</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
