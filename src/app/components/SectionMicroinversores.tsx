"use client";

import type { CatalogoMicro } from "../lib/types";
import type { ElectricalResult, EquipmentProfile } from "../lib/electrical/types";
import { SectionCard, Field, NumInput, Toggle, TcCustomRow, SaveToCatalogBanner, fmt } from "./primitives";

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface SectionMicroinversoresProps {
  // Catalog
  catalogoMicros: CatalogoMicro[];
  microSeleccionado: CatalogoMicro | null;
  onOpenPicker: () => void;
  onClearSeleccion: () => void;

  // Field values
  precioMicroinversor: string;
  precioCable: string;
  precioECU: string;
  incluyeECU: boolean;
  precioHerramienta: string;
  incluyeHerramienta: boolean;
  precioEndCap: string;
  incluyeEndCap: boolean;
  fleteMicros: string;
  tcCustomMicros: string;

  // Setters
  onSetPrecioMicroinversor: (v: string) => void;
  onSetPrecioCable: (v: string) => void;
  onSetPrecioECU: (v: string) => void;
  onSetIncluyeECU: (v: boolean) => void;
  onSetPrecioHerramienta: (v: string) => void;
  onSetIncluyeHerramienta: (v: boolean) => void;
  onSetPrecioEndCap: (v: string) => void;
  onSetIncluyeEndCap: (v: boolean) => void;
  onSetFleteMicros: (v: string) => void;
  onSetTcCustomMicros: (v: string) => void;

  // Save-to-catalog
  sugerirGuardarMicro: boolean;
  onGuardarMicro: (marca: string, modelo: string) => void;
  onDismissGuardarMicro: () => void;

  // Computed values
  tcVal: number;
  partidaInversoresMXN: number;
  cantidadNum: number;
  cantidadMicros: number;
  panelesPorMicro: number;
  precioMicroNum: number;
  precioCableNum: number;
  precioECUNum: number;
  precioHerramientaNum: number;
  precioEndCapNum: number;
  fleteMicrosNum: number;
  costoMicrosUSD: number;
  costoCablesUSD: number;
  costoECUUSD: number;
  costoHerramientaUSD: number;
  costoEndCapUSD: number;
  totalInversoresUSD: number;

  // Electrical calculator
  showElectrical: boolean;
  onSetShowElectrical: (v: boolean) => void;
  electricalProfileId: string;
  onSetElectricalProfileId: (v: string) => void;
  electricalProfiles: EquipmentProfile[];
  electricalResult: ElectricalResult | null;
}

export default function SectionMicroinversores({
  catalogoMicros,
  microSeleccionado,
  onOpenPicker,
  onClearSeleccion,
  precioMicroinversor,
  precioCable,
  precioECU,
  incluyeECU,
  precioHerramienta,
  incluyeHerramienta,
  precioEndCap,
  incluyeEndCap,
  fleteMicros,
  tcCustomMicros,
  onSetPrecioMicroinversor,
  onSetPrecioCable,
  onSetPrecioECU,
  onSetIncluyeECU,
  onSetPrecioHerramienta,
  onSetIncluyeHerramienta,
  onSetPrecioEndCap,
  onSetIncluyeEndCap,
  onSetFleteMicros,
  onSetTcCustomMicros,
  sugerirGuardarMicro,
  onGuardarMicro,
  onDismissGuardarMicro,
  tcVal,
  partidaInversoresMXN,
  cantidadNum,
  cantidadMicros,
  panelesPorMicro,
  precioMicroNum,
  precioCableNum,
  precioECUNum,
  precioHerramientaNum,
  precioEndCapNum,
  fleteMicrosNum,
  costoMicrosUSD,
  costoCablesUSD,
  costoECUUSD,
  costoHerramientaUSD,
  costoEndCapUSD,
  totalInversoresUSD,
  showElectrical,
  onSetShowElectrical,
  electricalProfileId,
  onSetElectricalProfileId,
  electricalProfiles,
  electricalResult,
}: SectionMicroinversoresProps) {
  return (
    <SectionCard
      num="2"
      title="Microinversores"
      badge={cantidadMicros > 0 ? `${cantidadMicros} uds · ${panelesPorMicro} pan/micro` : "USD sin IVA"}
    >
      {/* Catalog picker trigger */}
      <div className="flex items-center justify-between -mt-1 mb-1">
        <span className="text-xs text-zinc-600">
          {catalogoMicros.length > 0 ? `${catalogoMicros.length} modelo${catalogoMicros.length !== 1 ? "s" : ""} en catalogo` : "Catalogo vacio"}
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

      {/* Chip item seleccionado */}
      {microSeleccionado && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-400/8 border border-amber-400/25 px-3 py-2">
          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-medium text-amber-300 flex-1">
            {microSeleccionado.marca} — {microSeleccionado.modelo}
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            ${fmtUSD(microSeleccionado.precio)} USD
            {microSeleccionado.precioCable > 0 && ` · cable $${fmtUSD(microSeleccionado.precioCable)}`}
          </span>
          <button onClick={onClearSeleccion} className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Precio por microinversor (USD)" hint={microSeleccionado ? `1 micro por cada ${panelesPorMicro} paneles (${microSeleccionado.modelo})` : `1 micro por cada ${panelesPorMicro} paneles (default DS3D)`}>
          <NumInput value={precioMicroinversor} onChange={onSetPrecioMicroinversor} placeholder="Ej: 180.00" step={0.01} />
        </Field>
        <Field label="Cable troncal APS por unidad (USD)" hint="1 cable por microinversor">
          <NumInput value={precioCable} onChange={onSetPrecioCable} placeholder="Ej: 25.00" step={0.01} />
        </Field>
      </div>

      {/* Desglose calculado */}
      {cantidadNum > 0 && precioMicroNum > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          {/* header */}
          <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Concepto</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Subtotal</span>
          </div>

          {/* Microinversores */}
          <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
            <span className="text-xs text-zinc-300">Microinversor{microSeleccionado ? ` ${microSeleccionado.modelo}` : ""}</span>
            <span className="text-xs text-center text-zinc-400 font-mono">{cantidadMicros}</span>
            <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioMicroNum)}</span>
            <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoMicrosUSD)}</span>
          </div>

          {/* Cables */}
          {precioCableNum > 0 && (
            <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
              <span className="text-xs text-zinc-300">Cable troncal</span>
              <span className="text-xs text-center text-zinc-400 font-mono">{cantidadMicros}</span>
              <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioCableNum)}</span>
              <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoCablesUSD)}</span>
            </div>
          )}

          {/* ECU */}
          {incluyeECU && precioECUNum > 0 && (
            <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
              <span className="text-xs text-zinc-300">ECU-R Monitoreo</span>
              <span className="text-xs text-center text-zinc-400 font-mono">1</span>
              <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioECUNum)}</span>
              <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoECUUSD)}</span>
            </div>
          )}

          {/* Herramienta */}
          {incluyeHerramienta && precioHerramientaNum > 0 && (
            <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
              <span className="text-xs text-zinc-300">Herramienta desconectora</span>
              <span className="text-xs text-center text-zinc-400 font-mono">1</span>
              <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioHerramientaNum)}</span>
              <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoHerramientaUSD)}</span>
            </div>
          )}

          {/* End Cap */}
          {incluyeEndCap && precioEndCapNum > 0 && (
            <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
              <span className="text-xs text-zinc-300">End Cap APS</span>
              <span className="text-xs text-center text-zinc-400 font-mono">{cantidadMicros}</span>
              <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioEndCapNum)}</span>
              <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoEndCapUSD)}</span>
            </div>
          )}

          {/* Flete */}
          <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
            <span className="text-xs text-zinc-300">Flete microinversores</span>
            <span className="text-xs text-center text-zinc-400 font-mono">1</span>
            <input
              type="number" min={0} step={0.01}
              value={fleteMicros}
              onChange={(e) => onSetFleteMicros(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 font-mono"
            />
            <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(fleteMicrosNum)}</span>
          </div>

          {/* Total USD */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
            <span className="text-xs text-zinc-500">
              {cantidadNum} paneles / {panelesPorMicro} = {cantidadMicros} micros
            </span>
            <span className="text-sm font-semibold text-amber-400 font-mono">
              ${fmtUSD(totalInversoresUSD)} USD
            </span>
          </div>

          {/* TC personalizado */}
          <TcCustomRow
            tcGlobal={tcVal}
            value={tcCustomMicros}
            onChange={onSetTcCustomMicros}
          />

          {/* Total MXN */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-700 bg-zinc-800/60">
            <span className="text-xs text-zinc-400 font-medium">
              Subtotal inversores
              {Number(tcCustomMicros) > 0 && (
                <span className="ml-1.5 text-amber-400/70">(TC personalizado)</span>
              )}
            </span>
            <span className="text-xs text-zinc-300 font-mono">
              ${fmt(partidaInversoresMXN)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
            <span className="text-xs text-zinc-500">IVA 16%</span>
            <span className="text-xs text-zinc-400 font-mono">${fmt(partidaInversoresMXN * 0.16)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
            <span className="text-xs text-zinc-300 font-semibold">Total inversores</span>
            <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaInversoresMXN * 1.16)} MXN</span>
          </div>
        </div>
      )}

      {/* Save to catalog suggestion */}
      {sugerirGuardarMicro && precioMicroNum > 0 && (
        <SaveToCatalogBanner
          label="Guardar este microinversor en el catalogo?"
          onSave={onGuardarMicro}
          onDismiss={onDismissGuardarMicro}
        />
      )}

      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <Toggle
          checked={incluyeECU}
          onChange={onSetIncluyeECU}
          label="ECU-R — Sistema de monitoreo"
        />
        {incluyeECU && (
          <div className="pl-12">
            <Field label="Precio ECU-R (USD)">
              <NumInput value={precioECU} onChange={onSetPrecioECU} placeholder="Ej: 145.00" step={0.01} />
            </Field>
          </div>
        )}

        <Toggle
          checked={incluyeHerramienta}
          onChange={onSetIncluyeHerramienta}
          label="Herramienta desconectora APS"
          hint="Opcional — no se requiere en cada instalacion"
        />
        {incluyeHerramienta && (
          <div className="pl-12">
            <Field label="Precio herramienta (USD)">
              <NumInput value={precioHerramienta} onChange={onSetPrecioHerramienta} placeholder="Ej: 35.00" step={0.01} />
            </Field>
          </div>
        )}

        <Toggle
          checked={incluyeEndCap}
          onChange={onSetIncluyeEndCap}
          label="End Cap APS"
          hint="1 por microinversor — sella la entrada no utilizada del cable troncal"
        />
        {incluyeEndCap && (
          <div className="pl-12">
            <Field label="Precio end cap (USD)" hint="1 por microinversor">
              <NumInput value={precioEndCap} onChange={onSetPrecioEndCap} placeholder="Ej: 5.00" step={0.01} />
            </Field>
          </div>
        )}
      </div>

      {/* Calculadora electrica */}
      <div className="mt-4 border-t border-zinc-800 pt-4">
        <button
          onClick={() => onSetShowElectrical(!showElectrical)}
          className="flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${showElectrical ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          Calculo electrico (breakers y cable)
        </button>

        {showElectrical && (
          <div className="mt-3 rounded-xl border border-cyan-400/20 bg-zinc-800/50 p-4 space-y-3">
            {/* Profile selector */}
            <div className="flex items-center gap-3">
              <label className="text-[11px] text-zinc-500">Perfil equipo:</label>
              <select
                value={electricalProfileId}
                onChange={(e) => onSetElectricalProfileId(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-cyan-400"
              >
                {electricalProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>
                ))}
              </select>
            </div>

            {electricalResult && cantidadMicros > 0 && (
              <div className="space-y-3">
                {/* Circuit breakdown */}
                <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/80 p-3 space-y-2">
                  <h4 className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wide">
                    Circuitos — {electricalResult.totalCircuitos} circuito{electricalResult.totalCircuitos !== 1 ? "s" : ""}
                  </h4>
                  <div className="space-y-1.5">
                    {electricalResult.circuitos.map((c) => (
                      <div key={c.circuitoNumero} className="flex items-center gap-3 text-[11px]">
                        <span className="text-zinc-600 w-16">Circuito {c.circuitoNumero}</span>
                        <span className="text-zinc-400">{c.unidadesEnCircuito} micro{c.unidadesEnCircuito !== 1 ? "s" : ""}</span>
                        <span className="text-zinc-500">{"->"}</span>
                        <span className="text-zinc-200 font-mono">{c.amperajeConTolerancia.toFixed(1)}A</span>
                        <span className="text-zinc-500">{"->"}</span>
                        <span className="text-amber-400 font-medium">Pastilla {c.breakerSeleccionado}A</span>
                        <span className="text-zinc-500">·</span>
                        <span className="text-zinc-300">{c.tipoCable}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-zinc-500">Amperaje total AC</span><span className="text-zinc-200 font-mono">{electricalResult.amperajeTotalAC.toFixed(1)} A</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Con tolerancia (x1.25)</span><span className="text-zinc-200 font-mono">{electricalResult.amperajeTotalConTolerancia.toFixed(1)} A</span></div>
                  {electricalResult.breakerResumen.map((b) => (
                    <div key={b.amperaje} className="flex justify-between">
                      <span className="text-zinc-500">Pastilla {b.amperaje}A</span>
                      <span className="text-amber-400 font-mono">{b.cantidad} pza{b.cantidad !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                  {electricalResult.cableACResumen.map((c) => (
                    <div key={c.tipo} className="flex justify-between">
                      <span className="text-zinc-500">{c.tipo}</span>
                      <span className="text-zinc-200 font-mono">{c.circuitos} circuito{c.circuitos !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                  {electricalResult.tierraFisica && (
                    <div className="flex justify-between"><span className="text-zinc-500">Tierra fisica</span><span className="text-zinc-200 font-mono">{electricalResult.tierraFisica.calibreAWG} AWG</span></div>
                  )}
                  {electricalResult.desconectorDC && (
                    <div className="flex justify-between"><span className="text-zinc-500">Desconector DC</span><span className="text-zinc-200 font-mono">{electricalResult.desconectorDC.amperaje}A</span></div>
                  )}
                </div>

                {/* Warnings */}
                {electricalResult.warnings.length > 0 && (
                  <div className="space-y-1">
                    {electricalResult.warnings.map((w, i) => (
                      <p key={i} className="text-[10px] text-amber-400/80">{w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {cantidadMicros === 0 && (
              <p className="text-[11px] text-zinc-600">Define cantidad de paneles arriba para ver el calculo electrico.</p>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
