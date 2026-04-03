"use client";

import { useRef } from "react";
import { fmt } from "../components/primitives";
import type { ReciboCFEData } from "../lib/cotizacion-state";
import type { SizingResult } from "../lib/calc-costos";

interface Props {
  reciboCFE: ReciboCFEData | null;
  loadingRecibo: boolean;
  errorRecibo: string;
  sizing: SizingResult | null;
  onUpload: (data: ReciboCFEData, base64: string | null) => void;
  onLoading: (v: boolean) => void;
  onError: (msg: string) => void;
}

export default function StepConsumo({ reciboCFE, loadingRecibo, errorRecibo, sizing, onUpload, onLoading, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onLoading(true);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await fetch("/api/leer-recibo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const reader = new FileReader();
      reader.onload = () => onUpload(data, reader.result as string);
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Error al procesar el recibo");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const costoMensual = reciboCFE
    ? reciboCFE.totalFacturado / Math.max(reciboCFE.diasPeriodo / 30, 1)
    : 0;

  if (!reciboCFE) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFile} />

        <div className="text-5xl mb-6">&#x26A1;</div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2 text-center">Analicemos tu consumo de luz</h2>
        <p className="text-sm text-zinc-500 mb-8 text-center max-w-md">
          Sube tu recibo de CFE y en segundos te mostramos cuánto consumes, cuánto pagas, y cuánto puedes ahorrar con energía solar.
        </p>

        {errorRecibo && (
          <p className="text-sm text-red-400 mb-4">{errorRecibo}</p>
        )}

        <button
          onClick={() => inputRef.current?.click()}
          disabled={loadingRecibo}
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 px-8 py-6 text-amber-300 transition-all disabled:opacity-50"
        >
          {loadingRecibo ? (
            <>
              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-base font-medium">Analizando tu recibo...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-base font-medium">Subir recibo de CFE</span>
            </>
          )}
        </button>
        <p className="text-xs text-zinc-600 mt-3">PDF o foto del recibo</p>
      </div>
    );
  }

  // ── Recibo loaded: show consumption analysis ──
  return (
    <div className="space-y-6">
      {/* Client info */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100 mb-1">{reciboCFE.nombre}</h2>
        <p className="text-sm text-zinc-500">
          No. servicio: {reciboCFE.noServicio} · Tarifa {reciboCFE.tarifa}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-5 text-center">
          <div className="text-3xl font-bold text-zinc-100">{sizing?.consumoMensualCalc ?? Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1))}</div>
          <div className="text-sm text-zinc-400 mt-1">kWh / mes</div>
          <div className="text-xs text-zinc-600 mt-1">Consumo promedio</div>
        </div>
        <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-5 text-center">
          <div className="text-3xl font-bold text-amber-400">${fmt(costoMensual)}</div>
          <div className="text-sm text-zinc-400 mt-1">MXN / mes</div>
          <div className="text-xs text-zinc-600 mt-1">Gasto estimado</div>
        </div>
      </div>

      {/* Bimester history bars */}
      {sizing && sizing.todosBimestres.length > 1 && (
        <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-5">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">Historial de consumo</h3>
          <div className="flex items-end gap-2 h-32">
            {[reciboCFE.consumoKwh, ...sizing.historicoFiltrado.map((h) => h.kwh)].reverse().map((kwh, i, arr) => {
              const max = Math.max(...arr);
              const pct = max > 0 ? (kwh / max) * 100 : 0;
              const isLast = i === arr.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-500">{kwh}</span>
                  <div
                    className={`w-full rounded-t transition-all ${isLast ? "bg-amber-500" : "bg-zinc-600"}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-zinc-600">Anterior</span>
            <span className="text-[10px] text-amber-400/60">Actual</span>
          </div>
        </div>
      )}

      {/* Period info */}
      <p className="text-xs text-zinc-600 text-center">
        Periodo actual: {reciboCFE.periodoInicio} — {reciboCFE.periodoFin} · {reciboCFE.diasPeriodo} días · {reciboCFE.consumoKwh} kWh
      </p>

      {/* Change recibo */}
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFile} />
      <div className="flex justify-center">
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cambiar recibo
        </button>
      </div>
    </div>
  );
}
