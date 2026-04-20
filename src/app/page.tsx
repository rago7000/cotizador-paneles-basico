"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import AppNav from "./components/AppNav";
import { useConvexCotizaciones } from "./lib/useConvexCatalogo";
import type { CotizacionData, CotizacionGuardada, CotizacionCliente } from "./lib/types";
import CotizadorWorkspace, { type CalcSnapshot } from "./components/CotizadorWorkspace";
import SplitDeltaSidebar from "./components/SplitDeltaSidebar";
import CompareSourcePicker from "./components/CompareSourcePicker";

type SecondaryInit =
  | { kind: "cotizacion"; nombre: string }
  | { kind: "variante"; variante: CotizacionCliente };

type PrimaryInit =
  | { kind: "cotizacion"; nombre: string }
  | { kind: "prefillProyecto"; proyectoId: Id<"proyectos"> }
  | null;

export default function Home() {
  const [splitOpen, setSplitOpen] = useState(false);
  const [primaryInit] = useState<PrimaryInit>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const load = params.get("load");
    if (load) return { kind: "cotizacion", nombre: load };
    const prefill = params.get("prefillProyecto");
    if (prefill) return { kind: "prefillProyecto", proyectoId: prefill as Id<"proyectos"> };
    return null;
  });
  const [secondaryInit, setSecondaryInit] = useState<SecondaryInit | null>(null);
  const [comparePickerOpen, setComparePickerOpen] = useState(false);
  const [primaryCalc, setPrimaryCalc] = useState<CalcSnapshot | null>(null);
  const [secondaryCalc, setSecondaryCalc] = useState<CalcSnapshot | null>(null);
  const [splitCollapseCounter, setSplitCollapseCounter] = useState(0);
  const [primaryIdentity, setPrimaryIdentity] = useState<{ cotizacionId: string; nombreCotizacion: string }>({
    cotizacionId: "",
    nombreCotizacion: "",
  });

  // Strip query params (load / prefillProyecto) once primaryInit has been captured.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    let changed = false;
    for (const k of ["load", "prefillProyecto"]) {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
    }
  }, []);

  const { cotizaciones: convexCotizaciones, cargarCotizacion: convexCargarCotizacion } = useConvexCotizaciones();

  const cotizacionesGuardadas = useMemo<CotizacionGuardada[]>(() => {
    return convexCotizaciones.map((c) => ({
      nombre: c.nombre,
      fecha: c.fecha ?? "",
      data: (convexCargarCotizacion(c.nombre) ?? {} as CotizacionData),
    }));
  }, [convexCotizaciones, convexCargarCotizacion]);

  // ── Variantes del primario (para el picker) ──
  const rawVariantesById = useQuery(
    api.cotizaciones.listCliente,
    primaryIdentity.cotizacionId ? { cotizacionBase: primaryIdentity.cotizacionId } : "skip",
  );
  const rawVariantesByName = useQuery(
    api.cotizaciones.listCliente,
    primaryIdentity.nombreCotizacion.trim()
      ? { cotizacionBase: primaryIdentity.nombreCotizacion.trim() }
      : "skip",
  );
  const primaryVariantes = useMemo<CotizacionCliente[]>(() => {
    const seen = new Set<string>();
    const result: CotizacionCliente[] = [];
    for (const raw of [rawVariantesById, rawVariantesByName]) {
      if (!raw) continue;
      for (const v of raw) {
        if (seen.has(v._id as string)) continue;
        seen.add(v._id as string);
        try {
          const parsed = JSON.parse(v.data);
          result.push({ ...parsed, id: v._id as string } as CotizacionCliente);
        } catch { /* skip */ }
      }
    }
    return result;
  }, [rawVariantesById, rawVariantesByName]);

  // ── Otras cotizaciones (excluye la que está activa en primario) ──
  const otrasCotizaciones = useMemo(() => {
    const activeName = primaryIdentity.nombreCotizacion.trim();
    if (!activeName) return cotizacionesGuardadas;
    return cotizacionesGuardadas.filter((c) => c.nombre !== activeName);
  }, [cotizacionesGuardadas, primaryIdentity.nombreCotizacion]);

  const handlePickCotizacion = (nombre: string) => {
    setSecondaryInit({ kind: "cotizacion", nombre });
    setSplitOpen(true);
    setComparePickerOpen(false);
  };

  const handlePickVariante = (variante: CotizacionCliente) => {
    setSecondaryInit({ kind: "variante", variante });
    setSplitOpen(true);
    setComparePickerOpen(false);
  };

  const handleCloseSplit = () => {
    if (typeof window !== "undefined" && !window.confirm("¿Cerrar la comparación? Los cambios sin guardar en el sandbox se perderán.")) {
      return;
    }
    setSplitOpen(false);
    setSecondaryInit(null);
    setSecondaryCalc(null);
  };

  const triggerSplitCollapseAll = () => setSplitCollapseCounter((c) => c + 1);

  return (
    <>
      {splitOpen && (
        <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <div className="mx-auto flex h-12 max-w-[1900px] items-center gap-3 px-4">
            <span className="text-lg">☀️</span>
            <span className="hidden sm:block text-sm font-semibold text-zinc-100">Cotizador Solar</span>
            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
            <AppNav />
            <div className="flex-1" />
            <span className="hidden md:inline text-[10px] uppercase tracking-wider text-violet-400 font-semibold mr-2">Modo comparación</span>
            <button
              onClick={triggerSplitCollapseAll}
              title="Ocultar todo"
              className="shrink-0 flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
              <span className="hidden sm:inline">Ocultar</span>
            </button>
            <button
              onClick={handleCloseSplit}
              className="shrink-0 flex items-center gap-1 rounded-md border border-violet-400/30 bg-violet-400/5 px-3 py-1 text-[11px] font-medium text-violet-300 hover:bg-violet-400/10"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              Cerrar comparación
            </button>
          </div>
        </header>
      )}

      <div className={splitOpen ? "min-h-screen bg-zinc-950 text-zinc-100 font-sans" : ""}>
        <main className={splitOpen ? "mx-auto max-w-[1900px] px-3 py-3" : ""}>
          <div className={splitOpen ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px_minmax(0,1fr)] gap-3" : ""}>
            <CotizadorWorkspace
              mode={splitOpen ? "primary" : "single"}
              enableAutosave
              compactSidebar={splitOpen}
              externalCollapseCounter={splitOpen ? splitCollapseCounter : undefined}
              initialLoad={primaryInit}
              onCalcChange={splitOpen ? setPrimaryCalc : undefined}
              onRequestCompare={!splitOpen ? () => setComparePickerOpen(true) : undefined}
              onIdentityChange={setPrimaryIdentity}
            />

            {splitOpen && (
              <SplitDeltaSidebar
                primary={primaryCalc}
                secondary={secondaryCalc}
                onClose={handleCloseSplit}
              />
            )}

            {splitOpen && (
              <CotizadorWorkspace
                mode="secondary"
                enableAutosave={false}
                compactSidebar
                externalCollapseCounter={splitCollapseCounter}
                initialLoad={secondaryInit}
                onCalcChange={setSecondaryCalc}
                onClose={handleCloseSplit}
              />
            )}
          </div>
        </main>
      </div>

      <CompareSourcePicker
        open={comparePickerOpen}
        cotizaciones={otrasCotizaciones}
        variantes={primaryVariantes}
        primaryName={primaryIdentity.nombreCotizacion}
        onClose={() => setComparePickerOpen(false)}
        onPickCotizacion={handlePickCotizacion}
        onPickVariante={handlePickVariante}
      />
    </>
  );
}
