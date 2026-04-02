"use client";

import type { LineItem } from "../lib/types";
import { SectionCard, fmt } from "./primitives";

const INSTALACION_RE = /^instalaci[oó]n/i;

export interface SectionGeneralesProps {
  items: LineItem[];
  onChange: (index: number, field: keyof LineItem, value: string) => void;
  partidaMXN: number;
}

/** Inline table rows (no header, no total — used inside subgroup wrappers) */
function SubgroupRows({
  items,
  indices,
  onChange,
}: {
  items: LineItem[];
  indices: number[];
  onChange: (index: number, field: keyof LineItem, value: string) => void;
}) {
  return (
    <>
      {items.map((item, localIdx) => {
        const globalIdx = indices[localIdx];
        const sub = (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0);
        return (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_72px_100px_88px] gap-2 px-3 py-2.5 border-t border-zinc-800/60 items-center hover:bg-zinc-800/30 transition-colors"
          >
            <div>
              <p className="text-xs text-zinc-300 leading-tight">{item.nombre}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{item.unidad}</p>
            </div>
            <input
              type="number"
              min={0}
              value={item.cantidad}
              onChange={(e) => onChange(globalIdx, "cantidad", e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-center text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={item.precioUnitario}
              onChange={(e) => onChange(globalIdx, "precioUnitario", e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            />
            <p className="text-xs text-right font-mono text-zinc-200">
              ${fmt(sub)}
            </p>
          </div>
        );
      })}
    </>
  );
}

export default function SectionGenerales({
  items,
  onChange,
  partidaMXN,
}: SectionGeneralesProps) {
  // Split items into materiales vs mano de obra
  const materialesItems: LineItem[] = [];
  const materialesIndices: number[] = [];
  const manoObraItems: LineItem[] = [];
  const manoObraIndices: number[] = [];

  items.forEach((item, i) => {
    if (INSTALACION_RE.test(item.nombre)) {
      manoObraItems.push(item);
      manoObraIndices.push(i);
    } else {
      materialesItems.push(item);
      materialesIndices.push(i);
    }
  });

  const subtotalMateriales = materialesItems.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0,
  );
  const subtotalManoObra = manoObraItems.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0,
  );

  return (
    <SectionCard num="5" title="Generales" badge="MXN sin IVA">
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        {/* Column header */}
        <div className="grid grid-cols-[1fr_72px_100px_88px] gap-2 px-3 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
          <span>Concepto</span>
          <span className="text-center">Cant.</span>
          <span className="text-right">Precio unit.</span>
          <span className="text-right">Subtotal</span>
        </div>

        {/* Subgroup: Materiales */}
        {materialesItems.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-zinc-800/30 border-t border-zinc-700/50">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Materiales</span>
            </div>
            <SubgroupRows items={materialesItems} indices={materialesIndices} onChange={onChange} />
            <div className="flex justify-between items-center px-3 py-2 border-t border-zinc-700/40 bg-zinc-800/30">
              <span className="text-[11px] text-zinc-500">Subtotal materiales</span>
              <span className="text-xs font-mono text-zinc-300">${fmt(subtotalMateriales)}</span>
            </div>
          </>
        )}

        {/* Subgroup: Mano de obra */}
        {manoObraItems.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-zinc-800/30 border-t border-zinc-700/50">
              <span className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider">Mano de obra</span>
            </div>
            <SubgroupRows items={manoObraItems} indices={manoObraIndices} onChange={onChange} />
            <div className="flex justify-between items-center px-3 py-2 border-t border-zinc-700/40 bg-zinc-800/30">
              <span className="text-[11px] text-amber-400/60">Subtotal mano de obra</span>
              <span className="text-xs font-mono text-amber-400/80">${fmt(subtotalManoObra)}</span>
            </div>
          </>
        )}

        {/* Grand total */}
        <div className="flex justify-between items-center px-3 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
          <span className="text-xs text-zinc-500">Total</span>
          <span className="text-sm font-semibold text-zinc-100 font-mono">
            ${fmt(subtotalMateriales + subtotalManoObra)}{" "}
            <span className="text-zinc-500 font-normal">MXN</span>
          </span>
        </div>
      </div>

      {/* IVA breakdown */}
      {partidaMXN > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden mt-3">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/60">
            <span className="text-xs text-zinc-400">Subtotal generales</span>
            <span className="text-xs text-zinc-300 font-mono">${fmt(partidaMXN)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
            <span className="text-xs text-zinc-500">IVA 16%</span>
            <span className="text-xs text-zinc-400 font-mono">${fmt(partidaMXN * 0.16)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
            <span className="text-xs text-zinc-300 font-semibold">Total generales</span>
            <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaMXN * 1.16)} MXN</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
