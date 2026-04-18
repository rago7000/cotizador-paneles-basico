"use client";

import type { CalcSnapshot } from "./CotizadorWorkspace";
import { fmt } from "./primitives";

interface Props {
  primary: CalcSnapshot | null;
  secondary: CalcSnapshot | null;
  onClose: () => void;
}

function fmtSigned(n: number, currency = true) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  return `${sign}${currency ? "$" : ""}${fmt(abs)}`;
}

function pctDelta(a: number, b: number): number | null {
  if (a === 0) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

interface DeltaRowProps {
  label: string;
  primary: number | null | undefined;
  secondary: number | null | undefined;
  unit?: "MXN" | "%" | "kWp" | "W" | "u" | "meses";
  /** When true, lower secondary value is "good" for primary (e.g. costs); otherwise higher is good. */
  lowerIsBetter?: boolean;
  /** Highlight emphasis: "key" → bigger, "muted" → smaller. */
  emphasis?: "key" | "normal" | "muted";
}

function DeltaRow({ label, primary, secondary, unit = "MXN", lowerIsBetter = false, emphasis = "normal" }: DeltaRowProps) {
  const a = primary ?? 0;
  const b = secondary ?? 0;
  const delta = b - a;
  const pct = pctDelta(a, b);
  const noData = (primary === null || primary === undefined) && (secondary === null || secondary === undefined);

  // Color: from primary's perspective, is secondary better or worse?
  // lowerIsBetter (cost): negative delta = better (green)
  // !lowerIsBetter (revenue, watts): positive delta = better (green)
  let color = "text-zinc-500";
  if (delta !== 0 && !noData) {
    const better = lowerIsBetter ? delta < 0 : delta > 0;
    color = better ? "text-emerald-400" : "text-red-400";
  }

  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "·";
  const sizeCls = emphasis === "key" ? "text-sm font-semibold" : emphasis === "muted" ? "text-[10px]" : "text-xs";
  const labelCls = emphasis === "key" ? "text-xs font-medium text-zinc-300" : emphasis === "muted" ? "text-[10px] text-zinc-600" : "text-[11px] text-zinc-500";

  const formatVal = (v: number) => {
    if (unit === "%") return `${v.toFixed(1)}%`;
    if (unit === "kWp") return `${v.toFixed(2)} kWp`;
    if (unit === "W") return `${Math.round(v)} W`;
    if (unit === "u") return `${Math.round(v)}`;
    if (unit === "meses") return `${Math.round(v)} m`;
    return `$${fmt(v)}`;
  };

  const formatDelta = (v: number) => {
    if (unit === "%") return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}pp`;
    if (unit === "kWp") return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}`;
    if (unit === "W") return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.round(Math.abs(v))}`;
    if (unit === "u") return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.round(Math.abs(v))}`;
    if (unit === "meses") return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.round(Math.abs(v))}m`;
    return fmtSigned(v);
  };

  return (
    <div className="px-3 py-1.5 border-b border-zinc-800/50">
      <div className={labelCls + " mb-0.5 truncate"}>{label}</div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-amber-300 font-mono ${sizeCls} truncate`} title="Primario">
          {primary !== null && primary !== undefined ? formatVal(a) : "—"}
        </span>
        <span className={`font-mono ${color} ${sizeCls} shrink-0`}>
          {arrow} {formatDelta(delta)}
          {pct !== null && unit !== "%" && unit !== "kWp" && unit !== "W" && unit !== "u" && unit !== "meses" && (
            <span className="ml-1 opacity-60 text-[9px]">({pct > 0 ? "+" : ""}{pct.toFixed(1)}%)</span>
          )}
        </span>
        <span className={`text-emerald-300 font-mono ${sizeCls} truncate`} title="Sandbox">
          {secondary !== null && secondary !== undefined ? formatVal(b) : "—"}
        </span>
      </div>
    </div>
  );
}

export default function SplitDeltaSidebar({ primary, secondary, onClose }: Props) {
  return (
    <aside className="space-y-3 sticky top-16 self-start max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Comparativa</h3>
          <p className="text-[10px] text-zinc-500">Primario vs Sandbox</p>
        </div>
        <button
          onClick={onClose}
          title="Cerrar comparación"
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {(!primary && !secondary) && (
        <div className="px-3 py-6 text-center text-[11px] text-zinc-600">
          Esperando datos…
        </div>
      )}

      {(primary || secondary) && (
        <>
          {/* Names header */}
          <div className="px-3 grid grid-cols-2 gap-2">
            <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold truncate" title={primary?.nombre || ""}>
              {primary?.nombre || "Primario"}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold truncate text-right" title={secondary?.nombre || ""}>
              {secondary?.nombre || "Sandbox"}
            </div>
          </div>

          {/* SISTEMA */}
          <div>
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Sistema</div>
            <DeltaRow label="Paneles" primary={primary?.cantidadNum} secondary={secondary?.cantidadNum} unit="u" />
            <DeltaRow label="Potencia panel" primary={primary?.potenciaNum} secondary={secondary?.potenciaNum} unit="W" />
            <DeltaRow label="kWp sistema" primary={primary?.kWpSistema} secondary={secondary?.kWpSistema} unit="kWp" emphasis="key" />
          </div>

          {/* COSTOS */}
          <div>
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Costos (MXN)</div>
            <DeltaRow label="Paneles" primary={primary?.partidaPanelesMXN} secondary={secondary?.partidaPanelesMXN} lowerIsBetter />
            <DeltaRow label="Inversores" primary={primary?.partidaInversoresMXN} secondary={secondary?.partidaInversoresMXN} lowerIsBetter />
            <DeltaRow label="Estructura" primary={primary?.partidaEstructuraMXN} secondary={secondary?.partidaEstructuraMXN} lowerIsBetter />
            <DeltaRow label="Tornillería" primary={primary?.partidaTornilleriaMXN} secondary={secondary?.partidaTornilleriaMXN} lowerIsBetter emphasis="muted" />
            <DeltaRow label="Generales" primary={primary?.partidaGeneralesMXN} secondary={secondary?.partidaGeneralesMXN} lowerIsBetter emphasis="muted" />
            <DeltaRow label="Subtotal" primary={primary?.subtotalMXN} secondary={secondary?.subtotalMXN} lowerIsBetter emphasis="key" />
            <DeltaRow label="Costo / panel" primary={primary?.costoPorPanel} secondary={secondary?.costoPorPanel} lowerIsBetter />
          </div>

          {/* CLIENTE */}
          <div>
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Precio cliente (MXN)</div>
            <DeltaRow label="Total cliente" primary={primary?.clienteTotalMXN} secondary={secondary?.clienteTotalMXN} emphasis="key" />
            <DeltaRow label="Subtotal" primary={primary?.clienteSubtotalMXN} secondary={secondary?.clienteSubtotalMXN} />
            <DeltaRow label="Precio / panel" primary={primary?.clientePorPanel} secondary={secondary?.clientePorPanel} />
            <DeltaRow label="Precio / Watt" primary={primary?.clientePorWatt} secondary={secondary?.clientePorWatt} />
          </div>

          {/* UTILIDAD */}
          <div>
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Utilidad</div>
            <DeltaRow label="Utilidad neta" primary={primary?.utilidadNetaMXN} secondary={secondary?.utilidadNetaMXN} emphasis="key" />
            <DeltaRow label="% utilidad" primary={primary?.utilidadNetaPct} secondary={secondary?.utilidadNetaPct} unit="%" />
          </div>

          {/* ROI */}
          {((primary && primary.roiMeses > 0) || (secondary && secondary.roiMeses > 0)) && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">ROI</div>
              <DeltaRow label="Payback" primary={primary?.roiMeses} secondary={secondary?.roiMeses} unit="meses" lowerIsBetter />
            </div>
          )}

          <div className="px-3 py-2 text-[9px] text-zinc-700 leading-snug border-t border-zinc-800">
            <span className="text-amber-400">←</span> primario &nbsp;
            <span className="text-emerald-400">→</span> sandbox &nbsp;
            <span className="text-emerald-400">verde</span>=mejor para primario
          </div>
        </>
      )}
    </aside>
  );
}
