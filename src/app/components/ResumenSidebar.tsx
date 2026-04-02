"use client";

import { fmt, PartidaRow } from "../components/primitives";

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
}: ResumenSidebarProps) {
  if (subtotalMXN <= 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Resumen</h3>
      </div>
      <div className="px-4 py-2">
        {partidaPanelesMXN > 0 && <PartidaRow label="Paneles" value={partidaPanelesMXN} />}
        {partidaInversoresMXN > 0 && <PartidaRow label="Inversores" value={partidaInversoresMXN} />}
        {partidaEstructuraMXN > 0 && <PartidaRow label="Estructura" value={partidaEstructuraMXN} />}
        {partidaTornilleriaMXN > 0 && <PartidaRow label="Tornillería" value={partidaTornilleriaMXN} />}
        {partidaGeneralesMXN > 0 && <PartidaRow label="Generales" value={partidaGeneralesMXN} />}
      </div>

      <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Subtotal</span>
          <span className="font-mono">${fmt(subtotalMXN)}</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-400">
          <span>IVA 16%</span>
          <span className="font-mono">${fmt(ivaMXN)}</span>
        </div>
      </div>

      <div className="bg-amber-400/5 border-t border-amber-400/20 px-4 py-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-semibold text-zinc-300">Total</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400 font-mono leading-none">
              ${fmt(totalMXN)}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">MXN con IVA</div>
          </div>
        </div>
      </div>

      {costoPorPanel > 0 && (
        <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Costo por panel</span>
              <p className="text-[10px] text-zinc-600 mt-0.5">Total ÷ {cantidadNum} paneles</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-cyan-400 font-mono">${fmt(costoPorPanel)}</span>
              <p className="text-[10px] text-zinc-600">MXN con IVA</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
