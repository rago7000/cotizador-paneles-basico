"use client";

import type { LineItem } from "../lib/types";
import { SectionCard, LineItemTable, fmt } from "./primitives";

export interface SectionLineItemsProps {
  num: string;
  title: string;
  items: LineItem[];
  onChange: (index: number, field: keyof LineItem, value: string) => void;
  partidaMXN: number;
}

export default function SectionLineItems({
  num,
  title,
  items,
  onChange,
  partidaMXN,
}: SectionLineItemsProps) {
  return (
    <SectionCard num={num} title={title} badge="MXN sin IVA">
      <LineItemTable items={items} onChange={onChange} currency="MXN" />
      {partidaMXN > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden mt-3">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/60">
            <span className="text-xs text-zinc-400">Subtotal {title.toLowerCase()}</span>
            <span className="text-xs text-zinc-300 font-mono">${fmt(partidaMXN)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
            <span className="text-xs text-zinc-500">IVA 16%</span>
            <span className="text-xs text-zinc-400 font-mono">${fmt(partidaMXN * 0.16)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
            <span className="text-xs text-zinc-300 font-semibold">Total {title.toLowerCase()}</span>
            <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaMXN * 1.16)} MXN</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
