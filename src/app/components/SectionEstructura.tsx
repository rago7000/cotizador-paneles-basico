"use client";

import type { LineItem } from "../lib/types";
import type { StructureRowInput, StructureCalculationResult } from "../lib/structure/types";
import { SectionCard, Field, NumInput, LineItemTable, fmt } from "./primitives";

export interface SectionEstructuraProps {
  aluminio: LineItem[];
  onChangeAluminio: (index: number, field: keyof LineItem, value: string) => void;
  fleteAluminio: string;
  onSetFleteAluminio: (v: string) => void;
  showStructure: boolean;
  onSetShowStructure: (v: boolean) => void;
  structureRows: StructureRowInput[];
  onSetStructureRows: (rows: StructureRowInput[]) => void;
  structureResult: StructureCalculationResult | null;
  partidaEstructuraMXN: number;
  fleteAluminioSinIVA: number;
}

export default function SectionEstructura({
  aluminio,
  onChangeAluminio,
  fleteAluminio,
  onSetFleteAluminio,
  showStructure,
  onSetShowStructure,
  structureRows,
  onSetStructureRows,
  structureResult,
  partidaEstructuraMXN,
}: SectionEstructuraProps) {
  return (
    <SectionCard num="3" title="Estructura — Aluminio" badge="MXN sin IVA">
      {/* Calculadora estructural */}
      <div className="mb-4">
        <button
          onClick={() => onSetShowStructure(!showStructure)}
          className="flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${showStructure ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          Calculadora de acomodo estructural
        </button>

        {showStructure && (
          <div className="mt-3 rounded-xl border border-cyan-400/20 bg-zinc-800/50 p-4 space-y-3">
            <p className="text-[11px] text-zinc-500">Define las filas de acomodo de paneles (horizontal x vertical) para calcular materiales estructurales.</p>

            {/* Rows */}
            {structureRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600 w-12">Fila {i + 1}</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={row.horizontal}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    onSetStructureRows(structureRows.map((r, idx) => idx === i ? { ...r, horizontal: v } : r));
                  }}
                  className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 text-center outline-none focus:border-cyan-400"
                  placeholder="H"
                />
                <span className="text-[10px] text-zinc-600">x</span>
                <input
                  type="number"
                  min={1}
                  max={2}
                  value={row.vertical}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    onSetStructureRows(structureRows.map((r, idx) => idx === i ? { ...r, vertical: v } : r));
                  }}
                  className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 text-center outline-none focus:border-cyan-400"
                  placeholder="V"
                />
                <span className="text-[10px] text-zinc-500">= {row.horizontal * row.vertical} paneles</span>
                <button
                  onClick={() => onSetStructureRows(structureRows.filter((_, idx) => idx !== i))}
                  className="text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}

            <button
              onClick={() => onSetStructureRows([...structureRows, { horizontal: 4, vertical: 1 }])}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Agregar fila
            </button>

            {/* Results */}
            {structureResult && structureResult.totals.totalPaneles > 0 && (
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/80 p-3 space-y-2 mt-3">
                <h4 className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wide">Materiales calculados</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-zinc-500">Total paneles</span><span className="text-zinc-200 font-mono">{structureResult.totals.totalPaneles}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Clips (con 5% desp.)</span><span className="text-zinc-200 font-mono">{structureResult.totals.clipsConDesperdicio}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Angulos compra</span><span className="text-zinc-200 font-mono">{structureResult.totals.totalAngulosCompra} pzas</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Unicanales compra</span><span className="text-zinc-200 font-mono">{structureResult.totals.totalUnicanalesCompra} pzas</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Contraflambeo compra</span><span className="text-zinc-200 font-mono">{structureResult.totals.totalAngulosContraflambeoCompra} pzas</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Restante capacidad</span><span className="text-zinc-200 font-mono">{structureResult.totals.totalRestanteCapacidad}</span></div>
                </div>
                {structureResult.totals.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {structureResult.totals.warnings.map((w, i) => (
                      <p key={i} className="text-[10px] text-amber-400/80">{w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <LineItemTable
        items={aluminio}
        onChange={onChangeAluminio}
        currency="MXN"
      />
      <Field label="Flete" hint="MXN con IVA incluido — se descuenta el IVA para no cobrar doble">
        <NumInput value={fleteAluminio} onChange={onSetFleteAluminio} step={0.01} />
      </Field>
      {partidaEstructuraMXN > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden mt-3">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/60">
            <span className="text-xs text-zinc-400">Subtotal estructura</span>
            <span className="text-xs text-zinc-300 font-mono">${fmt(partidaEstructuraMXN)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
            <span className="text-xs text-zinc-500">IVA 16%</span>
            <span className="text-xs text-zinc-400 font-mono">${fmt(partidaEstructuraMXN * 0.16)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
            <span className="text-xs text-zinc-300 font-semibold">Total estructura</span>
            <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaEstructuraMXN * 1.16)} MXN</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
