"use client";

import { useMemo } from "react";
import type { CotizacionRow } from "../_lib/types-shared";
import { fmtMXN, fmtMXNShort, isClosedEtapa } from "../_lib/derive";

interface Props {
  rows: CotizacionRow[];
}

export default function CotizacionesMetrics({ rows }: Props) {
  const m = useMemo(() => computeMetrics(rows), [rows]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard
        label="Pipeline abierto"
        value={fmtMXN(m.pipelineAbiertoMXN)}
        sub={`${m.pipelineCount} cotización${m.pipelineCount === 1 ? "" : "es"}`}
        accent="amber"
      />
      <KpiCard
        label="Ganado este mes"
        value={fmtMXN(m.ganadoMesMXN)}
        sub={`${m.ganadoMesCount} cerrada${m.ganadoMesCount === 1 ? "" : "s"}`}
        accent="emerald"
      />
      <KpiCard
        label="Conversión 90d"
        value={m.conversionPct != null ? `${m.conversionPct.toFixed(0)}%` : "—"}
        sub={m.conversionPct != null ? `${m.ganado90d} de ${m.ganado90d + m.perdido90d}` : "sin cierres"}
        accent="sky"
      />
      <KpiCard
        label="Cotizaciones activas"
        value={`${m.activasCount}`}
        sub={`${fmtMXNShort(m.activasTotalMXN)} potencial`}
        accent="violet"
      />
    </div>
  );
}

const ACCENT_RING: Record<string, string> = {
  amber: "ring-amber-500/20",
  emerald: "ring-emerald-500/20",
  sky: "ring-sky-500/20",
  violet: "ring-violet-500/20",
};
const ACCENT_DOT: Record<string, string> = {
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  violet: "bg-violet-400",
};

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 ring-1 ${ACCENT_RING[accent]}`}>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_DOT[accent]}`} />
        {label}
      </div>
      <div className="mt-2 truncate text-2xl font-semibold text-zinc-100">{value}</div>
      <div className="mt-1 truncate text-xs text-zinc-500">{sub}</div>
    </div>
  );
}

function computeMetrics(rows: CotizacionRow[]) {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const ninetyDaysAgo = Date.now() - 90 * 86400000;

  let pipelineAbiertoMXN = 0;
  let pipelineCount = 0;
  let ganadoMesMXN = 0;
  let ganadoMesCount = 0;
  let ganado90d = 0;
  let perdido90d = 0;
  let activasCount = 0;
  let activasTotalMXN = 0;

  for (const r of rows) {
    const closed = isClosedEtapa(r.etapa);
    if (!closed) {
      pipelineAbiertoMXN += r.valorPonderadoMXN;
      pipelineCount += 1;
      activasCount += 1;
      activasTotalMXN += r.totalClienteMXN ?? 0;
    }
    const fechaCierre = r.fechaCierre ? new Date(r.fechaCierre) : null;
    if (r.etapa === "cerrado_ganado" && fechaCierre && fechaCierre.getFullYear() === y && fechaCierre.getMonth() === mo) {
      ganadoMesMXN += r.totalClienteMXN ?? 0;
      ganadoMesCount += 1;
    }
    if (fechaCierre && fechaCierre.getTime() >= ninetyDaysAgo) {
      if (r.etapa === "cerrado_ganado") ganado90d += 1;
      if (r.etapa === "cerrado_perdido") perdido90d += 1;
    }
  }

  const totalCierres90 = ganado90d + perdido90d;
  const conversionPct = totalCierres90 > 0 ? (ganado90d / totalCierres90) * 100 : null;

  return {
    pipelineAbiertoMXN,
    pipelineCount,
    ganadoMesMXN,
    ganadoMesCount,
    ganado90d,
    perdido90d,
    conversionPct,
    activasCount,
    activasTotalMXN,
  };
}
