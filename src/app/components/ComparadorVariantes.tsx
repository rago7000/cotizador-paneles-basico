"use client";

import { fmt } from "./primitives";
import type { CotizacionCliente } from "../lib/types";

interface Props {
  variantes: CotizacionCliente[];
  onClose: () => void;
}

export default function ComparadorVariantes({ variantes, onClose }: Props) {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <span className="text-sm font-medium text-zinc-300">Comparador de variantes</span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium w-36">Concepto</th>
              {variantes.map((v) => (
                <th key={v.id} className="text-right px-4 py-3 text-zinc-300 font-semibold min-w-[140px]">
                  {v.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Config de utilidad */}
            <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
              <td className="px-4 py-2 text-zinc-500">Utilidad</td>
              {variantes.map((v) => (
                <td key={v.id} className="px-4 py-2 text-right text-zinc-400 font-mono">
                  {v.utilidad.tipo === "global" ? `${v.utilidad.globalPct}%` : "por partida"}
                  {v.utilidad.montoFijo > 0 && ` +$${fmt(v.utilidad.montoFijo)}`}
                </td>
              ))}
            </tr>
            {/* Partidas */}
            {([
              ["Paneles", (v: CotizacionCliente) => v.precios.paneles],
              ["Inversores", (v: CotizacionCliente) => v.precios.inversores],
              ["Estructura", (v: CotizacionCliente) => v.precios.estructura],
              ["Tornillería", (v: CotizacionCliente) => v.precios.tornilleria],
              ["Generales", (v: CotizacionCliente) => v.precios.generales],
            ] as [string, (v: CotizacionCliente) => number][]).map(([label, getter]) => {
              const anyNonZero = variantes.some((v) => getter(v) > 0);
              if (!anyNonZero) return null;
              return (
                <tr key={label} className="border-b border-zinc-800/50">
                  <td className="px-4 py-2 text-zinc-500">{label}</td>
                  {variantes.map((v) => (
                    <td key={v.id} className="px-4 py-2 text-right text-zinc-300 font-mono">
                      ${fmt(getter(v))}
                    </td>
                  ))}
                </tr>
              );
            })}
            {/* Subtotal */}
            <tr className="border-b border-zinc-800 bg-zinc-800/20">
              <td className="px-4 py-2 text-zinc-400 font-medium">Subtotal</td>
              {variantes.map((v) => (
                <td key={v.id} className="px-4 py-2 text-right text-zinc-300 font-mono font-medium">
                  ${fmt(v.precios.subtotal)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-800/50">
              <td className="px-4 py-2 text-zinc-500">IVA 16%</td>
              {variantes.map((v) => (
                <td key={v.id} className="px-4 py-2 text-right text-zinc-400 font-mono">
                  ${fmt(v.precios.iva)}
                </td>
              ))}
            </tr>
            {/* Total */}
            <tr className="border-b border-zinc-700 bg-emerald-400/5">
              <td className="px-4 py-3 text-emerald-400 font-semibold">Total cliente</td>
              {variantes.map((v) => {
                const isMin = v.precios.total === Math.min(...variantes.map((x) => x.precios.total));
                return (
                  <td key={v.id} className={`px-4 py-3 text-right font-mono font-bold text-lg ${isMin ? "text-emerald-400" : "text-zinc-300"}`}>
                    ${fmt(v.precios.total)}
                    {isMin && <span className="block text-[10px] font-normal text-emerald-400/60">mejor precio</span>}
                  </td>
                );
              })}
            </tr>
            {/* Métricas */}
            <tr className="border-b border-zinc-800/50">
              <td className="px-4 py-2 text-zinc-500">Precio / panel</td>
              {variantes.map((v) => (
                <td key={v.id} className="px-4 py-2 text-right text-emerald-300 font-mono font-medium">
                  ${fmt(v.precios.porPanel)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-800/50">
              <td className="px-4 py-2 text-zinc-500">Precio / Watt</td>
              {variantes.map((v) => (
                <td key={v.id} className="px-4 py-2 text-right text-emerald-300 font-mono">
                  ${fmt(v.precios.porWatt)}
                </td>
              ))}
            </tr>
            {/* Utilidad */}
            <tr className="bg-amber-400/5">
              <td className="px-4 py-3 text-amber-400 font-semibold">Utilidad neta</td>
              {variantes.map((v) => {
                const isMax = v.precios.utilidadNeta === Math.max(...variantes.map((x) => x.precios.utilidadNeta));
                return (
                  <td key={v.id} className={`px-4 py-3 text-right font-mono font-bold text-lg ${isMax ? "text-amber-400" : "text-zinc-300"}`}>
                    ${fmt(v.precios.utilidadNeta)}
                    <span className="block text-[10px] font-normal text-zinc-500">{v.precios.utilidadPct.toFixed(1)}%</span>
                    {isMax && <span className="block text-[10px] font-normal text-amber-400/60">mayor utilidad</span>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
