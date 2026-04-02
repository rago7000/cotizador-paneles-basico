"use client";

import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface BimestreData {
  label: string;        // e.g. "Sep-Nov 25"
  consumoKwh: number;   // bimestral
}

export interface ChartConsumoGeneracionProps {
  bimestres: BimestreData[];
  panelesPromedio: number;
  panelesEquilibrado: number;
  panelesMax: number;
  panelesConIncremento?: number;
  panelW: number;
  hasMinisplits?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SERIES = [
  { key: "promedio",    label: "Promedio",    color: "#34d399", colorDim: "#34d39940" },
  { key: "equilibrada", label: "Equilibrada", color: "#fbbf24", colorDim: "#fbbf2440" },
  { key: "maxima",      label: "Máxima",      color: "#a1a1aa", colorDim: "#a1a1aa40" },
  { key: "incremento",  label: "Con incremento", color: "#22d3ee", colorDim: "#22d3ee40" },
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

  const maxY = useMemo(() => {
    const vals = [
      ...bimestres.map((b) => b.consumoKwh),
      ...Object.entries(genValues)
        .filter(([k]) => active[k as SeriesKey])
        .map(([, v]) => v),
    ];
    return Math.ceil(Math.max(...vals, 100) / 100) * 100;
  }, [bimestres, genValues, active]);

  if (bimestres.length === 0) return null;

  // ── Layout ──
  const W = 720;
  const H = 320;
  const PAD = { top: 20, right: 20, bottom: 48, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const n = bimestres.length;
  const barGroupW = plotW / n;
  const barW = Math.min(barGroupW * 0.5, 40);
  const barGap = (barGroupW - barW) / 2;

  // Y-axis ticks
  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxY / tickCount) * i));

  const y = (v: number) => PAD.top + plotH - (v / maxY) * plotH;
  const x = (i: number) => PAD.left + barGroupW * i;

  // Active generation lines
  const activeLines = SERIES.filter(
    (s) => active[s.key] && (s.key !== "incremento" || hasMinisplits),
  );

  return (
    <div className="space-y-3">
      {/* Legend / toggles */}
      <div className="flex flex-wrap items-center gap-2">
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
              className="w-2.5 h-2.5 rounded-sm shrink-0 transition-opacity"
              style={{ backgroundColor: s.color, opacity: active[s.key] ? 1 : 0.25 }}
            />
            {s.label}
            {active[s.key] && (
              <span className="font-mono text-[10px] opacity-70">
                {s.key === "promedio" ? panelesPromedio : s.key === "equilibrada" ? panelesEquilibrado : s.key === "maxima" ? panelesMax : panelesConIncremento}p
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }}>
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left} y1={y(tick)} x2={W - PAD.right} y2={y(tick)}
                stroke="#27272a" strokeWidth={1}
              />
              <text
                x={PAD.left - 8} y={y(tick)} dy="0.35em"
                textAnchor="end" fill="#52525b" fontSize={10} fontFamily="monospace"
              >
                {fmt(tick)}
              </text>
            </g>
          ))}

          {/* Bars (consumo) */}
          {bimestres.map((bim, i) => {
            const bx = x(i) + barGap;
            const bh = (bim.consumoKwh / maxY) * plotH;
            const by = y(bim.consumoKwh);
            const isHovered = hoveredBar === i;

            // Check which series cover this bimestre
            const diffs = activeLines.map((s) => ({
              ...s,
              gen: genValues[s.key],
              diff: genValues[s.key] - bim.consumoKwh,
            }));

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
                className="cursor-default"
              >
                {/* Invisible hit area */}
                <rect
                  x={x(i)} y={PAD.top} width={barGroupW} height={plotH}
                  fill="transparent"
                />

                {/* Bar */}
                <rect
                  x={bx} y={by} width={barW} height={bh}
                  rx={3}
                  fill={isHovered ? "#6ee7b7" : "#059669"}
                  opacity={isHovered ? 0.9 : 0.7}
                  className="transition-all duration-150"
                />

                {/* X label */}
                <text
                  x={x(i) + barGroupW / 2} y={H - PAD.bottom + 16}
                  textAnchor="middle" fill="#71717a" fontSize={9} fontFamily="sans-serif"
                >
                  {bim.label}
                </text>

                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    {/* Tooltip background */}
                    <rect
                      x={x(i) + barGroupW / 2 - 70}
                      y={Math.max(PAD.top, by - 14 - diffs.length * 16 - 8)}
                      width={140}
                      height={14 + diffs.length * 16 + 8}
                      rx={6}
                      fill="#18181b"
                      stroke="#3f3f46"
                      strokeWidth={1}
                      opacity={0.95}
                    />
                    {/* Consumo value */}
                    <text
                      x={x(i) + barGroupW / 2}
                      y={Math.max(PAD.top, by - 14 - diffs.length * 16 - 8) + 16}
                      textAnchor="middle" fill="#e4e4e7" fontSize={11} fontWeight={600} fontFamily="monospace"
                    >
                      Consumo: {fmt(bim.consumoKwh)} kWh
                    </text>
                    {/* Series diffs */}
                    {diffs.map((d, di) => {
                      const ty = Math.max(PAD.top, by - 14 - diffs.length * 16 - 8) + 32 + di * 16;
                      return (
                        <text
                          key={d.key}
                          x={x(i) + barGroupW / 2}
                          y={ty}
                          textAnchor="middle"
                          fill={d.diff >= 0 ? d.color : "#f87171"}
                          fontSize={10}
                          fontFamily="monospace"
                        >
                          {d.label}: {d.diff >= 0 ? "+" : ""}{fmt(d.diff)} kWh
                        </text>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}

          {/* Generation lines */}
          {activeLines.map((s) => {
            const gv = genValues[s.key];
            const ly = y(gv);
            return (
              <g key={s.key}>
                <line
                  x1={PAD.left} y1={ly} x2={W - PAD.right} y2={ly}
                  stroke={s.color} strokeWidth={2} strokeDasharray="6 4"
                  opacity={0.8}
                />
                {/* Label on right */}
                <rect
                  x={W - PAD.right - 90} y={ly - 10}
                  width={88} height={18} rx={4}
                  fill="#18181b" stroke={s.color} strokeWidth={0.5} opacity={0.9}
                />
                <text
                  x={W - PAD.right - 46} y={ly + 3}
                  textAnchor="middle" fill={s.color} fontSize={9} fontWeight={600} fontFamily="monospace"
                >
                  {fmt(gv)} kWh
                </text>

                {/* Indicators: green dots where gen >= consumo, red where gen < consumo */}
                {bimestres.map((bim, i) => {
                  const cx = x(i) + barGroupW / 2;
                  const covers = gv >= bim.consumoKwh;
                  return (
                    <circle
                      key={i}
                      cx={cx} cy={ly} r={3.5}
                      fill={covers ? s.color : "#ef4444"}
                      opacity={covers ? 0.9 : 0.7}
                      stroke="#18181b" strokeWidth={1.5}
                    />
                  );
                })}
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

      {/* Summary: coverage counts */}
      {activeLines.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {activeLines.map((s) => {
            const gv = genValues[s.key];
            const covered = bimestres.filter((b) => gv >= b.consumoKwh).length;
            return (
              <div key={s.key} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span style={{ color: s.color }} className="font-medium">{s.label}</span>
                <span className="text-zinc-500">cubre</span>
                <span className="font-mono font-semibold" style={{ color: s.color }}>{covered}/{bimestres.length}</span>
                <span className="text-zinc-600">bimestres</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
