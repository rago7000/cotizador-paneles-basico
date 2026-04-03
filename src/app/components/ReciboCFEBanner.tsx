"use client";

import { useState } from "react";
import { fmt } from "../components/primitives";
import type { ReciboCFEData, Minisplit } from "../lib/cotizacion-state";
import ChartConsumoGeneracion from "./ChartConsumoGeneracion";

// ── Constants ──────────────────────────────────────────────────────────────────

const WATTS_POR_TON: Record<Minisplit["tipo"], number> = {
  inverter: 900,
  convencional: 1400,
};

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ReciboCFEBannerProps {
  reciboCFE: ReciboCFEData | null;
  reciboDetalle: boolean;
  onSetReciboDetalle: (v: boolean) => void;
  loadingRecibo: boolean;
  errorRecibo: string;
  reciboUltimoAnio: boolean;
  onSetReciboUltimoAnio: (v: boolean) => void;
  potencia: string;
  minisplits: Minisplit[];
  minisplitTemporada: "anual" | "temporada";
  onAddMinisplit: () => void;
  onRemoveMinisplit: (id: string) => void;
  onUpdateMinisplit: (id: string, field: keyof Minisplit, value: string | number) => void;
  onSetMinisplitTemporada: (v: "anual" | "temporada") => void;
  onUploadClick: () => void;
  onSetReciboCFE: (v: ReciboCFEData | null) => void;
  onSetCantidad: (v: string) => void;
  /** Apply proposal cascade: sets cantidad + structure + electrical + generales */
  onApplyProposal?: (cantidadPaneles: number) => void;
  /** Optional: use client name as cotización name */
  onSetNombreCotizacion?: (v: string) => void;
  /** Optional: base64 string of the original PDF */
  reciboPDFBase64?: string | null;

  // Derived CFE values
  consumoMensualCFE: number;
  kWpSugerido: number;
  panelesSugeridosCFE: number;
  consumoMensualCalc: number;
  panelesPromedio: number;
  panelesEquilibrado: number;
  panelesMax: number;
  panelesConIncremento: number;
  kWpPromedio: number;
  kWpEquilibrado: number;
  kWpMax: number;
  kWpConIncremento: number;
  consumoP75: number;
  consumoMensualMax: number;
  maxHistKwh: number;
  minisplitKwhMes: number;
  minisplitKwhMesProm: number;
  consumoConIncremento: number;
  historicoFiltrado: { periodo: string; kwh: number; importe: number }[];
  /** Client history: exact and fuzzy matches from saved cotizaciones */
  clienteHistorial?: {
    exactas: { nombre: string; fecha: string }[];
    similares: { nombre: string; fecha: string; razon: string }[];
  } | null;
  /** Load a saved cotización by name */
  onCargarCotizacion?: (nombre: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ReciboCFEBanner({
  reciboCFE,
  reciboDetalle,
  onSetReciboDetalle,
  loadingRecibo,
  errorRecibo,
  reciboUltimoAnio,
  onSetReciboUltimoAnio,
  potencia,
  minisplits,
  minisplitTemporada,
  onAddMinisplit,
  onRemoveMinisplit,
  onUpdateMinisplit,
  onSetMinisplitTemporada,
  onUploadClick,
  onSetReciboCFE,
  onSetCantidad,
  onApplyProposal,
  onSetNombreCotizacion,
  reciboPDFBase64,
  consumoMensualCFE,
  kWpSugerido,
  panelesSugeridosCFE,
  consumoMensualCalc,
  panelesPromedio,
  panelesEquilibrado,
  panelesMax,
  panelesConIncremento,
  kWpPromedio,
  kWpEquilibrado,
  kWpMax,
  kWpConIncremento,
  consumoP75,
  consumoMensualMax,
  maxHistKwh,
  minisplitKwhMes,
  minisplitKwhMesProm,
  consumoConIncremento,
  historicoFiltrado,
  clienteHistorial,
  onCargarCotizacion,
}: ReciboCFEBannerProps) {
  const [showChart, setShowChart] = useState(false);
  const [showFormula, setShowFormula] = useState<"promedio" | "equilibrada" | "maxima" | null>(null);
  const panelW = Number(potencia) || 545;

  if (reciboCFE) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
        {/* Header -- clickable to toggle detail */}
        <button
          onClick={() => onSetReciboDetalle(!reciboDetalle)}
          className="w-full flex items-center justify-between px-5 py-3 border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">&#x26A1;</span>
            <span className="text-sm font-semibold text-zinc-100">Recibo CFE</span>
            <span className="text-xs text-zinc-500 truncate max-w-48">{reciboCFE.nombre}</span>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
              Tarifa {reciboCFE.tarifa}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{reciboDetalle ? "Ocultar" : "Ver detalle"}</span>
            <svg
              className={`w-4 h-4 text-zinc-500 transition-transform ${reciboDetalle ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <button
              onClick={(e) => { e.stopPropagation(); onSetReciboCFE(null); onSetReciboDetalle(false); }}
              className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs px-1 ml-1"
              title="Cerrar"
            >
              &#x2715;
            </button>
          </div>
        </button>

        {/* Summary metrics */}
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div>
            <div className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Consumo periodo</div>
            <div className="text-xl font-bold text-zinc-100">{reciboCFE.consumoKwh} <span className="text-sm font-normal text-zinc-400">kWh</span></div>
            <div className="text-xs text-zinc-600 mt-0.5">{reciboCFE.diasPeriodo} dias &middot; {reciboCFE.periodoInicio} &ndash; {reciboCFE.periodoFin}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Promedio mensual</div>
            <div className="text-xl font-bold text-zinc-100">{Math.round(consumoMensualCFE)} <span className="text-sm font-normal text-zinc-400">kWh/mes</span></div>
            <div className="text-xs text-zinc-600 mt-0.5">{reciboCFE.historico.length} periodos de historial</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Sistema sugerido</div>
            <div className="text-xl font-bold text-amber-400">{kWpSugerido.toFixed(2)} <span className="text-sm font-normal text-amber-400/60">kWp</span></div>
            <div className="text-xs text-zinc-600 mt-0.5">~{panelesSugeridosCFE} paneles de {panelW}W</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Ultimo recibo</div>
            <div className="text-xl font-bold text-zinc-100">${fmt(reciboCFE.totalFacturado)}</div>
            <div className="text-xs text-zinc-600 mt-0.5">MXN con IVA</div>
          </div>
        </div>

        {/* ── Client history: existing cotizaciones for this client ── */}
        {clienteHistorial && (
          <div className="mx-5 mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-2">
            {clienteHistorial.exactas.length > 0 && (
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs text-amber-300 font-medium">
                    Este cliente tiene {clienteHistorial.exactas.length} cotización{clienteHistorial.exactas.length > 1 ? "es" : ""} guardada{clienteHistorial.exactas.length > 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {clienteHistorial.exactas.map((c) => (
                      <button
                        key={c.nombre + c.fecha}
                        onClick={() => onCargarCotizacion?.(c.nombre)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 px-2.5 py-1 text-xs text-amber-200 transition-colors"
                        title={`Cargar cotización: ${c.nombre}`}
                      >
                        <span className="truncate max-w-40">{c.nombre}</span>
                        {c.fecha && (
                          <span className="text-amber-400/50 shrink-0">
                            {new Date(c.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {clienteHistorial.similares.length > 0 && (
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">
                    Nombres similares encontrados:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {clienteHistorial.similares.map((c) => (
                      <button
                        key={c.nombre + c.fecha}
                        onClick={() => onCargarCotizacion?.(c.nombre)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition-colors"
                        title={`${c.razon} — Cargar: ${c.nombre}`}
                      >
                        <span className="truncate max-w-40">{c.nombre}</span>
                        <span className="text-zinc-600 shrink-0">({c.razon})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Expandable detail ──────────────────────────────────────── */}
        {reciboDetalle && (
          <div className="border-t border-emerald-500/10 px-5 py-5 space-y-6">

            {/* Datos del servicio */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Datos del servicio</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="space-y-0.5">
                  <span className="text-xs text-zinc-600">Titular</span>
                  <p className="text-zinc-200">{reciboCFE.nombre}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-zinc-600">No. de Servicio</span>
                  <p className="text-zinc-200 font-mono">{reciboCFE.noServicio || "\u2014"}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-zinc-600">Direccion</span>
                  <p className="text-zinc-200">{reciboCFE.direccion || "\u2014"}</p>
                </div>
              </div>
            </div>

            {/* Historial de consumo -- tabla */}
            {reciboCFE.historico.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                  Consumo historico ({reciboCFE.historico.length} periodos)
                </h4>
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 px-4 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    <span>Periodo</span>
                    <span className="text-right">kWh</span>
                    <span className="text-right">Importe</span>
                    <span className="text-right">kWh/mes</span>
                  </div>
                  {(() => {
                    const allKwh = [reciboCFE.consumoKwh, ...reciboCFE.historico.map((x) => x.kwh)];
                    const maxKwh = Math.max(...allKwh);
                    const maxHistoricoKwh = reciboCFE.historico.length > 0 ? Math.max(...reciboCFE.historico.map((x) => x.kwh)) : 0;
                    const currentMensual = Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1));
                    const currentBarPct = maxKwh > 0 ? (reciboCFE.consumoKwh / maxKwh) * 100 : 0;
                    const isCurrentMax = reciboCFE.consumoKwh >= maxHistoricoKwh;
                    return (
                      <>
                        {/* Current period row -- highlighted */}
                        <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 px-4 py-2.5 border-t border-amber-500/30 items-center relative bg-amber-500/5">
                          <div className="absolute inset-y-0 left-0 bg-amber-500/10" style={{ width: `${currentBarPct}%` }} />
                          <span className="text-xs text-amber-400 relative font-semibold">
                            {reciboCFE.periodoInicio} &ndash; {reciboCFE.periodoFin}
                            <span className="ml-2 text-[10px] bg-amber-400/15 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">ACTUAL</span>
                            {isCurrentMax && <span className="ml-1 text-[10px] bg-red-400/15 text-red-400 px-1.5 py-0.5 rounded-full font-medium">PICO</span>}
                          </span>
                          <span className="text-xs text-amber-400 font-mono text-right relative font-bold">{reciboCFE.consumoKwh.toLocaleString()}</span>
                          <span className="text-xs text-amber-400/70 font-mono text-right relative">${fmt(reciboCFE.totalFacturado)}</span>
                          <span className="text-xs text-amber-400/60 font-mono text-right relative">~{currentMensual}</span>
                        </div>
                        {/* Historic periods */}
                        {reciboCFE.historico.map((h, i) => {
                          const mensual = Math.round(h.kwh / 2);
                          const barPct = maxKwh > 0 ? (h.kwh / maxKwh) * 100 : 0;
                          const isMax = !isCurrentMax && h.kwh === maxHistoricoKwh;
                          return (
                            <div
                              key={i}
                              className={`grid grid-cols-[1fr_80px_100px_80px] gap-2 px-4 py-2.5 border-t items-center relative ${isMax ? "border-red-500/30 bg-red-500/5" : "border-zinc-800/60"}`}
                            >
                              <div className={`absolute inset-y-0 left-0 ${isMax ? "bg-red-500/10" : "bg-emerald-500/5"}`} style={{ width: `${barPct}%` }} />
                              <span className={`text-xs relative ${isMax ? "text-red-400 font-semibold" : "text-zinc-300"}`}>
                                {h.periodo}
                                {isMax && <span className="ml-2 text-[10px] bg-red-400/15 text-red-400 px-1.5 py-0.5 rounded-full font-medium">PICO</span>}
                              </span>
                              <span className={`text-xs font-mono text-right relative font-medium ${isMax ? "text-red-400" : "text-zinc-100"}`}>{h.kwh.toLocaleString()}</span>
                              <span className={`text-xs font-mono text-right relative ${isMax ? "text-red-400/70" : "text-zinc-400"}`}>{h.importe > 0 ? `$${fmt(h.importe)}` : "\u2014"}</span>
                              <span className={`text-xs font-mono text-right relative ${isMax ? "text-red-400/60" : "text-zinc-500"}`}>~{mensual}</span>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                  {/* Average row */}
                  <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
                    <span className="text-xs font-semibold text-zinc-400 uppercase">Promedio</span>
                    <span className="text-xs text-zinc-200 font-mono text-right font-semibold">
                      {Math.round(reciboCFE.historico.reduce((s, h) => s + h.kwh, 0) / reciboCFE.historico.length).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono text-right">
                      ${fmt(reciboCFE.historico.reduce((s, h) => s + h.importe, 0) / reciboCFE.historico.length)}
                    </span>
                    <span className="text-xs text-amber-400 font-mono text-right font-semibold">
                      ~{Math.round(consumoMensualCFE)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-red-400/60 mt-2 flex items-center gap-1">
                  <span className="inline-block bg-red-400/15 text-red-400 px-1.5 py-0.5 rounded-full font-medium text-[10px]">PICO</span>
                  Bimestre de mayor consumo &mdash; se usa como referencia para la propuesta &quot;Maxima&quot;.
                </p>
              </div>
            )}

            {/* Gráfica consumo vs generación (oculta por defecto) */}
            <div className="mb-1">
              <button
                onClick={() => setShowChart(!showChart)}
                className="flex items-center gap-2 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <svg className={`w-3 h-3 transition-transform ${showChart ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Gráfica consumo vs generación
              </button>
              {showChart && (
                <div className="mt-3">
                  <ChartConsumoGeneracion
                    bimestres={(() => {
                      const items = [
                        { label: reciboCFE.periodoInicio?.slice(0, 7) || "Actual", consumoKwh: reciboCFE.consumoKwh },
                        ...historicoFiltrado.map((h) => ({ label: h.periodo?.replace(/\s*-\s*/, "–").slice(0, 12) || "", consumoKwh: h.kwh })),
                      ];
                      return items.reverse();
                    })()}
                    panelesPromedio={panelesPromedio}
                    panelesEquilibrado={panelesEquilibrado}
                    panelesMax={panelesMax}
                    panelesConIncremento={panelesConIncremento}
                    incrementoBimKwh={Math.round(minisplitKwhMesProm * 2)}
                    panelW={panelW}
                    hasMinisplits={minisplits.length > 0}
                    consumoObjetivoBim={{
                      promedio: consumoMensualCalc * 2,
                      equilibrada: consumoP75 * 2,
                      maxima: maxHistKwh,
                      incremento: consumoConIncremento * 2,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Propuestas de sistema */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Propuestas de sistema <span className="normal-case font-normal text-zinc-600">&middot; {panelW}W &middot; HSP 5.5 &middot; 132 kWh/kWp/mes</span>
                </h4>
                <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5 shrink-0">
                  <button
                    onClick={() => onSetReciboUltimoAnio(true)}
                    className={`text-[11px] px-3 py-1 rounded-md transition-colors font-medium ${reciboUltimoAnio ? "bg-amber-400/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    Ultimo ano ({Math.min(5, reciboCFE.historico.length) + 1} bim)
                  </button>
                  <button
                    onClick={() => onSetReciboUltimoAnio(false)}
                    className={`text-[11px] px-3 py-1 rounded-md transition-colors font-medium ${!reciboUltimoAnio ? "bg-amber-400/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    Todo el historial ({reciboCFE.historico.length + 1} bim)
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 mb-3">
                {reciboUltimoAnio
                  ? `Usando los ultimos ${Math.min(5, reciboCFE.historico.length) + 1} bimestres (${Math.min(5, reciboCFE.historico.length)} del historial + periodo actual).`
                  : `Usando todo el historial (${reciboCFE.historico.length + 1} bimestres incluyendo periodo actual).`
                }
              </p>
              {(() => {
                const genPanelBim = Math.round(panelW / 1000 * 132 * 2);
                const consumoPromBim = consumoMensualCalc * 2;
                const consumoEquilBim = consumoP75 * 2;
                const consumoMaxBim = maxHistKwh;
                const genPromedioBim = panelesPromedio * genPanelBim;
                const genEquilibradoBim = panelesEquilibrado * genPanelBim;
                const genMaxBim = panelesMax * genPanelBim;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Propuesta 1: Promedio */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Promedio</span>
                        <span className="text-[10px] bg-emerald-400/15 text-emerald-400 px-1.5 py-0.5 rounded-full">Recomendada</span>
                      </div>
                      <div className="text-center py-2">
                        <div className="text-3xl font-bold text-emerald-400">{panelesPromedio}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">paneles</div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-zinc-500">Consumo mensual</span><span className="text-zinc-300 font-mono">{consumoMensualCalc} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Consumo bimestral</span><span className="text-zinc-100 font-mono font-semibold">{consumoPromBim.toLocaleString()} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Sistema</span><span className="text-zinc-300 font-mono">{kWpPromedio.toFixed(2)} kWp</span></div>
                        <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5"><span className="text-zinc-500">Gen. por panel/bim</span><span className="text-zinc-300 font-mono">{genPanelBim} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Gen. total/bimestre</span><span className="text-emerald-400 font-mono font-semibold">{genPromedioBim.toLocaleString()} kWh</span></div>
                        <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5">
                          <span className="text-zinc-500">Diferencia</span>
                          <span className={`font-mono font-semibold ${genPromedioBim >= consumoPromBim ? "text-emerald-400" : "text-red-400"}`}>
                            {genPromedioBim >= consumoPromBim ? "+" : ""}{(genPromedioBim - consumoPromBim).toLocaleString()} kWh
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 leading-tight">Cubre el promedio de todos los periodos. Meses altos generan un poco de deuda con CFE, meses bajos acumulan excedente.</p>
                      <button
                        onClick={() => setShowFormula(showFormula === "promedio" ? null : "promedio")}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
                      >
                        <svg className={`w-2.5 h-2.5 transition-transform ${showFormula === "promedio" ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        ¿Cómo se calcula?
                      </button>
                      {showFormula === "promedio" && (
                        <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-2.5 space-y-1.5 text-[10px] font-mono text-zinc-500 leading-relaxed">
                          <p className="text-zinc-400 font-sans font-medium text-[10px] mb-1">Fórmula: promedio de todos los bimestres</p>
                          <p>bimestres = [{historicoFiltrado.map(h => h.kwh).reverse().join(", ")}, {reciboCFE.consumoKwh}]</p>
                          <p>suma = {(() => { const all = [...historicoFiltrado.map(h => h.kwh).reverse(), reciboCFE.consumoKwh]; return all.reduce((a, b) => a + b, 0).toLocaleString(); })()}</p>
                          <p>consumo_mensual = suma / {historicoFiltrado.length + 1} bim / 2 = <span className="text-emerald-400">{consumoMensualCalc} kWh/mes</span></p>
                          <p className="border-t border-zinc-800 pt-1.5 mt-1.5">gen_panel_mes = {panelW}W × 5.5 HSP × 30 días × 0.80 / 1000</p>
                          <p>gen_panel_mes = <span className="text-zinc-300">{Math.round(panelW / 1000 * 132)} kWh</span></p>
                          <p>paneles = ⌈{consumoMensualCalc} / {Math.round(panelW / 1000 * 132)}⌉ = <span className="text-emerald-400 font-semibold">{panelesPromedio}</span></p>
                        </div>
                      )}
                      <button
                        onClick={() => onApplyProposal ? onApplyProposal(panelesPromedio) : onSetCantidad(String(panelesPromedio))}
                        className="w-full text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/25 hover:border-emerald-400/50 rounded-lg px-3 py-1.5 transition-colors mt-1"
                      >
                        Aplicar {panelesPromedio} paneles
                      </button>
                    </div>

                    {/* Propuesta 2: Equilibrada (P75) */}
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Equilibrada</span>
                        <span className="text-[10px] bg-amber-400/15 text-amber-400 px-1.5 py-0.5 rounded-full">P75</span>
                      </div>
                      <div className="text-center py-2">
                        <div className="text-3xl font-bold text-amber-400">{panelesEquilibrado}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">paneles</div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-zinc-500">Consumo mensual</span><span className="text-zinc-300 font-mono">{consumoP75} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Consumo bimestral</span><span className="text-zinc-100 font-mono font-semibold">{consumoEquilBim.toLocaleString()} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Sistema</span><span className="text-zinc-300 font-mono">{kWpEquilibrado.toFixed(2)} kWp</span></div>
                        <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5"><span className="text-zinc-500">Gen. por panel/bim</span><span className="text-zinc-300 font-mono">{genPanelBim} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Gen. total/bimestre</span><span className="text-amber-400 font-mono font-semibold">{genEquilibradoBim.toLocaleString()} kWh</span></div>
                        <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5">
                          <span className="text-zinc-500">Diferencia</span>
                          <span className={`font-mono font-semibold ${genEquilibradoBim >= consumoEquilBim ? "text-emerald-400" : "text-red-400"}`}>
                            {genEquilibradoBim >= consumoEquilBim ? "+" : ""}{(genEquilibradoBim - consumoEquilBim).toLocaleString()} kWh
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 leading-tight">Cubre el 75% de los periodos sin depender del acumulado. Reduce al minimo la deuda con CFE en meses de alto consumo.</p>
                      <button
                        onClick={() => setShowFormula(showFormula === "equilibrada" ? null : "equilibrada")}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
                      >
                        <svg className={`w-2.5 h-2.5 transition-transform ${showFormula === "equilibrada" ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        ¿Cómo se calcula?
                      </button>
                      {showFormula === "equilibrada" && (() => {
                        const allKwh = [...historicoFiltrado.map(h => h.kwh), reciboCFE.consumoKwh].sort((a, b) => a - b);
                        const p75Idx = Math.floor(allKwh.length * 0.75);
                        const p75Bim = allKwh[p75Idx];
                        return (
                          <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-2.5 space-y-1.5 text-[10px] font-mono text-zinc-500 leading-relaxed">
                            <p className="text-zinc-400 font-sans font-medium text-[10px] mb-1">Fórmula: percentil 75 (P75) de los bimestres</p>
                            <p>bimestres ordenados = [{allKwh.join(", ")}]</p>
                            <p>índice P75 = ⌊{allKwh.length} × 0.75⌋ = {p75Idx}</p>
                            <p>consumo_bim_P75 = {p75Bim} kWh → mensual = {p75Bim} / 2 = <span className="text-amber-400">{Math.round(p75Bim / 2)} kWh/mes</span></p>
                            <p className="border-t border-zinc-800 pt-1.5 mt-1.5">gen_panel_mes = {panelW}W × 5.5 HSP × 30 × 0.80 / 1000 = <span className="text-zinc-300">{Math.round(panelW / 1000 * 132)} kWh</span></p>
                            <p>paneles = ⌈{Math.round(p75Bim / 2)} / {Math.round(panelW / 1000 * 132)}⌉ = <span className="text-amber-400 font-semibold">{panelesEquilibrado}</span></p>
                            <p className="text-zinc-600 font-sans italic mt-1">El P75 significa que el sistema cubre al menos {Math.round(allKwh.length * 0.75)} de {allKwh.length} bimestres sin depender de excedente acumulado.</p>
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => onApplyProposal ? onApplyProposal(panelesEquilibrado) : onSetCantidad(String(panelesEquilibrado))}
                        className="w-full text-xs text-amber-400 hover:text-amber-300 border border-amber-400/25 hover:border-amber-400/50 rounded-lg px-3 py-1.5 transition-colors mt-1"
                      >
                        Aplicar {panelesEquilibrado} paneles
                      </button>
                    </div>

                    {/* Propuesta 3: Maxima (referencia) */}
                    <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Maxima</span>
                        <span className="text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-full">Referencia</span>
                      </div>
                      <div className="text-center py-2">
                        <div className="text-3xl font-bold text-zinc-300">{panelesMax}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">paneles</div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-zinc-500">Consumo mensual</span><span className="text-zinc-300 font-mono">{consumoMensualMax} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Consumo bimestral</span><span className="text-zinc-100 font-mono font-semibold">{consumoMaxBim.toLocaleString()} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Sistema</span><span className="text-zinc-300 font-mono">{kWpMax.toFixed(2)} kWp</span></div>
                        <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5"><span className="text-zinc-500">Gen. por panel/bim</span><span className="text-zinc-300 font-mono">{genPanelBim} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Gen. total/bimestre</span><span className="text-zinc-100 font-mono font-semibold">{genMaxBim.toLocaleString()} kWh</span></div>
                        <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5">
                          <span className="text-zinc-500">Diferencia</span>
                          <span className={`font-mono font-semibold ${genMaxBim >= consumoMaxBim ? "text-emerald-400" : "text-red-400"}`}>
                            {genMaxBim >= consumoMaxBim ? "+" : ""}{(genMaxBim - consumoMaxBim).toLocaleString()} kWh
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 leading-tight">Cubriria hasta el bimestre de mayor consumo. Puede resultar sobredimensionado &mdash; solo como referencia.</p>
                      <button
                        onClick={() => setShowFormula(showFormula === "maxima" ? null : "maxima")}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
                      >
                        <svg className={`w-2.5 h-2.5 transition-transform ${showFormula === "maxima" ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        ¿Cómo se calcula?
                      </button>
                      {showFormula === "maxima" && (
                        <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-2.5 space-y-1.5 text-[10px] font-mono text-zinc-500 leading-relaxed">
                          <p className="text-zinc-400 font-sans font-medium text-[10px] mb-1">Fórmula: bimestre de mayor consumo</p>
                          <p>bimestres = [{historicoFiltrado.map(h => h.kwh).reverse().join(", ")}, {reciboCFE.consumoKwh}]</p>
                          <p>máximo = <span className="text-zinc-300">{maxHistKwh} kWh/bim</span></p>
                          <p>consumo_mensual = {maxHistKwh} / 2 = <span className="text-zinc-300">{consumoMensualMax} kWh/mes</span></p>
                          <p className="border-t border-zinc-800 pt-1.5 mt-1.5">gen_panel_mes = {panelW}W × 5.5 HSP × 30 × 0.80 / 1000 = <span className="text-zinc-300">{Math.round(panelW / 1000 * 132)} kWh</span></p>
                          <p>paneles = ⌈{consumoMensualMax} / {Math.round(panelW / 1000 * 132)}⌉ = <span className="text-zinc-300 font-semibold">{panelesMax}</span></p>
                        </div>
                      )}
                      <button
                        onClick={() => onApplyProposal ? onApplyProposal(panelesMax) : onSetCantidad(String(panelesMax))}
                        className="w-full text-xs text-zinc-400 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-1.5 transition-colors mt-1"
                      >
                        Aplicar {panelesMax} paneles
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Propuesta 4: Con incremento (minisplits) -- full width below */}
              <div className={`mt-3 rounded-xl border p-4 space-y-3 ${minisplits.length > 0 ? "border-cyan-500/20 bg-cyan-500/5" : "border-dashed border-zinc-700 bg-zinc-800/10"}`}>
                {minisplits.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
                    {/* Left: configurator */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Incremento por minisplits</span>
                          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5">
                            <button
                              onClick={() => onSetMinisplitTemporada("temporada")}
                              className={`text-[11px] px-2.5 py-0.5 rounded-md transition-colors font-medium ${minisplitTemporada === "temporada" ? "bg-cyan-400/15 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
                            >
                              Temporada
                            </button>
                            <button
                              onClick={() => onSetMinisplitTemporada("anual")}
                              className={`text-[11px] px-2.5 py-0.5 rounded-md transition-colors font-medium ${minisplitTemporada === "anual" ? "bg-cyan-400/15 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
                            >
                              Todo el ano
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {minisplits.map((m) => {
                          const wPerUnit = Number(m.toneladas) * WATTS_POR_TON[m.tipo];
                          const kwhMesUnit = Math.round((wPerUnit * m.horasDia * 30) / 1000);
                          return (
                            <div key={m.id} className="flex flex-wrap items-center gap-2">
                              <select value={m.cantidad} onChange={(e) => onUpdateMinisplit(m.id, "cantidad", Number(e.target.value))} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 w-14 focus:border-cyan-500/50 focus:outline-none">
                                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}&times;</option>)}
                              </select>
                              <select value={m.toneladas} onChange={(e) => onUpdateMinisplit(m.id, "toneladas", e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:border-cyan-500/50 focus:outline-none">
                                {["1", "1.5", "2", "2.5", "3"].map((t) => <option key={t} value={t}>{t} Ton</option>)}
                              </select>
                              <div className="flex items-center gap-1">
                                <input type="number" min={1} max={24} value={m.horasDia} onChange={(e) => onUpdateMinisplit(m.id, "horasDia", Math.min(24, Math.max(1, Number(e.target.value))))} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 w-14 focus:border-cyan-500/50 focus:outline-none text-center" />
                                <span className="text-[10px] text-zinc-500">h/dia</span>
                              </div>
                              <select value={m.tipo} onChange={(e) => onUpdateMinisplit(m.id, "tipo", e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:border-cyan-500/50 focus:outline-none">
                                <option value="inverter">Inverter</option>
                                <option value="convencional">Convencional</option>
                              </select>
                              <span className="text-[10px] text-cyan-400/70 font-mono">{(kwhMesUnit * m.cantidad).toLocaleString()} kWh/mes</span>
                              <button onClick={() => onRemoveMinisplit(m.id)} className="text-zinc-600 hover:text-red-400 transition-colors text-xs px-1" title="Eliminar">&#x2715;</button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3">
                        <button onClick={onAddMinisplit} className="text-[11px] text-cyan-400/70 hover:text-cyan-400 transition-colors">+ Agregar equipo</button>
                        <span className="text-xs text-zinc-500">Total: <span className="text-cyan-400 font-mono font-semibold">{Math.round(minisplitKwhMes)} kWh/mes</span>{minisplitTemporada === "temporada" && <span className="text-zinc-600 ml-1">(prom. anual: {minisplitKwhMesProm})</span>}</span>
                      </div>
                    </div>

                    {/* Right: result card */}
                    <div className="sm:w-56 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Con incremento</span>
                        <span className="text-[10px] bg-cyan-400/15 text-cyan-400 px-1.5 py-0.5 rounded-full">+Minisplits</span>
                      </div>
                      <div className="text-center py-1">
                        <div className="text-3xl font-bold text-cyan-400">{panelesConIncremento}</div>
                        <div className="text-xs text-zinc-500">paneles</div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-zinc-500">Actual</span><span className="text-zinc-300 font-mono">{consumoMensualCalc} kWh/mes</span></div>
                        <div className="flex justify-between"><span className="text-cyan-400/70">+ Minisplits</span><span className="text-cyan-400 font-mono font-semibold">+{minisplitKwhMesProm}</span></div>
                        <div className="flex justify-between border-t border-zinc-800/60 pt-1.5"><span className="text-zinc-500">Total</span><span className="text-zinc-100 font-mono font-semibold">{consumoConIncremento} kWh/mes</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Bimestre</span><span className="text-zinc-100 font-mono font-semibold">{(consumoConIncremento * 2).toLocaleString()} kWh</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Sistema</span><span className="text-zinc-300 font-mono">{kWpConIncremento.toFixed(2)} kWp</span></div>
                      </div>
                      <button
                        onClick={() => onApplyProposal ? onApplyProposal(panelesConIncremento) : onSetCantidad(String(panelesConIncremento))}
                        className="w-full text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-400/25 hover:border-cyan-400/50 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Aplicar {panelesConIncremento} paneles
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">El cliente planea agregar minisplits u otra carga?</span>
                    </div>
                    <button
                      onClick={onAddMinisplit}
                      className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-400/25 hover:border-cyan-400/50 rounded-lg px-4 py-1.5 transition-colors shrink-0"
                    >
                      + Simular incremento
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-600 mt-2">
                * HSP 5.5 estimadas para norte de Mexico. Formula: consumo mensual / 132 = kWp &rarr; x 1000 / {panelW}W = paneles.
              </p>
            </div>
          </div>
        )}

        {/* Action row */}
        <div className="px-5 pb-4 flex flex-wrap items-center gap-2 border-t border-emerald-500/10 pt-3">
          {onSetNombreCotizacion && (
            <button
              onClick={() => onSetNombreCotizacion(reciboCFE.nombre)}
              className="text-xs text-amber-400 hover:text-amber-300 border border-amber-400/25 hover:border-amber-400/50 rounded-lg px-3 py-1.5 transition-colors"
            >
              Usar nombre del cliente
            </button>
          )}
          <button
            onClick={() => onSetReciboDetalle(!reciboDetalle)}
            className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/25 hover:border-emerald-400/50 rounded-lg px-3 py-1.5 transition-colors"
          >
            {reciboDetalle ? "Ocultar desglose" : "Ver desglose"}
          </button>
          {reciboPDFBase64 && (
            <button
              onClick={() => {
                const win = window.open();
                if (win) {
                  win.document.write(`<iframe src="${reciboPDFBase64}" style="border:0;width:100%;height:100%" />`);
                  win.document.title = "Recibo CFE \u2014 " + reciboCFE.nombre;
                }
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/25 hover:border-emerald-400/50 rounded-lg px-3 py-1.5 transition-colors"
            >
              Ver PDF original
            </button>
          )}
          <button
            onClick={onUploadClick}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5"
          >
            Cambiar recibo
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state: no recibo loaded ──────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">&#x26A1;</span>
        <div>
          <p className="text-sm font-medium text-zinc-300">Cargar recibo CFE</p>
          <p className="text-xs text-zinc-600 mt-0.5">
            Sube el PDF o una foto del recibo &mdash; la IA extrae consumo, tarifa e historial
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {errorRecibo && (
          <span className="text-xs text-red-400 max-w-40 text-right">{errorRecibo}</span>
        )}
        <button
          onClick={onUploadClick}
          disabled={loadingRecibo}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingRecibo ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Leyendo&hellip;
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Subir recibo
            </>
          )}
        </button>
      </div>
    </div>
  );
}
