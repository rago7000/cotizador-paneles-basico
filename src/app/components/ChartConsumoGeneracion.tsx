"use client";

import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface BimestreData {
  label: string;
  consumoKwh: number;
}

export interface ChartConsumoGeneracionProps {
  bimestres: BimestreData[];
  panelesPromedio: number;
  panelesEquilibrado: number;
  panelesMax: number;
  panelesConIncremento?: number;
  panelW: number;
  hasMinisplits?: boolean;
  /** Extra kWh per bimestre from minisplits (shown as projected consumption when "Con incremento" is active) */
  incrementoBimKwh?: number;
  /** Target bimestral consumption used to size each option (before ceil rounding) */
  consumoObjetivoBim?: { promedio: number; equilibrada: number; maxima: number; incremento: number };
}

// ── Series config ──────────────────────────────────────────────────────────

const SERIES = [
  { key: "promedio",    label: "Promedio",        color: "#34d399" },
  { key: "equilibrada", label: "Equilibrada",     color: "#fbbf24" },
  { key: "maxima",      label: "Máxima",          color: "#a1a1aa" },
  { key: "incremento",  label: "Con incremento",  color: "#22d3ee" },
] as const;

type SeriesKey = typeof SERIES[number]["key"];

// ── Helpers ────────────────────────────────────────────────────────────────

function genBimKwh(paneles: number, panelW: number): number {
  return Math.round(paneles * (panelW / 1000) * 132 * 2);
}

function fmt(n: number): string {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ChartConsumoGeneracion({
  bimestres,
  panelesPromedio,
  panelesEquilibrado,
  panelesMax,
  panelesConIncremento = 0,
  panelW,
  hasMinisplits = false,
  incrementoBimKwh = 0,
  consumoObjetivoBim,
}: ChartConsumoGeneracionProps) {
  const [active, setActive] = useState<Record<SeriesKey, boolean>>({
    promedio: true,
    equilibrada: true,
    maxima: false,
    incremento: false,
  });
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const genValues = useMemo(() => ({
    promedio:    genBimKwh(panelesPromedio, panelW),
    equilibrada: genBimKwh(panelesEquilibrado, panelW),
    maxima:      genBimKwh(panelesMax, panelW),
    incremento:  genBimKwh(panelesConIncremento, panelW),
  }), [panelesPromedio, panelesEquilibrado, panelesMax, panelesConIncremento, panelW]);

  // The "primary" active series for excedente visualization (highest priority active)
  const primarySeries = useMemo(() => {
    const order: SeriesKey[] = ["equilibrada", "promedio", "incremento", "maxima"];
    return order.find((k) => active[k] && (k !== "incremento" || hasMinisplits)) ?? null;
  }, [active, hasMinisplits]);

  const primaryGen = primarySeries ? genValues[primarySeries] : 0;
  const primaryColor = primarySeries ? SERIES.find((s) => s.key === primarySeries)!.color : "#34d399";

  const showIncremento = active.incremento && hasMinisplits && incrementoBimKwh > 0;

  const maxY = useMemo(() => {
    const allVals = [
      ...bimestres.map((b) => b.consumoKwh + (showIncremento ? incrementoBimKwh : 0)),
      ...Object.entries(genValues)
        .filter(([k]) => active[k as SeriesKey])
        .map(([, v]) => v),
    ];
    return Math.ceil(Math.max(...allVals, 100) / 100) * 100;
  }, [bimestres, genValues, active, showIncremento, incrementoBimKwh]);

  if (bimestres.length === 0) return null;

  // ── Layout ──
  const W = 720;
  const H = 340;
  const PAD = { top: 24, right: 24, bottom: 52, left: 54 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const n = bimestres.length;
  const barGroupW = plotW / n;
  const barW = Math.min(barGroupW * 0.55, 48);
  const barGap = (barGroupW - barW) / 2;

  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxY / tickCount) * i));

  const yPos = (v: number) => PAD.top + plotH - (v / maxY) * plotH;
  const xPos = (i: number) => PAD.left + barGroupW * i;

  const activeLines = SERIES.filter(
    (s) => active[s.key] && (s.key !== "incremento" || hasMinisplits),
  );

  // Excedente/deficit totals for primary series
  const balanceStats = useMemo(() => {
    if (!primarySeries) return null;
    const gen = genValues[primarySeries];
    const useProjected = primarySeries === "incremento" && showIncremento;
    let excedente = 0;
    let deficit = 0;
    for (const b of bimestres) {
      const consumo = useProjected ? b.consumoKwh + incrementoBimKwh : b.consumoKwh;
      const diff = gen - consumo;
      if (diff > 0) excedente += diff;
      else deficit += Math.abs(diff);
    }
    return { excedente, deficit, balance: excedente - deficit };
  }, [primarySeries, genValues, bimestres, showIncremento, incrementoBimKwh]);

  return (
    <div className="space-y-3">
      {/* Legend / toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-zinc-500 mr-1">Comparar:</span>
        {SERIES.filter((s) => s.key !== "incremento" || hasMinisplits).map((s) => (
          <button
            key={s.key}
            onClick={() => setActive((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md transition-all ${
              active[s.key]
                ? "border font-medium"
                : "text-zinc-600 hover:text-zinc-400 border border-transparent"
            }`}
            style={active[s.key] ? { borderColor: s.color + "50", color: s.color, backgroundColor: s.color + "12" } : undefined}
          >
            <span
              className="w-2 h-2 rounded-sm shrink-0 transition-opacity"
              style={{ backgroundColor: s.color, opacity: active[s.key] ? 1 : 0.25 }}
            />
            {s.label}
            {active[s.key] && (
              <span className="font-mono text-[10px] opacity-60">
                {s.key === "promedio" ? panelesPromedio : s.key === "equilibrada" ? panelesEquilibrado : s.key === "maxima" ? panelesMax : panelesConIncremento}p
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }}>
          <defs>
            {/* Hatch pattern for deficit zones */}
            <pattern id="hatch-deficit" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#ef444440" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left} y1={yPos(tick)} x2={W - PAD.right} y2={yPos(tick)}
                stroke="#27272a" strokeWidth={tick === 0 ? 1.5 : 1}
              />
              <text
                x={PAD.left - 8} y={yPos(tick)} dy="0.35em"
                textAnchor="end" fill="#52525b" fontSize={10} fontFamily="monospace"
              >
                {fmt(tick)}
              </text>
            </g>
          ))}

          {/* Bars + excedente/deficit overlays */}
          {bimestres.map((bim, i) => {
            const bx = xPos(i) + barGap;
            const barBottom = yPos(0);
            const barTop = yPos(bim.consumoKwh);
            const bh = barBottom - barTop;
            const isHovered = hoveredBar === i;

            // Projected consumption with minisplits
            const projectedKwh = bim.consumoKwh + incrementoBimKwh;
            const projTop = showIncremento ? yPos(projectedKwh) : barTop;
            const projH = showIncremento ? barTop - projTop : 0;

            // For primary series: use projected if incremento is primary, otherwise original
            const effectiveConsumo = (primarySeries === "incremento" && showIncremento) ? projectedKwh : bim.consumoKwh;
            const effectiveTop = (primarySeries === "incremento" && showIncremento) ? projTop : barTop;

            // Excedente/deficit for primary series
            const hasPrimary = primarySeries !== null;
            const diff = hasPrimary ? primaryGen - effectiveConsumo : 0;
            const isExcedente = diff > 0;
            const isDeficit = diff < 0;

            // Excedente zone: from top of effective bar up to generation line
            const excTop = hasPrimary && isExcedente ? yPos(primaryGen) : effectiveTop;
            const excH = hasPrimary && isExcedente ? effectiveTop - excTop : 0;

            // Deficit zone: from generation line down to where bar exceeds it
            const defTop = hasPrimary && isDeficit ? effectiveTop : 0;
            const defBottom = hasPrimary && isDeficit ? yPos(primaryGen) : 0;
            const defH = hasPrimary && isDeficit ? defBottom - defTop : 0;

            const diffs = activeLines.map((s) => {
              const consumoForSeries = (s.key === "incremento" && showIncremento) ? projectedKwh : bim.consumoKwh;
              return {
                ...s,
                gen: genValues[s.key],
                diff: genValues[s.key] - consumoForSeries,
              };
            });

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
                className="cursor-default"
              >
                {/* Hit area */}
                <rect x={xPos(i)} y={PAD.top} width={barGroupW} height={plotH} fill="transparent" />

                {/* Excedente zone (generation > consumo): ghost bar extending above */}
                {excH > 0 && (
                  <rect
                    x={bx} y={excTop} width={barW} height={excH}
                    rx={3} ry={3}
                    fill={primaryColor}
                    opacity={isHovered ? 0.2 : 0.1}
                    stroke={primaryColor}
                    strokeWidth={isHovered ? 1 : 0.5}
                    strokeDasharray="3 2"
                    className="transition-all duration-150"
                  />
                )}

                {/* Consumo bar */}
                <rect
                  x={bx} y={barTop} width={barW} height={bh}
                  rx={3}
                  fill={isDeficit && hasPrimary ? "#71717a" : isHovered ? "#6ee7b7" : "#059669"}
                  opacity={isHovered ? 0.9 : 0.75}
                  className="transition-all duration-150"
                />

                {/* Projected increment bar (minisplits) — extends above consumo bar */}
                {projH > 0 && (
                  <rect
                    x={bx} y={projTop} width={barW} height={projH}
                    rx={3}
                    fill="#22d3ee"
                    opacity={isHovered ? 0.45 : 0.25}
                    stroke="#22d3ee"
                    strokeWidth={isHovered ? 1 : 0.5}
                    strokeDasharray="3 2"
                    className="transition-all duration-150"
                  />
                )}

                {/* Deficit overlay (consumo > generation): hatched red zone on top portion of bar */}
                {defH > 0 && (
                  <>
                    <rect
                      x={bx} y={defTop} width={barW} height={defH}
                      rx={3}
                      fill="#ef444420"
                      className="transition-all duration-150"
                    />
                    <rect
                      x={bx} y={defTop} width={barW} height={defH}
                      rx={3}
                      fill="url(#hatch-deficit)"
                      className="transition-all duration-150"
                    />
                  </>
                )}

                {/* Excedente value label (on hover or always if significant) */}
                {hasPrimary && isExcedente && isHovered && (
                  <text
                    x={bx + barW / 2} y={excTop - 4}
                    textAnchor="middle" fill={primaryColor} fontSize={9} fontWeight={600} fontFamily="monospace"
                  >
                    +{fmt(diff)}
                  </text>
                )}

                {/* Deficit value label (on hover) */}
                {hasPrimary && isDeficit && isHovered && (
                  <text
                    x={bx + barW / 2} y={barTop - 4}
                    textAnchor="middle" fill="#f87171" fontSize={9} fontWeight={600} fontFamily="monospace"
                  >
                    {fmt(diff)}
                  </text>
                )}

                {/* X label */}
                <text
                  x={xPos(i) + barGroupW / 2} y={H - PAD.bottom + 14}
                  textAnchor="middle" fill={isHovered ? "#e4e4e7" : "#71717a"} fontSize={9} fontFamily="sans-serif"
                  className="transition-all duration-150"
                >
                  {bim.label}
                </text>
                {/* kWh below label */}
                <text
                  x={xPos(i) + barGroupW / 2} y={H - PAD.bottom + 26}
                  textAnchor="middle" fill="#52525b" fontSize={8} fontFamily="monospace"
                >
                  {fmt(bim.consumoKwh)}{showIncremento ? ` → ${fmt(projectedKwh)}` : ""}
                </text>

                {/* Hover tooltip */}
                {isHovered && diffs.length > 0 && (
                  <g>
                    {(() => {
                      const tooltipRows = diffs.length + (showIncremento ? 2 : 1);
                      const tooltipH = tooltipRows * 15 + 10;
                      const tooltipY = Math.max(4, Math.min(barTop, projTop, excTop) - tooltipH - 4);
                      const tooltipX = Math.min(xPos(i) + barGroupW / 2 - 76, W - PAD.right - 152);
                      const textCX = tooltipX + 76;
                      return (
                        <>
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={152}
                      height={tooltipH}
                      rx={6}
                      fill="#18181b" stroke="#3f3f46" strokeWidth={1} opacity={0.96}
                    />
                    <text
                      x={textCX}
                      y={tooltipY + 15}
                      textAnchor="middle" fill="#e4e4e7" fontSize={10} fontWeight={600} fontFamily="monospace"
                    >
                      Consumo: {fmt(bim.consumoKwh)} kWh
                    </text>
                    {showIncremento && (
                      <text
                        x={textCX}
                        y={tooltipY + 30}
                        textAnchor="middle" fill="#22d3ee" fontSize={9.5} fontFamily="monospace"
                      >
                        + Minisplits: {fmt(projectedKwh)} kWh
                      </text>
                    )}
                    {diffs.map((d, di) => {
                      const baseY = tooltipY + (showIncremento ? 45 : 32);
                      return (
                        <text
                          key={d.key}
                          x={textCX}
                          y={baseY + di * 15}
                          textAnchor="middle"
                          fill={d.diff >= 0 ? d.color : "#f87171"}
                          fontSize={9.5}
                          fontFamily="monospace"
                        >
                          {d.label}: {d.diff >= 0 ? "+" : ""}{fmt(d.diff)}
                        </text>
                      );
                    })}
                        </>
                      );
                    })()}
                  </g>
                )}
              </g>
            );
          })}

          {/* Target consumption lines (thin, shows where system was designed for before ceil rounding) */}
          {consumoObjetivoBim && activeLines.map((s) => {
            const target = consumoObjetivoBim[s.key];
            const gv = genValues[s.key];
            if (!target || Math.abs(gv - target) < maxY * 0.02) return null; // skip if too close to gen line
            const ty = yPos(target);
            return (
              <g key={`target-${s.key}`}>
                <line
                  x1={PAD.left} y1={ty} x2={W - PAD.right} y2={ty}
                  stroke={s.color} strokeWidth={0.75}
                  strokeDasharray="2 3"
                  opacity={0.3}
                />
                <text
                  x={PAD.left + 4} y={ty - 4}
                  fill={s.color} fontSize={8} opacity={0.4} fontFamily="monospace"
                >
                  objetivo: {fmt(target)}
                </text>
              </g>
            );
          })}

          {/* Generation lines */}
          {activeLines.map((s) => {
            const gv = genValues[s.key];
            const ly = yPos(gv);
            const isPrimary = s.key === primarySeries;
            return (
              <g key={s.key}>
                <line
                  x1={PAD.left} y1={ly} x2={W - PAD.right} y2={ly}
                  stroke={s.color} strokeWidth={isPrimary ? 2.5 : 1.5}
                  strokeDasharray={isPrimary ? "8 4" : "4 4"}
                  opacity={isPrimary ? 0.9 : 0.5}
                />
                {/* Label: generation + label text */}
                <rect
                  x={W - PAD.right - 82} y={ly - 9}
                  width={80} height={18} rx={4}
                  fill="#18181b" stroke={s.color} strokeWidth={isPrimary ? 1 : 0.5} opacity={0.92}
                />
                <text
                  x={W - PAD.right - 42} y={ly + 4}
                  textAnchor="middle" fill={s.color} fontSize={9} fontWeight={600} fontFamily="monospace"
                >
                  {fmt(gv)} kWh
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={14} y={PAD.top + plotH / 2}
            textAnchor="middle" fill="#52525b" fontSize={10}
            transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}
          >
            kWh / bimestre
          </text>
        </svg>
      </div>

      {/* Summary footer */}
      <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
        {/* Coverage counts */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {activeLines.map((s) => {
            const gv = genValues[s.key];
            const covered = bimestres.filter((b) => gv >= b.consumoKwh).length;
            // How many bimesters the target consumption was designed to cover (before ceil rounding)
            const targetBim = consumoObjetivoBim?.[s.key] ?? 0;
            const designedCoverage = targetBim > 0
              ? bimestres.filter((b) => b.consumoKwh <= targetBim).length
              : covered;
            const extraFromRounding = covered > designedCoverage;
            return (
              <div key={s.key} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span style={{ color: s.color }} className="font-medium">{s.label}</span>
                <span className="text-zinc-500">cubre</span>
                <span className="font-mono font-semibold" style={{ color: s.color }}>{covered}/{bimestres.length}</span>
                <span className="text-zinc-600">bim</span>
                {extraFromRounding && (
                  <span className="text-zinc-600 text-[10px]">(objetivo: {designedCoverage}, +{covered - designedCoverage} por redondeo)</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Balance anual for primary series */}
        {balanceStats && primarySeries && (
          <div className="flex items-center gap-3 text-[11px] border-l border-zinc-800 pl-4">
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Excedente anual:</span>
              <span className="font-mono font-semibold text-emerald-400">+{fmt(balanceStats.excedente)} kWh</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Deficit:</span>
              <span className="font-mono font-semibold text-red-400">-{fmt(balanceStats.deficit)} kWh</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Balance:</span>
              <span className={`font-mono font-semibold ${balanceStats.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {balanceStats.balance >= 0 ? "+" : ""}{fmt(balanceStats.balance)} kWh
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
