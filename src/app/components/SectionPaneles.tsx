"use client";

import type { CatalogoPanel } from "../lib/types";
import type { PanelRecommendations } from "../lib/auto-select-panel";
import { SectionCard, Field, NumInput, TcCustomRow, SaveToCatalogBanner, fmt } from "./primitives";

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtUSD3 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export interface SectionPanelesProps {
  // Catalog
  catalogoPaneles: CatalogoPanel[];
  panelSeleccionado: CatalogoPanel | null;
  onOpenPicker: () => void;
  onClearSeleccion: () => void;
  onSelectPanel: (panelId: string) => void;

  // Recommendations
  recommendations: PanelRecommendations | null;
  defaultPanel: CatalogoPanel | null;

  // Field values
  cantidad: string;
  potencia: string;
  precioPorWatt: string;
  fletePaneles: string;
  garantiaPaneles: string;
  tcCustomPaneles: string;

  // Setters
  onSetCantidad: (v: string) => void;
  onSetPotencia: (v: string) => void;
  onSetPrecioPorWatt: (v: string) => void;
  onSetFletePaneles: (v: string) => void;
  onSetGarantiaPaneles: (v: string) => void;
  onSetTcCustomPaneles: (v: string) => void;

  // Save-to-catalog
  sugerirGuardarPanel: boolean;
  onGuardarPanel: (marca: string, modelo: string) => void;
  onDismissGuardarPanel: () => void;

  // Computed values
  tcVal: number;
  partidaPanelesMXN: number;

  // Derived numeric values (computed by parent)
  cantidadNum: number;
  potenciaNum: number;
  precioNum: number;
  costoPanel: number;
  costoPanelesUSD: number;
  fletePanelesNum: number;
  garantiaPanelesNum: number;
  totalPanelesUSD: number;
}

export default function SectionPaneles({
  catalogoPaneles,
  panelSeleccionado,
  onOpenPicker,
  onClearSeleccion,
  onSelectPanel,
  recommendations,
  defaultPanel,
  cantidad,
  potencia,
  precioPorWatt,
  fletePaneles,
  garantiaPaneles,
  tcCustomPaneles,
  onSetCantidad,
  onSetPotencia,
  onSetPrecioPorWatt,
  onSetFletePaneles,
  onSetGarantiaPaneles,
  onSetTcCustomPaneles,
  sugerirGuardarPanel,
  onGuardarPanel,
  onDismissGuardarPanel,
  tcVal,
  partidaPanelesMXN,
  cantidadNum,
  potenciaNum,
  precioNum,
  costoPanel,
  costoPanelesUSD,
  fletePanelesNum,
  garantiaPanelesNum,
  totalPanelesUSD,
}: SectionPanelesProps) {
  return (
    <SectionCard num="1" title="Paneles" badge="USD sin IVA">
      {/* Catalog picker trigger */}
      <div className="flex items-center justify-between -mt-1 mb-1">
        <span className="text-xs text-zinc-600">
          {catalogoPaneles.length > 0 ? `${catalogoPaneles.length} panel${catalogoPaneles.length !== 1 ? "es" : ""} en catalogo` : "Catalogo vacio"}
        </span>
        <button
          onClick={onOpenPicker}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Del catalogo
        </button>
      </div>

      {/* Recommendation tags */}
      {recommendations && (
        <div className="flex flex-wrap gap-1.5 -mt-0.5 mb-1">
          {recommendations.mejorUnitario && (
            <button
              onClick={() => onSelectPanel(recommendations.mejorUnitario!.id)}
              className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all text-left ${
                panelSeleccionado?.id === recommendations.mejorUnitario.id
                  ? "border-emerald-400/50 bg-emerald-400/10"
                  : "border-zinc-700/60 bg-zinc-800/40 hover:border-emerald-400/30 hover:bg-emerald-400/5"
              }`}
            >
              <span className="text-[10px] leading-none">
                {panelSeleccionado?.id === recommendations.mejorUnitario.id ? "\u2713" : "\u26A1"}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-400 font-semibold leading-tight">Mejor $/W</p>
                <p className="text-[10px] text-zinc-500 leading-tight truncate">
                  {recommendations.mejorUnitario.marca} {recommendations.mejorUnitario.potencia}W
                  <span className="text-zinc-600"> · </span>
                  <span className="font-mono text-emerald-400/70">${fmtUSD3(recommendations.mejorUnitario.precioWatt)}/W</span>
                </p>
              </div>
            </button>
          )}

          {recommendations.mejorCostoBeneficio &&
            recommendations.mejorCostoBeneficio.id !== recommendations.mejorUnitario?.id && (
            <button
              onClick={() => onSelectPanel(recommendations.mejorCostoBeneficio!.id)}
              className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all text-left ${
                panelSeleccionado?.id === recommendations.mejorCostoBeneficio.id
                  ? "border-amber-400/50 bg-amber-400/10"
                  : "border-zinc-700/60 bg-zinc-800/40 hover:border-amber-400/30 hover:bg-amber-400/5"
              }`}
            >
              <span className="text-[10px] leading-none">
                {panelSeleccionado?.id === recommendations.mejorCostoBeneficio.id ? "\u2713" : "\u2B50"}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-amber-400 font-semibold leading-tight">Mejor costo-beneficio</p>
                <p className="text-[10px] text-zinc-500 leading-tight truncate">
                  {recommendations.mejorCostoBeneficio.marca} {recommendations.mejorCostoBeneficio.potencia}W
                  <span className="text-zinc-600"> · </span>
                  <span className="font-mono text-amber-400/70">{recommendations.mejorCostoBeneficio.detail}</span>
                </p>
              </div>
            </button>
          )}

          {recommendations.mejorPallet && (
            <button
              onClick={() => onSelectPanel(recommendations.mejorPallet!.id)}
              className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all text-left ${
                panelSeleccionado?.id === recommendations.mejorPallet.id
                  ? "border-cyan-400/50 bg-cyan-400/10"
                  : "border-zinc-700/60 bg-zinc-800/40 hover:border-cyan-400/30 hover:bg-cyan-400/5"
              }`}
            >
              <span className="text-[10px] leading-none">
                {panelSeleccionado?.id === recommendations.mejorPallet.id ? "\u2713" : "\uD83D\uDCE6"}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-cyan-400 font-semibold leading-tight">Mejor $/W pallet</p>
                <p className="text-[10px] text-zinc-500 leading-tight truncate">
                  {recommendations.mejorPallet.marca} {recommendations.mejorPallet.potencia}W
                  <span className="text-zinc-600"> · </span>
                  <span className="font-mono text-cyan-400/70">{recommendations.mejorPallet.detail}</span>
                </p>
              </div>
            </button>
          )}

          {defaultPanel && panelSeleccionado?.id !== defaultPanel.id && (
            <button
              onClick={() => onSelectPanel(defaultPanel.id)}
              className="group flex items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/40 hover:border-violet-400/30 hover:bg-violet-400/5 px-2.5 py-1.5 transition-all text-left"
            >
              <span className="text-[10px] leading-none">{"\u2302"}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-violet-400 font-semibold leading-tight">Default</p>
                <p className="text-[10px] text-zinc-500 leading-tight truncate">
                  {defaultPanel.marca} {defaultPanel.potencia}W
                  <span className="text-zinc-600"> · </span>
                  <span className="font-mono text-violet-400/70">${fmtUSD3(defaultPanel.precioPorWatt)}/W</span>
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Default panel tag (standalone, when no recommendations) */}
      {!recommendations && defaultPanel && panelSeleccionado?.id !== defaultPanel.id && (
        <div className="flex flex-wrap gap-1.5 -mt-0.5 mb-1">
          <button
            onClick={() => onSelectPanel(defaultPanel.id)}
            className="group flex items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/40 hover:border-violet-400/30 hover:bg-violet-400/5 px-2.5 py-1.5 transition-all text-left"
          >
            <span className="text-[10px] leading-none">{"\u2302"}</span>
            <div className="min-w-0">
              <p className="text-[10px] text-violet-400 font-semibold leading-tight">Default</p>
              <p className="text-[10px] text-zinc-500 leading-tight truncate">
                {defaultPanel.marca} {defaultPanel.potencia}W
                <span className="text-zinc-600"> · </span>
                <span className="font-mono text-violet-400/70">${fmtUSD3(defaultPanel.precioPorWatt)}/W</span>
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Chip item seleccionado */}
      {panelSeleccionado && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-400/8 border border-amber-400/25 px-3 py-2">
          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-medium text-amber-300 flex-1">
            {panelSeleccionado.marca} — {panelSeleccionado.modelo}
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            {panelSeleccionado.potencia}W · ${fmtUSD3(panelSeleccionado.precioPorWatt)}/W
          </span>
          <button onClick={onClearSeleccion} className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Cantidad">
          <NumInput value={cantidad} onChange={onSetCantidad} placeholder="Ej: 12" />
        </Field>
        <Field label="Potencia por panel (W)">
          <NumInput value={potencia} onChange={onSetPotencia} placeholder="Ej: 550" />
        </Field>
        <Field label="Precio / watt (USD)">
          <NumInput value={precioPorWatt} onChange={onSetPrecioPorWatt} placeholder="Ej: 0.18" step={0.001} />
        </Field>
      </div>

      {/* Save to catalog suggestion */}
      {sugerirGuardarPanel && potenciaNum > 0 && precioNum > 0 && (
        <SaveToCatalogBanner
          label="Guardar este panel en el catalogo?"
          onSave={onGuardarPanel}
          onDismiss={onDismissGuardarPanel}
        />
      )}

      {/* Desglose calculado */}
      {cantidadNum > 0 && potenciaNum > 0 && precioNum > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Concepto</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Subtotal</span>
          </div>

          {/* Paneles */}
          <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
            <span className="text-xs text-zinc-300">
              Panel {potenciaNum}W{panelSeleccionado ? ` ${panelSeleccionado.modelo}` : ""}
            </span>
            <span className="text-xs text-center text-zinc-400 font-mono">{cantidadNum}</span>
            <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(costoPanel)}/pza</span>
            <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoPanelesUSD)}</span>
          </div>

          {/* Flete */}
          <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
            <span className="text-xs text-zinc-300">Servicio de logistica (Flete)</span>
            <span className="text-xs text-center text-zinc-400 font-mono">1</span>
            <input
              type="number" min={0} step={0.01}
              value={fletePaneles}
              onChange={(e) => onSetFletePaneles(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 font-mono"
            />
            <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(fletePanelesNum)}</span>
          </div>

          {/* Garantia */}
          <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
            <span className="text-xs text-zinc-300">Garantia contra danos de mercancia</span>
            <span className="text-xs text-center text-zinc-400 font-mono">1</span>
            <input
              type="number" min={0} step={0.01}
              value={garantiaPaneles}
              onChange={(e) => onSetGarantiaPaneles(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 font-mono"
            />
            <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(garantiaPanelesNum)}</span>
          </div>

          {/* Total USD */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
            <span className="text-xs text-zinc-500">
              {cantidadNum} x {potenciaNum}W x ${fmtUSD3(precioNum)}/W
            </span>
            <span className="text-sm font-semibold text-amber-400 font-mono">
              ${fmtUSD(totalPanelesUSD)} USD
            </span>
          </div>

          {/* TC personalizado */}
          <TcCustomRow
            tcGlobal={tcVal}
            value={tcCustomPaneles}
            onChange={onSetTcCustomPaneles}
          />

          {/* Total MXN */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-700 bg-zinc-800/60">
            <span className="text-xs text-zinc-400 font-medium">
              Subtotal paneles
              {Number(tcCustomPaneles) > 0 && (
                <span className="ml-1.5 text-amber-400/70">(TC personalizado)</span>
              )}
            </span>
            <span className="text-xs text-zinc-300 font-mono">
              ${fmt(partidaPanelesMXN)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
            <span className="text-xs text-zinc-500">IVA 16%</span>
            <span className="text-xs text-zinc-400 font-mono">${fmt(partidaPanelesMXN * 0.16)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
            <span className="text-xs text-zinc-300 font-semibold">Total paneles</span>
            <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaPanelesMXN * 1.16)} MXN</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
