"use client";

import { useState } from "react";
import { fmt } from "../components/primitives";
import type { UtilidadConfig, CotizacionCliente, CatalogoPanel } from "../lib/types";
import type { PanelRecommendations } from "../lib/auto-select-panel";

export interface PrecioClienteWidgetProps {
  mostrarPrecioCliente: boolean;
  onSetMostrarPrecioCliente: (v: boolean) => void;

  subtotalMXN: number;
  totalMXN: number;

  utilidad: UtilidadConfig;
  onSetUtilidad: (u: UtilidadConfig) => void;

  // Partida costs (pre-utilidad)
  partidaPanelesMXN: number;
  partidaInversoresMXN: number;
  partidaEstructuraMXN: number;
  partidaTornilleriaMXN: number;
  partidaGeneralesMXN: number;

  // Client prices (post-utilidad, before IVA)
  clientePanelesMXN: number;
  clienteInversoresMXN: number;
  clienteEstructuraMXN: number;
  clienteTornilleriaMXN: number;
  clienteGeneralesMXN: number;

  // Client totals
  clienteSubtotalMXN: number;
  clienteIvaMXN: number;
  clienteTotalMXN: number;

  // Per-unit metrics
  clientePorPanel: number;
  clientePorWatt: number;
  utilidadNetaMXN: number;
  utilidadNetaPct: number;

  cantidadNum: number;
  potenciaNum: number;
  kWpSistema: number;

  // ROI data
  roiAnios: number;
  roiMeses: number;
  ahorroMensualMXN: number;
  ahorroAnualMXN: number;
  costoCFEporKwh: number;
  generacionMensualKwh: number;
  reciboCFEExists: boolean;

  // Variantes
  nombreCotizacion: string;
  nombreVariante: string;
  onSetNombreVariante: (v: string) => void;

  variantes: CotizacionCliente[];
  mostrarVariantes: boolean;
  onSetMostrarVariantes: (v: boolean) => void;

  mostrarComparador: boolean;
  onSetMostrarComparador: (v: boolean) => void;

  onGuardarVariante: () => void;
  onEliminarVariante: (id: string) => void;
  onCargarVariante: (v: CotizacionCliente) => void;
  onVerPDFVariante: (v: CotizacionCliente, tipo: "cliente" | "costos") => void;

  // Quick controls
  panelRecommendations: PanelRecommendations | null;
  panelSeleccionado: CatalogoPanel | null;
  onSelectPanel: (id: string) => void;
  onApplyProposal: (cantidad: number) => void;
  cantidadMicros: number;
  panelesPorMicro: number;

  // CFE proposals (for quick switch)
  panelesPromedio: number;
  panelesEquilibrado: number;
  panelesMax: number;
  panelesConIncremento: number;
  reciboUltimoAnio: boolean;
  onSetReciboUltimoAnio: (v: boolean) => void;
}

/* ── Conversion helpers ───────────────────────────────────────────── */
/** Utility % → Margin % (e.g. 25% util → 20% margin) */
const utilToMargin = (u: number) => (u / (100 + u)) * 100;
/** Margin % → Utility % (e.g. 20% margin → 25% util) */
const marginToUtil = (m: number) => (m >= 100 ? 9999 : (m / (100 - m)) * 100);

/* ── Strategy presets ────────────────────────────────────────────── */
// Equipment (panels, inverters) = commodity, thinner margin
// Structure/hardware/labor = higher margin opportunity

interface StrategyPreset {
  id: string;
  label: string;
  desc: string;
  icon: string;
  color: string;           // tailwind accent
  global: number;
  panelesPct: number;
  inversoresPct: number;
  estructuraPct: number;
  tornilleriaPct: number;
  generalesPct: number;
}

const PRESETS: StrategyPreset[] = [
  {
    id: "negocio",
    label: "Negocio",
    desc: "Maximiza utilidad",
    icon: "\uD83D\uDCB0",
    color: "amber",
    global: 100,
    panelesPct: 100,
    inversoresPct: 100,
    estructuraPct: 100,
    tornilleriaPct: 100,
    generalesPct: 100,
  },
  {
    id: "equilibrado",
    label: "Equilibrado",
    desc: "Competitivo y rentable",
    icon: "\u2696\uFE0F",
    color: "emerald",
    global: 80,
    panelesPct: 80,
    inversoresPct: 80,
    estructuraPct: 80,
    tornilleriaPct: 80,
    generalesPct: 80,
  },
  {
    id: "cliente",
    label: "Cliente",
    desc: "Mejor precio posible",
    icon: "\uD83E\uDD1D",
    color: "cyan",
    global: 60,
    panelesPct: 60,
    inversoresPct: 60,
    estructuraPct: 60,
    tornilleriaPct: 60,
    generalesPct: 60,
  },
];

function applyPreset(current: UtilidadConfig, preset: StrategyPreset): UtilidadConfig {
  return {
    ...current,
    globalPct: preset.global,
    panelesPct: preset.panelesPct,
    inversoresPct: preset.inversoresPct,
    estructuraPct: preset.estructuraPct,
    tornilleriaPct: preset.tornilleriaPct,
    generalesPct: preset.generalesPct,
  };
}

/** Check if current utilidad matches a preset (for active indicator) */
function activePreset(u: UtilidadConfig): string | null {
  for (const p of PRESETS) {
    if (u.tipo === "global" && u.globalPct === p.global) return p.id;
    if (
      u.tipo === "por_partida" &&
      u.panelesPct === p.panelesPct &&
      u.inversoresPct === p.inversoresPct &&
      u.estructuraPct === p.estructuraPct &&
      u.tornilleriaPct === p.tornilleriaPct &&
      u.generalesPct === p.generalesPct
    )
      return p.id;
  }
  return null;
}

export default function PrecioClienteWidget({
  mostrarPrecioCliente,
  onSetMostrarPrecioCliente,
  subtotalMXN,
  utilidad,
  onSetUtilidad,
  partidaPanelesMXN,
  partidaInversoresMXN,
  partidaEstructuraMXN,
  partidaTornilleriaMXN,
  partidaGeneralesMXN,
  clientePanelesMXN,
  clienteInversoresMXN,
  clienteEstructuraMXN,
  clienteTornilleriaMXN,
  clienteGeneralesMXN,
  clienteSubtotalMXN,
  clienteIvaMXN,
  clienteTotalMXN,
  clientePorPanel,
  clientePorWatt,
  utilidadNetaMXN,
  utilidadNetaPct,
  cantidadNum,
  reciboCFEExists,
  nombreCotizacion,
  nombreVariante,
  onSetNombreVariante,
  variantes,
  mostrarVariantes,
  onSetMostrarVariantes,
  mostrarComparador,
  onSetMostrarComparador,
  onGuardarVariante,
  onEliminarVariante,
  onCargarVariante,
  onVerPDFVariante,
  panelRecommendations,
  panelSeleccionado,
  onSelectPanel,
  onApplyProposal,
  cantidadMicros,
  panelesPorMicro,
  panelesPromedio,
  panelesEquilibrado,
  panelesMax,
  panelesConIncremento,
  reciboUltimoAnio,
  onSetReciboUltimoAnio,
}: PrecioClienteWidgetProps) {
  const [showQuickControls, setShowQuickControls] = useState(false);
  const [cantidadInput, setCantidadInput] = useState("");

  if (subtotalMXN <= 0) return null;

  // Inverter optimization
  const capacidadTotal = cantidadMicros * panelesPorMicro;
  const espaciosLibres = capacidadTotal - cantidadNum;
  const infrautilizado = cantidadNum > 0 && espaciosLibres > 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        onClick={() => onSetMostrarPrecioCliente(!mostrarPrecioCliente)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
      >
        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
          Precio al Cliente
        </h3>
        <span className="text-xs text-zinc-600">
          {mostrarPrecioCliente ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {mostrarPrecioCliente && (
        <div>
          {/* Strategy presets */}
          {(() => {
            const current = activePreset(utilidad);
            return (
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wide font-semibold mb-2">Estrategia</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESETS.map((p) => {
                    const isActive = current === p.id;
                    const borderColor = isActive
                      ? p.color === "amber" ? "border-amber-400/60" : p.color === "emerald" ? "border-emerald-400/60" : "border-cyan-400/60"
                      : "border-zinc-700";
                    const bgColor = isActive
                      ? p.color === "amber" ? "bg-amber-400/10" : p.color === "emerald" ? "bg-emerald-400/10" : "bg-cyan-400/10"
                      : "bg-zinc-800/50 hover:bg-zinc-800";
                    const textColor = isActive
                      ? p.color === "amber" ? "text-amber-400" : p.color === "emerald" ? "text-emerald-400" : "text-cyan-400"
                      : "text-zinc-400";
                    return (
                      <button
                        key={p.id}
                        onClick={() => onSetUtilidad(applyPreset(utilidad, p))}
                        className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border transition-all ${borderColor} ${bgColor}`}
                      >
                        <span className="text-sm leading-none">{p.icon}</span>
                        <span className={`text-[11px] font-semibold ${textColor}`}>{p.label}</span>
                        <span className="text-[9px] text-zinc-600 leading-tight">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Quick controls (collapsible) */}
          <div className="border-b border-zinc-800">
            <button
              onClick={() => setShowQuickControls(!showQuickControls)}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-800/30 transition-colors"
            >
              <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wide">
                Ajuste rápido
              </span>
              <span className="text-[10px] text-zinc-600">{showQuickControls ? "\u25B2" : "\u25BC"}</span>
            </button>

            {showQuickControls && (
              <div className="px-4 pb-3 space-y-3">
                {/* CFE proposal quick switch */}
                {reciboCFEExists && panelesPromedio > 0 && (() => {
                  const proposals = [
                    { id: "promedio", label: "Promedio", paneles: panelesPromedio, color: "amber" },
                    { id: "equilibrada", label: "P75", paneles: panelesEquilibrado, color: "emerald" },
                    { id: "maxima", label: "Máxima", paneles: panelesMax, color: "zinc" },
                    ...(panelesConIncremento > 0 && panelesConIncremento !== panelesEquilibrado
                      ? [{ id: "incremento", label: "+Splits", paneles: panelesConIncremento, color: "cyan" }]
                      : []),
                  ];
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Propuesta</p>
                        <button
                          onClick={() => onSetReciboUltimoAnio(!reciboUltimoAnio)}
                          className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
                        >
                          {reciboUltimoAnio ? "6 bim" : "12 bim"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {proposals.map((p) => {
                          const isActive = cantidadNum === p.paneles;
                          const activeBorder = p.color === "amber" ? "border-amber-400/50 bg-amber-400/10"
                            : p.color === "emerald" ? "border-emerald-400/50 bg-emerald-400/10"
                            : p.color === "cyan" ? "border-cyan-400/50 bg-cyan-400/10"
                            : "border-zinc-400/50 bg-zinc-400/10";
                          const activeText = p.color === "amber" ? "text-amber-400"
                            : p.color === "emerald" ? "text-emerald-400"
                            : p.color === "cyan" ? "text-cyan-400"
                            : "text-zinc-300";
                          return (
                            <button
                              key={p.id}
                              onClick={() => onApplyProposal(p.paneles)}
                              className={`flex items-center gap-1 rounded-md border px-2 py-1 transition-all ${
                                isActive ? activeBorder : "border-zinc-700/60 bg-zinc-800/40 hover:border-zinc-600"
                              }`}
                            >
                              <span className={`text-[10px] font-semibold ${isActive ? activeText : "text-zinc-400"}`}>
                                {p.label}
                              </span>
                              <span className={`text-[10px] font-mono ${isActive ? activeText : "text-zinc-500"}`}>
                                {p.paneles}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Panel recommendations */}
                {panelRecommendations && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Panel</p>
                    <div className="flex flex-wrap gap-1.5">
                      {panelRecommendations.mejorUnitario && (
                        <button
                          onClick={() => onSelectPanel(panelRecommendations.mejorUnitario!.id)}
                          className={`flex items-center gap-1 rounded-md border px-2 py-1 transition-all text-left ${
                            panelSeleccionado?.id === panelRecommendations.mejorUnitario.id
                              ? "border-emerald-400/50 bg-emerald-400/10" : "border-zinc-700/60 bg-zinc-800/40 hover:border-emerald-400/30"
                          }`}
                        >
                          <span className="text-[9px]">{panelSeleccionado?.id === panelRecommendations.mejorUnitario.id ? "\u2713" : "\u26A1"}</span>
                          <div>
                            <p className="text-[9px] text-emerald-400 font-semibold leading-none">Mejor $/W</p>
                            <p className="text-[9px] text-zinc-500">{panelRecommendations.mejorUnitario.marca} {panelRecommendations.mejorUnitario.potencia}W</p>
                          </div>
                        </button>
                      )}
                      {panelRecommendations.mejorCostoBeneficio && panelRecommendations.mejorCostoBeneficio.id !== panelRecommendations.mejorUnitario?.id && (
                        <button
                          onClick={() => onSelectPanel(panelRecommendations.mejorCostoBeneficio!.id)}
                          className={`flex items-center gap-1 rounded-md border px-2 py-1 transition-all text-left ${
                            panelSeleccionado?.id === panelRecommendations.mejorCostoBeneficio.id
                              ? "border-amber-400/50 bg-amber-400/10" : "border-zinc-700/60 bg-zinc-800/40 hover:border-amber-400/30"
                          }`}
                        >
                          <span className="text-[9px]">{panelSeleccionado?.id === panelRecommendations.mejorCostoBeneficio.id ? "\u2713" : "\u2B50"}</span>
                          <div>
                            <p className="text-[9px] text-amber-400 font-semibold leading-none">Costo-beneficio</p>
                            <p className="text-[9px] text-zinc-500">{panelRecommendations.mejorCostoBeneficio.marca} {panelRecommendations.mejorCostoBeneficio.potencia}W</p>
                          </div>
                        </button>
                      )}
                      {panelRecommendations.mejorPallet && (
                        <button
                          onClick={() => onSelectPanel(panelRecommendations.mejorPallet!.id)}
                          className={`flex items-center gap-1 rounded-md border px-2 py-1 transition-all text-left ${
                            panelSeleccionado?.id === panelRecommendations.mejorPallet.id
                              ? "border-cyan-400/50 bg-cyan-400/10" : "border-zinc-700/60 bg-zinc-800/40 hover:border-cyan-400/30"
                          }`}
                        >
                          <span className="text-[9px]">{panelSeleccionado?.id === panelRecommendations.mejorPallet.id ? "\u2713" : "\uD83D\uDCE6"}</span>
                          <div>
                            <p className="text-[9px] text-cyan-400 font-semibold leading-none">Mejor pallet</p>
                            <p className="text-[9px] text-zinc-500">{panelRecommendations.mejorPallet.marca} {panelRecommendations.mejorPallet.potencia}W</p>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual quantity + apply */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Cantidad de paneles</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-mono">{cantidadNum} paneles</span>
                    <span className="text-[10px] text-zinc-600">→</span>
                    <input
                      type="number"
                      min={1}
                      value={cantidadInput}
                      onChange={(e) => setCantidadInput(e.target.value)}
                      placeholder={String(cantidadNum)}
                      className="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 text-right font-mono outline-none focus:border-amber-400 placeholder-zinc-600"
                    />
                    <button
                      onClick={() => {
                        const n = Number(cantidadInput);
                        if (n > 0) { onApplyProposal(n); setCantidadInput(""); }
                      }}
                      disabled={!cantidadInput || Number(cantidadInput) <= 0}
                      className="text-[10px] px-2 py-1 rounded-md border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                {/* Inverter optimization */}
                {infrautilizado && (
                  <div className="rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2">
                    <p className="text-[10px] text-amber-400 font-medium">Inversor infrautilizado</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">
                      {cantidadMicros} inv. × {panelesPorMicro} = {capacidadTotal} paneles.{" "}
                      <span className="text-amber-400/80">{espaciosLibres} libre{espaciosLibres > 1 ? "s" : ""}.</span>
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      {espaciosLibres > 1 && (
                        <button
                          onClick={() => onApplyProposal(cantidadNum + 1)}
                          className="text-[10px] px-2 py-0.5 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                        >
                          +1 → {cantidadNum + 1}
                        </button>
                      )}
                      <button
                        onClick={() => onApplyProposal(capacidadTotal)}
                        className="text-[10px] px-2 py-0.5 rounded-md border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors font-medium"
                      >
                        Llenar → {capacidadTotal}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tipo de utilidad */}
          <div className="px-4 py-3 border-b border-zinc-800 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => onSetUtilidad({ ...utilidad, tipo: "global" })}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  utilidad.tipo === "global"
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
                    : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                }`}
              >
                % Global
              </button>
              <button
                onClick={() => onSetUtilidad({ ...utilidad, tipo: "por_partida" })}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  utilidad.tipo === "por_partida"
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
                    : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                }`}
              >
                % Por partida
              </button>
            </div>

            {utilidad.tipo === "global" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-500 w-20">Utilidad</label>
                  <input
                    type="number"
                    value={utilidad.globalPct}
                    onChange={(e) =>
                      onSetUtilidad({ ...utilidad, globalPct: Number(e.target.value) || 0 })
                    }
                    className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 text-right font-mono outline-none focus:border-emerald-400"
                  />
                  <span className="text-xs text-zinc-500">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-500 w-20">Margen</label>
                  <input
                    type="number"
                    value={+utilToMargin(utilidad.globalPct).toFixed(2)}
                    onChange={(e) => {
                      const m = Number(e.target.value) || 0;
                      onSetUtilidad({ ...utilidad, globalPct: +marginToUtil(m).toFixed(2) });
                    }}
                    className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 text-right font-mono outline-none focus:border-amber-400"
                  />
                  <span className="text-xs text-zinc-500">%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header labels */}
                <div className="flex items-center gap-2">
                  <span className="w-20" />
                  <span className="w-20 text-[10px] text-zinc-600 text-center">Utilidad</span>
                  <span className="w-4" />
                  <span className="w-20 text-[10px] text-zinc-600 text-center">Margen</span>
                </div>
                {(
                  [
                    ["panelesPct", "Paneles", partidaPanelesMXN],
                    ["inversoresPct", "Inversores", partidaInversoresMXN],
                    ["estructuraPct", "Estructura", partidaEstructuraMXN],
                    ["tornilleriaPct", "Tornilleria", partidaTornilleriaMXN],
                    ["generalesPct", "Generales", partidaGeneralesMXN],
                  ] as const
                ).map(([key, label, val]) =>
                  val > 0 ? (
                    <div key={key} className="flex items-center gap-2">
                      <label className="text-xs text-zinc-500 w-20">{label}</label>
                      <input
                        type="number"
                        value={utilidad[key]}
                        onChange={(e) =>
                          onSetUtilidad({ ...utilidad, [key]: Number(e.target.value) || 0 })
                        }
                        className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 text-right font-mono outline-none focus:border-emerald-400"
                      />
                      <span className="text-xs text-zinc-500">%</span>
                      <input
                        type="number"
                        value={+utilToMargin(utilidad[key]).toFixed(2)}
                        onChange={(e) => {
                          const m = Number(e.target.value) || 0;
                          onSetUtilidad({ ...utilidad, [key]: +marginToUtil(m).toFixed(2) });
                        }}
                        className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 text-right font-mono outline-none focus:border-amber-400"
                      />
                      <span className="text-xs text-zinc-500">%</span>
                    </div>
                  ) : null,
                )}
              </div>
            )}

            {/* Monto fijo adicional */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 w-20">+ Fijo</label>
              <input
                type="number"
                value={utilidad.montoFijo || ""}
                onChange={(e) =>
                  onSetUtilidad({ ...utilidad, montoFijo: Number(e.target.value) || 0 })
                }
                placeholder="0"
                className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 text-right font-mono outline-none focus:border-emerald-400 placeholder-zinc-700"
              />
              <span className="text-xs text-zinc-500">MXN</span>
            </div>
          </div>

          {/* Desglose precio cliente */}
          <div className="px-4 py-2">
            {clientePanelesMXN > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-400">Paneles</span>
                <span className="text-xs font-mono text-zinc-300">
                  ${fmt(clientePanelesMXN * 1.16)}
                </span>
              </div>
            )}
            {clienteInversoresMXN > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-400">Inversores</span>
                <span className="text-xs font-mono text-zinc-300">
                  ${fmt(clienteInversoresMXN * 1.16)}
                </span>
              </div>
            )}
            {clienteEstructuraMXN > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-400">Estructura</span>
                <span className="text-xs font-mono text-zinc-300">
                  ${fmt(clienteEstructuraMXN * 1.16)}
                </span>
              </div>
            )}
            {clienteTornilleriaMXN > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-400">Tornilleria</span>
                <span className="text-xs font-mono text-zinc-300">
                  ${fmt(clienteTornilleriaMXN * 1.16)}
                </span>
              </div>
            )}
            {clienteGeneralesMXN > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-400">Generales</span>
                <span className="text-xs font-mono text-zinc-300">
                  ${fmt(clienteGeneralesMXN * 1.16)}
                </span>
              </div>
            )}
            {utilidad.montoFijo > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-400">Adicional fijo</span>
                <span className="text-xs font-mono text-zinc-300">
                  ${fmt(utilidad.montoFijo * 1.16)}
                </span>
              </div>
            )}
          </div>

          {/* Totales cliente */}
          <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Subtotal</span>
              <span className="font-mono">${fmt(clienteSubtotalMXN)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>IVA 16%</span>
              <span className="font-mono">${fmt(clienteIvaMXN)}</span>
            </div>
          </div>

          <div className="bg-emerald-400/5 border-t border-emerald-400/20 px-4 py-4 space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold text-zinc-300">Total cliente</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400 font-mono leading-none">
                  ${fmt(clienteTotalMXN)}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">MXN con IVA</div>
              </div>
            </div>
            {cantidadNum > 0 && (
              <div className="flex items-end justify-between pt-2 border-t border-emerald-400/10">
                <div>
                  <span className="text-xs font-semibold text-zinc-400">Precio por panel</span>
                  <p className="text-[10px] text-zinc-600">
                    Total &divide; {cantidadNum} paneles
                  </p>
                </div>
                <span className="text-xl font-bold text-emerald-300 font-mono">
                  ${fmt(clientePorPanel)}
                </span>
              </div>
            )}
          </div>

          {/* Precio por Watt */}
          {cantidadNum > 0 && (
            <div className="border-t border-zinc-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-zinc-600 uppercase">Precio por Watt</p>
                <p className="text-sm font-bold text-emerald-400 font-mono">
                  ${fmt(clientePorWatt)}
                </p>
              </div>
            </div>
          )}

          {/* Utilidad neta */}
          <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase">Utilidad neta</p>
                <p className="text-[10px] text-zinc-600">
                  {utilidadNetaPct.toFixed(1)}% sobre costo
                </p>
                <p className="text-[10px] text-amber-400/60">
                  {utilToMargin(utilidadNetaPct).toFixed(1)}% margen
                </p>
              </div>
              <span className="text-lg font-bold text-amber-400 font-mono">
                ${fmt(utilidadNetaMXN)}
              </span>
            </div>
          </div>

          {/* Guardar variante */}
          {nombreCotizacion.trim() && (
            <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={nombreVariante}
                  onChange={(e) => onSetNombreVariante(e.target.value)}
                  placeholder="Nombre de variante (ej: Opcion A)"
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-400"
                />
                <button
                  onClick={onGuardarVariante}
                  disabled={!nombreVariante.trim()}
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Guardar
                </button>
              </div>
              {!nombreCotizacion.trim() && (
                <p className="text-[10px] text-red-400">
                  Primero guarda la cotizacion de costos
                </p>
              )}
            </div>
          )}

          {/* Lista de variantes guardadas */}
          {variantes.length > 0 && (
            <div className="border-t border-zinc-800">
              <button
                onClick={() => onSetMostrarVariantes(!mostrarVariantes)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wide">
                  {variantes.length} variante{variantes.length > 1 ? "s" : ""} guardada
                  {variantes.length > 1 ? "s" : ""}
                </span>
                <span className="text-xs text-zinc-600">
                  {mostrarVariantes ? "\u25B2" : "\u25BC"}
                </span>
              </button>

              {mostrarVariantes && (
                <div className="space-y-px">
                  {variantes.map((v) => (
                    <div
                      key={v.id}
                      className="px-4 py-3 bg-zinc-800/30 border-t border-zinc-800/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-medium text-zinc-300">{v.nombre}</p>
                          <p className="text-[10px] text-zinc-600">
                            {v.utilidad.tipo === "global"
                              ? `${v.utilidad.globalPct}% global`
                              : "% por partida"}
                            {v.utilidad.montoFijo > 0 && ` + $${fmt(v.utilidad.montoFijo)}`}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => onCargarVariante(v)}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            Usar
                          </button>
                          <button
                            onClick={() => onEliminarVariante(v.id)}
                            className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            &#x2715;
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[10px] text-zinc-600">Total</p>
                          <p className="text-xs font-bold text-emerald-400 font-mono">
                            ${fmt(v.precios.total)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600">Por panel</p>
                          <p className="text-xs font-bold text-emerald-300 font-mono">
                            ${fmt(v.precios.porPanel)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600">Utilidad</p>
                          <p className="text-xs font-bold text-amber-400 font-mono">
                            ${fmt(v.precios.utilidadNeta)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => onVerPDFVariante(v, "cliente")}
                          className="flex-1 text-[10px] py-1 rounded-md border border-emerald-400/25 text-emerald-400/80 hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors text-center"
                        >
                          PDF Cliente
                        </button>
                        <button
                          onClick={() => onVerPDFVariante(v, "costos")}
                          className="flex-1 text-[10px] py-1 rounded-md border border-zinc-700 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors text-center"
                        >
                          PDF Costos
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Comparacion: mejor para cliente vs mejor para nosotros */}
                  {variantes.length >= 2 && (
                    <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700 space-y-2">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wide">
                        Comparacion
                      </p>
                      {(() => {
                        const mejorCliente = [...variantes].sort(
                          (a, b) => a.precios.total - b.precios.total,
                        )[0];
                        const mejorNosotros = [...variantes].sort(
                          (a, b) => b.precios.utilidadNeta - a.precios.utilidadNeta,
                        )[0];
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-500">
                                Mejor para cliente
                              </span>
                              <span className="text-xs text-emerald-400 font-medium">
                                {mejorCliente.nombre} &mdash; ${fmt(mejorCliente.precios.total)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-500">
                                Mejor para nosotros
                              </span>
                              <span className="text-xs text-amber-400 font-medium">
                                {mejorNosotros.nombre} &mdash;{" "}
                                ${fmt(mejorNosotros.precios.utilidadNeta)}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                      <button
                        onClick={() => onSetMostrarComparador(!mostrarComparador)}
                        className="w-full text-xs text-center py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors mt-1"
                      >
                        {mostrarComparador ? "Cerrar comparador" : "Ver comparador completo"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
