"use client";

import type { SizingResult } from "../lib/calc-costos";
import type { SizingOption } from "./useClienteFlow";
import ChartConsumoGeneracion from "../components/ChartConsumoGeneracion";
import type { ReciboCFEData } from "../lib/cotizacion-state";

interface Props {
  reciboCFE: ReciboCFEData;
  sizing: SizingResult;
  sizingOption: SizingOption;
  cantidadPaneles: number;
  panelW: number;
  kWpSistema: number;
  generacionMensualKwh: number;
  coberturaPct: number;
  onSelectSizing: (option: SizingOption, paneles: number) => void;
}

export default function StepSistema({
  reciboCFE, sizing, sizingOption, cantidadPaneles,
  panelW, kWpSistema, generacionMensualKwh, coberturaPct,
  onSelectSizing,
}: Props) {
  const options: { key: SizingOption; label: string; desc: string; paneles: number; kWp: number }[] = [
    {
      key: "basica",
      label: "Básica",
      desc: "Cubre tu consumo promedio",
      paneles: sizing.panelesPromedio,
      kWp: sizing.kWpPromedio,
    },
    {
      key: "recomendada",
      label: "Recomendada",
      desc: "Equilibrio ideal costo-beneficio",
      paneles: sizing.panelesEquilibrado,
      kWp: sizing.kWpEquilibrado,
    },
    {
      key: "maxima",
      label: "Máxima",
      desc: "Cubre tus picos de consumo",
      paneles: sizing.panelesMax,
      kWp: sizing.kWpMax,
    },
  ];

  // Build bimestres for chart
  const bimestres = [
    ...sizing.historicoFiltrado.map((h) => ({ label: h.periodo, consumoKwh: h.kwh })).reverse(),
    { label: `${reciboCFE.periodoInicio}–${reciboCFE.periodoFin}`, consumoKwh: reciboCFE.consumoKwh },
  ];

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 mb-4">
          <span className="text-amber-400 text-sm">☀️</span>
          <span className="text-sm font-medium text-amber-300">{cantidadPaneles} paneles · {kWpSistema.toFixed(1)} kWp</span>
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-1">Tu sistema solar</h2>
        <p className="text-sm text-zinc-400">
          Genera <span className="text-zinc-200 font-semibold">{Math.round(generacionMensualKwh).toLocaleString("es-MX")} kWh/mes</span>
          {coberturaPct > 0 && (
            <> — cubre el <span className="text-emerald-400 font-semibold">{coberturaPct}%</span> de tu consumo</>
          )}
        </p>
      </div>

      {/* Sizing options */}
      <div className="grid grid-cols-3 gap-3">
        {options.map((opt) => {
          const selected = sizingOption === opt.key;
          const consumoMensual = sizing.consumoMensualCalc;
          const genMensual = opt.kWp * 132;
          const cob = consumoMensual > 0 ? Math.round((genMensual / consumoMensual) * 100) : 0;
          return (
            <button
              key={opt.key}
              onClick={() => onSelectSizing(opt.key, opt.paneles)}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selected
                  ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                  : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600"
              }`}
            >
              {opt.key === "recomendada" && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-zinc-900 px-2 py-0.5 rounded-full">
                  Mejor opción
                </span>
              )}
              <div className={`text-lg font-bold ${selected ? "text-amber-300" : "text-zinc-200"}`}>
                {opt.paneles} paneles
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">{opt.kWp.toFixed(1)} kWp</div>
              <div className={`text-xs mt-2 ${selected ? "text-amber-400/70" : "text-zinc-500"}`}>
                {opt.desc}
              </div>
              <div className={`text-xs mt-1 font-medium ${cob >= 100 ? "text-emerald-400" : "text-zinc-400"}`}>
                {cob}% cobertura
              </div>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {bimestres.length > 1 && (
        <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-4 overflow-x-auto">
          <ChartConsumoGeneracion
            bimestres={bimestres}
            panelesPromedio={sizing.panelesPromedio}
            panelesEquilibrado={sizing.panelesEquilibrado}
            panelesMax={sizing.panelesMax}
            panelesConIncremento={0}
            panelW={panelW}
            hasMinisplits={false}
            incrementoBimKwh={0}
          />
        </div>
      )}
    </div>
  );
}
