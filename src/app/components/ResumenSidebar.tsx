"use client";

import { useState, useEffect, useRef } from "react";
import { fmt, PartidaRow } from "../components/primitives";
import type { CatalogoPanel, CatalogoMicro } from "../lib/types";

interface ResumenSidebarProps {
  partidaPanelesMXN: number;
  partidaInversoresMXN: number;
  partidaEstructuraMXN: number;
  partidaTornilleriaMXN: number;
  partidaGeneralesMXN: number;
  subtotalMXN: number;
  ivaMXN: number;
  totalMXN: number;
  costoPorPanel: number;
  cantidadNum: number;
  // Equipment info
  panelSeleccionado: CatalogoPanel | null;
  microSeleccionado: CatalogoMicro | null;
  cantidadMicros: number;
  panelesPorMicro: number;
  // Callback to change panel count (for offer buttons)
  onApplyProposal?: (cantidad: number) => void;
}

export default function ResumenSidebar({
  partidaPanelesMXN,
  partidaInversoresMXN,
  partidaEstructuraMXN,
  partidaTornilleriaMXN,
  partidaGeneralesMXN,
  subtotalMXN,
  ivaMXN,
  totalMXN,
  costoPorPanel,
  cantidadNum,
  panelSeleccionado,
  microSeleccionado,
  cantidadMicros,
  panelesPorMicro,
  onApplyProposal,
}: ResumenSidebarProps) {
  const [expanded, setExpanded] = useState(cantidadNum > 0);
  const prevCantidad = useRef(cantidadNum);

  // Auto-open when panels go from 0 → N
  useEffect(() => {
    if (prevCantidad.current === 0 && cantidadNum > 0) {
      setExpanded(true);
    }
    prevCantidad.current = cantidadNum;
  }, [cantidadNum]);

  const capacidadTotal = cantidadMicros * panelesPorMicro;
  const espaciosLibres = capacidadTotal - cantidadNum;
  const infrautilizado = cantidadNum > 0 && espaciosLibres > 0;

  // Offer buttons: next increment and fill inverter
  const nextStep = cantidadNum + 1;
  const fillAll = capacidadTotal;
  const showNextButton = infrautilizado && espaciosLibres > 1;
  const showFillButton = infrautilizado;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
      >
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Resumen</h3>
        <div className="flex items-center gap-2">
          {!expanded && cantidadNum > 0 && (
            <span className="text-xs font-bold text-amber-400 font-mono">${fmt(totalMXN)}</span>
          )}
          <span className="text-xs text-zinc-600">{expanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </button>

      {expanded && (
        <>
          {/* Inverter underutilization alert */}
          {infrautilizado && (
            <div className="px-4 py-2.5 border-b border-amber-400/15 bg-amber-400/5">
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-amber-400 font-medium leading-tight">
                    Inversor infrautilizado
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {cantidadMicros} inversor{cantidadMicros > 1 ? "es" : ""} × {panelesPorMicro} entradas = {capacidadTotal} paneles.{" "}
                    <span className="text-amber-400/80">{espaciosLibres} espacio{espaciosLibres > 1 ? "s" : ""} libre{espaciosLibres > 1 ? "s" : ""}.</span>
                  </p>
                  {onApplyProposal && (
                    <div className="flex gap-1.5 mt-2">
                      {showNextButton && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onApplyProposal(nextStep); }}
                          className="text-[10px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                        >
                          Subir a {nextStep} paneles
                        </button>
                      )}
                      {showFillButton && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onApplyProposal(fillAll); }}
                          className="text-[10px] px-2 py-1 rounded-md border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 transition-colors font-medium"
                        >
                          Llenar inversor ({fillAll} paneles)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Partidas */}
          <div className="px-4 py-2">
            <PartidaRow
              label="Paneles"
              value={cantidadNum > 0 ? partidaPanelesMXN : 0}
              tag={panelSeleccionado ? `${cantidadNum > 0 ? cantidadNum + "×" : ""}${panelSeleccionado.marca} ${panelSeleccionado.potencia}W` : undefined}
            />
            <PartidaRow
              label="Inversores"
              value={cantidadNum > 0 ? partidaInversoresMXN : 0}
              tag={microSeleccionado ? `${cantidadMicros > 0 ? cantidadMicros + "×" : ""}${microSeleccionado.marca} ${microSeleccionado.modelo}` : undefined}
            />
            <PartidaRow label="Estructura" value={cantidadNum > 0 ? partidaEstructuraMXN : 0} />
            <PartidaRow label="Tornillería" value={cantidadNum > 0 ? partidaTornilleriaMXN : 0} />
            <PartidaRow label="Generales" value={cantidadNum > 0 ? partidaGeneralesMXN : 0} />
          </div>

          <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Subtotal</span>
              <span className={`font-mono ${cantidadNum === 0 ? "text-zinc-700" : ""}`}>{cantidadNum > 0 ? `$${fmt(subtotalMXN)}` : "—"}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>IVA 16%</span>
              <span className={`font-mono ${cantidadNum === 0 ? "text-zinc-700" : ""}`}>{cantidadNum > 0 ? `$${fmt(ivaMXN)}` : "—"}</span>
            </div>
          </div>

          <div className={`border-t px-4 py-4 ${cantidadNum > 0 ? "bg-amber-400/5 border-amber-400/20" : "bg-zinc-800/30 border-zinc-800"}`}>
            <div className="flex items-end justify-between">
              <span className={`text-sm font-semibold ${cantidadNum > 0 ? "text-zinc-300" : "text-zinc-600"}`}>Total</span>
              <div className="text-right">
                <div className={`text-2xl font-bold font-mono leading-none ${cantidadNum > 0 ? "text-amber-400" : "text-zinc-700"}`}>
                  {cantidadNum > 0 ? `$${fmt(totalMXN)}` : "—"}
                </div>
                {cantidadNum > 0 && <div className="text-xs text-zinc-500 mt-0.5">MXN con IVA</div>}
              </div>
            </div>
          </div>

          {costoPorPanel > 0 && (
            <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Costo por panel</span>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Total / {cantidadNum} paneles</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-cyan-400 font-mono">${fmt(costoPorPanel)}</span>
                  <p className="text-[10px] text-zinc-600">MXN con IVA</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
