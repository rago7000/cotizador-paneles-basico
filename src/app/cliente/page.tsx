"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useConvexCatalogo, useConvexCotizaciones } from "../lib/useConvexCatalogo";
import type { CatalogoPanel, CatalogoMicro, TipoCambioData } from "../lib/types";
import { useClienteFlow, type ClienteStep } from "./useClienteFlow";
import StepConsumo from "./StepConsumo";
import StepSistema from "./StepSistema";
import StepInversion from "./StepInversion";
import StepPropuesta from "./StepPropuesta";
import { useState } from "react";

// ── Helper: best offer per product ──────────────────────────────────────────
function mejorOferta(productoId: string, ofertas: { productoId: string; precio: number; precioCable?: number; notas?: string; fecha: string }[]) {
  const matching = ofertas.filter((o) => o.productoId === productoId);
  if (matching.length === 0) return null;
  return matching.reduce((best, o) => (o.precio < best.precio ? o : best));
}

// ── Step labels ──────────────────────────────────────────────────────────────
const STEPS: { key: ClienteStep; label: string; icon: string }[] = [
  { key: 1, label: "Consumo", icon: "⚡" },
  { key: 2, label: "Sistema", icon: "☀️" },
  { key: 3, label: "Inversión", icon: "💰" },
  { key: 4, label: "Propuesta", icon: "📋" },
];

export default function ClientePage() {
  // ── Convex data ──
  const { paneles: convexPaneles, micros: convexMicros, ofertas: convexOfertas } = useConvexCatalogo();

  // ── Build catalogs (same logic as page.tsx) ──
  const catalogoPaneles = useMemo<CatalogoPanel[]>(() => {
    return convexPaneles
      .map((p) => {
        const best = mejorOferta(p.id, convexOfertas);
        if (!best) return null;
        return {
          id: `v2_${p.id}`, marca: p.marca, modelo: p.modelo, potencia: p.potencia,
          precioPorWatt: best.precio, notas: best.notas || "", fechaActualizacion: best.fecha,
        } as CatalogoPanel;
      })
      .filter((x): x is CatalogoPanel => x !== null);
  }, [convexPaneles, convexOfertas]);

  const catalogoMicros = useMemo<CatalogoMicro[]>(() => {
    return convexMicros
      .map((m) => {
        const best = mejorOferta(m.id, convexOfertas);
        if (!best) return null;
        return {
          id: `v2_${m.id}`, marca: m.marca, modelo: m.modelo,
          precio: best.precio, precioCable: best.precioCable || 0,
          panelesPorUnidad: m.panelesPorUnidad, notas: best.notas || "", fechaActualizacion: best.fecha,
        } as CatalogoMicro;
      })
      .filter((x): x is CatalogoMicro => x !== null);
  }, [convexMicros, convexOfertas]);

  // ── Auto-select panel (default or cheapest) ──
  const panelSeleccionado = useMemo<CatalogoPanel | null>(() => {
    const dp = convexPaneles.find((p) => p.esDefault);
    if (dp) {
      const cp = catalogoPaneles.find((c) => c.id === `v2_${dp._id}`);
      if (cp) return cp;
    }
    if (catalogoPaneles.length === 0) return null;
    return [...catalogoPaneles].sort((a, b) => a.precioPorWatt - b.precioPorWatt)[0];
  }, [convexPaneles, catalogoPaneles]);

  // ── Auto-select micro (DS3D preferred) ──
  const microSeleccionado = useMemo<CatalogoMicro | null>(() => {
    const ds3d = catalogoMicros.find((m) => /ds3d|ds3-d/i.test(m.modelo));
    if (ds3d) return ds3d;
    return catalogoMicros[0] ?? null;
  }, [catalogoMicros]);

  // ── Exchange rate ──
  const [tc, setTc] = useState<TipoCambioData | null>(null);
  useEffect(() => {
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setTc(d); })
      .catch(() => {});
  }, []);

  // ── Client flow hook ──
  const { state, dispatch, computed, cantidadPaneles, panelW } = useClienteFlow({
    panelSeleccionado, microSeleccionado, tc,
  });

  // ── Auto-set sizing when recibo loads ──
  const initialSizingApplied = useRef(false);
  useEffect(() => {
    if (computed.sizing && !initialSizingApplied.current && state.cantidadPaneles === 0) {
      dispatch({ type: "SELECT_SIZING", option: "recomendada", paneles: computed.sizing.panelesEquilibrado });
      initialSizingApplied.current = true;
    }
  }, [computed.sizing, state.cantidadPaneles, dispatch]);

  // Reset initial sizing flag when recibo changes
  useEffect(() => {
    if (!state.reciboCFE) initialSizingApplied.current = false;
  }, [state.reciboCFE]);

  // ── Can advance to next step? ──
  const canAdvance = (() => {
    switch (state.step) {
      case 1: return !!state.reciboCFE;
      case 2: return cantidadPaneles > 0;
      case 3: return !!computed.precioCliente;
      case 4: return false;
      default: return false;
    }
  })();

  // ── Navigation ──
  const goNext = () => { if (canAdvance) dispatch({ type: "NEXT_STEP" }); };
  const goPrev = () => dispatch({ type: "PREV_STEP" });
  const goToStep = (step: ClienteStep) => {
    // Only allow going to completed steps or current + 1
    if (step <= state.step || (step === state.step + 1 && canAdvance)) {
      dispatch({ type: "GO_TO_STEP", step });
    }
  };

  // ── Catalog not ready ──
  if (convexPaneles.length > 0 && catalogoPaneles.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-4xl">☀️</div>
          <h1 className="text-xl font-bold text-zinc-100">Configuración necesaria</h1>
          <p className="text-sm text-zinc-400 max-w-sm">
            No hay productos con precios en el catálogo. Configura tu catálogo de paneles y microinversores primero.
          </p>
          <Link href="/catalogo" className="inline-block mt-4 text-sm text-amber-400 hover:text-amber-300 transition-colors">
            Ir al catálogo →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors">
            <span className="text-lg">☀️</span>
            <span className="text-sm font-medium hidden sm:inline">Cotizador Solar</span>
          </Link>
          {state.reciboCFE && state.step > 1 && (
            <div className="text-xs text-zinc-500 truncate max-w-40">
              {state.nombreCliente}
            </div>
          )}
          {state.reciboCFE && (
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Nueva cotización
            </button>
          )}
        </div>
      </header>

      {/* ── Step Indicator ── */}
      <div className="border-b border-zinc-800/30">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isActive = state.step === s.key;
              const isCompleted = state.step > s.key;
              const isClickable = s.key <= state.step || (s.key === state.step + 1 && canAdvance);
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <button
                    onClick={() => isClickable && goToStep(s.key)}
                    className={`flex flex-col items-center gap-1.5 transition-all ${
                      isClickable ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                      isActive
                        ? "bg-amber-500 text-zinc-900 font-bold ring-4 ring-amber-500/20"
                        : isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-600 border border-zinc-700"
                    }`}>
                      {isCompleted ? "✓" : s.icon}
                    </div>
                    <span className={`text-[11px] font-medium ${
                      isActive ? "text-amber-400" : isCompleted ? "text-emerald-400/70" : "text-zinc-600"
                    }`}>
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 mt-[-18px] ${
                      isCompleted ? "bg-emerald-500/30" : "bg-zinc-800"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Step Content ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {state.step === 1 && (
          <StepConsumo
            reciboCFE={state.reciboCFE}
            loadingRecibo={state.loadingRecibo}
            errorRecibo={state.errorRecibo}
            sizing={computed.sizing}
            onUpload={(data, base64) => dispatch({ type: "SET_RECIBO", data, base64 })}
            onLoading={(v) => dispatch({ type: "SET_LOADING", loading: v })}
            onError={(msg) => dispatch({ type: "SET_ERROR", error: msg })}
          />
        )}

        {state.step === 2 && state.reciboCFE && computed.sizing && (
          <StepSistema
            reciboCFE={state.reciboCFE}
            sizing={computed.sizing}
            sizingOption={state.sizingOption}
            cantidadPaneles={cantidadPaneles}
            panelW={panelW}
            kWpSistema={computed.kWpSistema}
            generacionMensualKwh={computed.generacionMensualKwh}
            coberturaPct={computed.coberturaPct}
            onSelectSizing={(opt, p) => dispatch({ type: "SELECT_SIZING", option: opt, paneles: p })}
          />
        )}

        {state.step === 3 && computed.precioCliente && (
          <StepInversion
            precioCliente={computed.precioCliente}
            roi={computed.roi}
            cantidadPaneles={cantidadPaneles}
          />
        )}

        {state.step === 4 && state.reciboCFE && computed.precioCliente && (
          <StepPropuesta
            nombreCliente={state.nombreCliente}
            cantidadPaneles={cantidadPaneles}
            panelW={panelW}
            kWpSistema={computed.kWpSistema}
            generacionMensualKwh={computed.generacionMensualKwh}
            precioCliente={computed.precioCliente}
            roi={computed.roi}
            reciboCFE={state.reciboCFE}
            coberturaPct={computed.coberturaPct}
          />
        )}
      </main>

      {/* ── Bottom Navigation ── */}
      {state.reciboCFE && (
        <div className="sticky bottom-0 border-t border-zinc-800/50 bg-zinc-950/90 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            {state.step > 1 ? (
              <button
                onClick={goPrev}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Anterior
              </button>
            ) : <div />}

            {state.step < 4 ? (
              <button
                onClick={goNext}
                disabled={!canAdvance}
                className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-colors"
              >
                Siguiente
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : <div />}
          </div>
        </div>
      )}
    </div>
  );
}
