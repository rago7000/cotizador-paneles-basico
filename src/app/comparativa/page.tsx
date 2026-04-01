"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AppNav from "../components/AppNav";
import { useConvexCotizaciones } from "../lib/useConvexCatalogo";
import type {
  CotizacionData,
  CotizacionGuardada,
  SeguimientoItem,
  SeguimientoData,
} from "../lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Seccion = "PANELES" | "INVERSORES" | "ESTRUCTURA" | "TORNILLERIA" | "GENERALES";

interface ConceptoCotizado {
  key: string;
  seccion: Seccion;
  concepto: string;
  detalle: string;
  totalMXN: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function derivarConceptos(data: CotizacionData, baseTc: number): ConceptoCotizado[] {
  const result: ConceptoCotizado[] = [];

  const tcPaneles = Number(data.tcCustomPaneles) > 0 ? Number(data.tcCustomPaneles) : baseTc;
  const tcMicros = Number(data.tcCustomMicros) > 0 ? Number(data.tcCustomMicros) : baseTc;

  const cantidadNum = Number(data.cantidad) || 0;
  const potenciaNum = Number(data.potencia) || 0;
  const precioNum = Number(data.precioPorWatt) || 0;
  const fletePanelesNum = Number(data.fletePaneles) || 0;
  const garantiaPanelesNum = Number(data.garantiaPaneles) || 0;

  // PANELES
  if (cantidadNum > 0 && potenciaNum > 0) {
    result.push({
      key: "pan-main",
      seccion: "PANELES",
      concepto: `${cantidadNum} paneles × ${potenciaNum}W`,
      detalle: `$${precioNum}/W × TC ${tcPaneles.toFixed(2)}`,
      totalMXN: cantidadNum * potenciaNum * precioNum * tcPaneles,
    });
  }
  if (fletePanelesNum > 0) {
    result.push({
      key: "pan-flete",
      seccion: "PANELES",
      concepto: "Flete paneles",
      detalle: `USD ${fletePanelesNum} × TC ${tcPaneles.toFixed(2)}`,
      totalMXN: fletePanelesNum * tcPaneles,
    });
  }
  if (garantiaPanelesNum > 0) {
    result.push({
      key: "pan-garantia",
      seccion: "PANELES",
      concepto: "Garantía contra daños",
      detalle: `USD ${garantiaPanelesNum} × TC ${tcPaneles.toFixed(2)}`,
      totalMXN: garantiaPanelesNum * tcPaneles,
    });
  }

  // INVERSORES
  const precioMicroNum = Number(data.precioMicroinversor) || 0;
  const precioCableNum = Number(data.precioCable) || 0;
  const precioECUNum = Number(data.precioECU) || 0;
  const precioHerramientaNum = Number(data.precioHerramienta) || 0;
  const fleteMicrosNum = Number(data.fleteMicros) || 0;
  const cantidadMicros = cantidadNum > 0 ? Math.ceil(cantidadNum / 4) : 0;

  if (cantidadMicros > 0 && precioMicroNum > 0) {
    result.push({
      key: "inv-micros",
      seccion: "INVERSORES",
      concepto: `${cantidadMicros} microinversores`,
      detalle: `$${precioMicroNum}/ud × TC ${tcMicros.toFixed(2)}`,
      totalMXN: cantidadMicros * precioMicroNum * tcMicros,
    });
  }
  if (precioCableNum > 0 && cantidadMicros > 0) {
    result.push({
      key: "inv-cables",
      seccion: "INVERSORES",
      concepto: `${cantidadMicros} cables troncales`,
      detalle: `$${precioCableNum}/ud × TC ${tcMicros.toFixed(2)}`,
      totalMXN: cantidadMicros * precioCableNum * tcMicros,
    });
  }
  if (data.incluyeECU && precioECUNum > 0) {
    result.push({
      key: "inv-ecu",
      seccion: "INVERSORES",
      concepto: "ECU-R Monitoreo",
      detalle: `$${precioECUNum} × TC ${tcMicros.toFixed(2)}`,
      totalMXN: precioECUNum * tcMicros,
    });
  }
  if (data.incluyeHerramienta && precioHerramientaNum > 0) {
    result.push({
      key: "inv-herramienta",
      seccion: "INVERSORES",
      concepto: "Herramienta desconectora",
      detalle: `$${precioHerramientaNum} × TC ${tcMicros.toFixed(2)}`,
      totalMXN: precioHerramientaNum * tcMicros,
    });
  }
  if (fleteMicrosNum > 0) {
    result.push({
      key: "inv-flete",
      seccion: "INVERSORES",
      concepto: "Flete microinversores",
      detalle: `USD ${fleteMicrosNum} × TC ${tcMicros.toFixed(2)}`,
      totalMXN: fleteMicrosNum * tcMicros,
    });
  }

  // ESTRUCTURA
  const fleteAluminioNum = Number(data.fleteAluminio) || 0;
  (data.aluminio || []).forEach((item, i) => {
    const qty = Number(item.cantidad) || 0;
    const precio = Number(item.precioUnitario) || 0;
    if (qty > 0 && precio > 0) {
      result.push({
        key: `est-${i}`,
        seccion: "ESTRUCTURA",
        concepto: item.nombre,
        detalle: `${qty} ${item.unidad} × $${precio}`,
        totalMXN: qty * precio,
      });
    }
  });
  if (fleteAluminioNum > 0) {
    result.push({
      key: "est-flete",
      seccion: "ESTRUCTURA",
      concepto: "Flete estructura",
      detalle: `$${(fleteAluminioNum / 1.16).toFixed(2)} sin IVA`,
      totalMXN: fleteAluminioNum / 1.16,
    });
  }

  // TORNILLERIA
  (data.tornilleria || []).forEach((item, i) => {
    const qty = Number(item.cantidad) || 0;
    const precio = Number(item.precioUnitario) || 0;
    if (qty > 0 && precio > 0) {
      result.push({
        key: `tor-${i}`,
        seccion: "TORNILLERIA",
        concepto: item.nombre,
        detalle: `${qty} ${item.unidad} × $${precio}`,
        totalMXN: qty * precio,
      });
    }
  });

  // GENERALES
  (data.generales || []).forEach((item, i) => {
    const qty = Number(item.cantidad) || 0;
    const precio = Number(item.precioUnitario) || 0;
    if (qty > 0 && precio > 0) {
      result.push({
        key: `gen-${i}`,
        seccion: "GENERALES",
        concepto: item.nombre,
        detalle: `${qty} ${item.unidad} × $${precio}`,
        totalMXN: qty * precio,
      });
    }
  });

  return result;
}

const SECTION_LABELS: Record<Seccion, string> = {
  PANELES: "Paneles Solares",
  INVERSORES: "Microinversores",
  ESTRUCTURA: "Estructura Aluminio",
  TORNILLERIA: "Tornillería",
  GENERALES: "Generales e Instalación",
};

const SECTION_NUMS: Record<Seccion, string> = {
  PANELES: "1",
  INVERSORES: "2",
  ESTRUCTURA: "3",
  TORNILLERIA: "4",
  GENERALES: "5",
};

const SECTIONS: Seccion[] = ["PANELES", "INVERSORES", "ESTRUCTURA", "TORNILLERIA", "GENERALES"];

const selectCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60 focus:border-amber-400/60 transition-colors";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComparativaPage() {
  // ── Convex hooks ──────────────────────────────────────────────────────────
  const {
    cotizaciones: convexCotizaciones,
    guardarSeguimiento: convexGuardarSeguimiento,
  } = useConvexCotizaciones();

  // Derive cotizaciones list from Convex (reactive)
  const cotizaciones = useMemo<CotizacionGuardada[]>(() => {
    return convexCotizaciones.map((c: { nombre: string; fecha?: string; data: string }) => {
      try {
        return { nombre: c.nombre, fecha: c.fecha ?? "", data: JSON.parse(c.data) };
      } catch {
        return { nombre: c.nombre, fecha: c.fecha ?? "", data: {} as CotizacionData };
      }
    });
  }, [convexCotizaciones]);

  const [selectedNombre, setSelectedNombre] = useState<string>("");
  const [selectedData, setSelectedData] = useState<CotizacionData | null>(null);
  const [liveTc, setLiveTc] = useState<number>(0);
  const [loadingTc, setLoadingTc] = useState(false);
  const [items, setItems] = useState<SeguimientoItem[]>([]);
  const [msgGuardado, setMsgGuardado] = useState(false);

  // Load seguimiento from Convex (reactive query)
  const rawSeguimiento = useQuery(
    api.cotizaciones.getSeguimiento,
    selectedNombre ? { cotizacionNombre: selectedNombre } : "skip"
  );

  // When selection changes, load data + seguimiento
  useEffect(() => {
    if (!selectedNombre) {
      setSelectedData(null);
      setLiveTc(0);
      setItems([]);
      return;
    }
    const found = cotizaciones.find((c) => c.nombre === selectedNombre);
    if (!found) return;
    setSelectedData(found.data);
  }, [selectedNombre, cotizaciones]);

  // Sync seguimiento items when Convex query resolves
  useEffect(() => {
    if (rawSeguimiento) {
      try {
        const parsed = JSON.parse(rawSeguimiento.items);
        setItems(parsed ?? []);
      } catch {
        setItems([]);
      }
    } else if (rawSeguimiento === null) {
      setItems([]);
    }
  }, [rawSeguimiento]);

  // Fetch live DOF when cotización is not frozen
  useEffect(() => {
    if (!selectedData) return;
    if (selectedData.tcFrozen) {
      // Frozen: use snapshot, no live fetch needed
      setLiveTc(0);
      return;
    }
    setLoadingTc(true);
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((d) => {
        if (d?.tipoCambio) setLiveTc(d.tipoCambio);
      })
      .catch(() => {
        // If fetch fails, fall back to snapshot if available
        if (selectedData.tcSnapshot) setLiveTc(Number(selectedData.tcSnapshot) || 0);
      })
      .finally(() => setLoadingTc(false));
  }, [selectedData]);

  // Compute base TC: frozen → snapshot, live → fetched DOF
  const baseTc = useMemo(() => {
    if (!selectedData) return 0;
    if (selectedData.tcFrozen) return Number(selectedData.tcSnapshot) || 0;
    return liveTc;
  }, [selectedData, liveTc]);

  // Effective TCs per section
  const tcPaneles = selectedData && Number(selectedData.tcCustomPaneles) > 0
    ? Number(selectedData.tcCustomPaneles)
    : baseTc;
  const tcMicros = selectedData && Number(selectedData.tcCustomMicros) > 0
    ? Number(selectedData.tcCustomMicros)
    : baseTc;

  // Derive cotized items
  const conceptos = useMemo<ConceptoCotizado[]>(() => {
    if (!selectedData || baseTc <= 0) return [];
    return derivarConceptos(selectedData, baseTc);
  }, [selectedData, baseTc]);

  // Precio cobrado al cliente = subtotal + IVA 16%
  const totalCotizado = conceptos.reduce((acc, c) => acc + c.totalMXN, 0);
  const precioCobrado = totalCotizado * 1.16;

  // Helper to get/set item
  function getItem(key: string): SeguimientoItem {
    return (
      items.find((i) => i.key === key) ?? {
        key,
        realMXN: "",
        proveedor: "",
        notas: "",
      }
    );
  }

  function setItemField(key: string, field: keyof SeguimientoItem, value: string) {
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, [field]: value } : i));
      }
      return [...prev, { key, realMXN: "", proveedor: "", notas: "", [field]: value }];
    });
  }

  // Summary calculations
  const totalReal = useMemo(() => {
    return conceptos.reduce((acc, c) => {
      const item = getItem(c.key);
      return acc + (Number(item.realMXN) || 0);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptos, items]);

  const utilidad = precioCobrado - totalReal;
  const margen = precioCobrado > 0 ? (utilidad / precioCobrado) * 100 : 0;

  const filledCount = conceptos.filter((c) => {
    const item = getItem(c.key);
    return item.realMXN !== "" && Number(item.realMXN) > 0;
  }).length;

  async function handleGuardar() {
    if (!selectedNombre) return;
    const filteredItems = items.filter((i) => i.realMXN !== "" || i.proveedor !== "" || i.notas !== "");
    await convexGuardarSeguimiento(selectedNombre, filteredItems);
    setMsgGuardado(true);
    setTimeout(() => setMsgGuardado(false), 2500);
  }

  // Group conceptos by section
  const bySection = useMemo(() => {
    const map: Partial<Record<Seccion, ConceptoCotizado[]>> = {};
    for (const c of conceptos) {
      if (!map[c.seccion]) map[c.seccion] = [];
      map[c.seccion]!.push(c);
    }
    return map;
  }, [conceptos]);

  const isFrozen = selectedData?.tcFrozen === true;
  const hasCustomTcPaneles = selectedData && Number(selectedData.tcCustomPaneles) > 0;
  const hasCustomTcMicros = selectedData && Number(selectedData.tcCustomMicros) > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-amber-400 font-bold text-lg leading-none">☀</span>
            <span className="font-semibold text-zinc-100 text-sm tracking-tight hidden sm:block">
              Cotizador Solar
            </span>
          </div>
          <AppNav />
          <div className="flex items-center gap-2 shrink-0">
            {selectedNombre && (
              <button
                onClick={handleGuardar}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors"
              >
                {msgGuardado ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardado
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Guardar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6 pb-48">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Comparativa de Proyecto</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Compara los costos cotizados con los costos reales de compra para calcular la utilidad real.
          </p>
        </div>

        {/* Config card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold">
              ⚙
            </span>
            <h2 className="font-semibold text-zinc-100 text-base">Configuración</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Cotización selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Cotización
              </label>
              <select
                value={selectedNombre}
                onChange={(e) => setSelectedNombre(e.target.value)}
                className={selectCls}
              >
                <option value="">-- Selecciona una cotización --</option>
                {cotizaciones.map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {cotizaciones.length === 0 && (
                <p className="text-xs text-zinc-500">No hay cotizaciones guardadas.</p>
              )}
            </div>

            {/* TC info (read-only) */}
            {selectedData ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Tipos de cambio aplicados
                </label>
                <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-4 py-3 space-y-2">
                  {/* Base TC row */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">TC base (DOF)</span>
                    {loadingTc ? (
                      <span className="text-xs text-zinc-500 animate-pulse">Cargando…</span>
                    ) : isFrozen ? (
                      <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
                        <span className="text-amber-400/70">🔒</span>
                        {Number(selectedData.tcSnapshot) > 0
                          ? `$${Number(selectedData.tcSnapshot).toFixed(2)}`
                          : "—"}
                        <span className="text-zinc-500 font-normal font-sans ml-1">congelado</span>
                      </span>
                    ) : baseTc > 0 ? (
                      <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-200">
                        ${baseTc.toFixed(2)}
                        <span className="text-zinc-500 font-normal font-sans">DOF en vivo</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </div>

                  {/* Paneles TC */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">Paneles</span>
                    {hasCustomTcPaneles ? (
                      <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-400">
                        ${tcPaneles.toFixed(2)}
                        <span className="text-zinc-500 font-normal font-sans">personalizado</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">
                        {baseTc > 0 ? `$${baseTc.toFixed(2)}` : "—"}
                        <span className="text-zinc-600 font-sans ml-1">{isFrozen ? "(congelado)" : "(DOF)"}</span>
                      </span>
                    )}
                  </div>

                  {/* Micros TC */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">Microinversores</span>
                    {hasCustomTcMicros ? (
                      <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-400">
                        ${tcMicros.toFixed(2)}
                        <span className="text-zinc-500 font-normal font-sans">personalizado</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">
                        {baseTc > 0 ? `$${baseTc.toFixed(2)}` : "—"}
                        <span className="text-zinc-600 font-sans ml-1">{isFrozen ? "(congelado)" : "(DOF)"}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Tipos de cambio
                </label>
                <div className="rounded-lg border border-zinc-700/40 bg-zinc-800/20 px-4 py-3">
                  <p className="text-xs text-zinc-600">Selecciona una cotización para ver el TC.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!selectedNombre && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-zinc-400 font-medium">Selecciona una cotización para comenzar</p>
            <p className="text-zinc-600 text-sm mt-1">
              Podrás ingresar los costos reales de compra y ver la utilidad del proyecto.
            </p>
          </div>
        )}

        {/* Loading TC state */}
        {selectedNombre && selectedData && !isFrozen && loadingTc && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-zinc-500 text-sm animate-pulse">Obteniendo tipo de cambio DOF…</p>
          </div>
        )}

        {/* Sections table */}
        {selectedNombre && selectedData && baseTc > 0 && (
          <>
            {SECTIONS.map((seccion) => {
              const sectionItems = bySection[seccion];
              if (!sectionItems || sectionItems.length === 0) return null;

              const sectionTotalCotizado = sectionItems.reduce((acc, c) => acc + c.totalMXN, 0);
              const sectionTotalReal = sectionItems.reduce((acc, c) => {
                const item = getItem(c.key);
                return acc + (Number(item.realMXN) || 0);
              }, 0);
              const sectionDelta = sectionTotalReal - sectionTotalCotizado;
              const sectionHasAnyReal = sectionItems.some((c) => {
                const item = getItem(c.key);
                return item.realMXN !== "" && Number(item.realMXN) > 0;
              });

              return (
                <div key={seccion} className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-800/30">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold">
                      {SECTION_NUMS[seccion]}
                    </span>
                    <h2 className="font-semibold text-zinc-100 text-base flex-1">
                      {SECTION_LABELS[seccion]}
                    </h2>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-zinc-500">
                        Cotizado:{" "}
                        <span className="text-zinc-300 font-medium">{fmt(sectionTotalCotizado)}</span>
                      </span>
                      {sectionHasAnyReal && (
                        <span className="text-zinc-500">
                          Real:{" "}
                          <span
                            className={`font-medium ${
                              sectionDelta > 0
                                ? "text-red-400"
                                : sectionDelta < 0
                                ? "text-emerald-400"
                                : "text-zinc-300"
                            }`}
                          >
                            {fmt(sectionTotalReal)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide w-64">
                            Concepto
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                            Cotizado MXN
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide min-w-32">
                            Real MXN
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide min-w-40">
                            Proveedor
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                            Δ MXN
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                            Δ %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionItems.map((concepto) => {
                          const item = getItem(concepto.key);
                          const realVal = Number(item.realMXN) || 0;
                          const hasReal = item.realMXN !== "" && realVal > 0;
                          const delta = hasReal ? realVal - concepto.totalMXN : null;
                          const deltaPercent =
                            delta !== null && concepto.totalMXN > 0
                              ? (delta / concepto.totalMXN) * 100
                              : null;

                          const deltaColor =
                            delta === null
                              ? "text-zinc-600"
                              : delta > 0
                              ? "text-red-400"
                              : delta < 0
                              ? "text-emerald-400"
                              : "text-zinc-400";

                          return (
                            <tr
                              key={concepto.key}
                              className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                            >
                              {/* Concepto */}
                              <td className="px-6 py-3">
                                <div className="font-medium text-zinc-200">{concepto.concepto}</div>
                                {concepto.detalle && (
                                  <div className="text-xs text-zinc-500 mt-0.5">{concepto.detalle}</div>
                                )}
                              </td>
                              {/* Cotizado */}
                              <td className="px-4 py-3 text-right font-mono text-zinc-300 whitespace-nowrap">
                                {fmt(concepto.totalMXN)}
                              </td>
                              {/* Real input */}
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.realMXN}
                                  onChange={(e) => setItemField(concepto.key, "realMXN", e.target.value)}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-right text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/60 focus:border-amber-400/60 transition-colors"
                                />
                              </td>
                              {/* Proveedor */}
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.proveedor}
                                  onChange={(e) => setItemField(concepto.key, "proveedor", e.target.value)}
                                  placeholder="Proveedor…"
                                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/60 focus:border-amber-400/60 transition-colors"
                                />
                              </td>
                              {/* Delta MXN */}
                              <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${deltaColor}`}>
                                {delta !== null
                                  ? `${delta > 0 ? "+" : ""}${fmt(delta)}`
                                  : "—"}
                              </td>
                              {/* Delta % */}
                              <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${deltaColor}`}>
                                {deltaPercent !== null
                                  ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}%`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Section subtotal row */}
                      <tfoot>
                        <tr className="border-t border-zinc-700 bg-zinc-800/40">
                          <td className="px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                            Subtotal {SECTION_LABELS[seccion]}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-200 whitespace-nowrap">
                            {fmt(sectionTotalCotizado)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">
                            {sectionHasAnyReal ? (
                              <span
                                className={
                                  sectionDelta > 0
                                    ? "text-red-400"
                                    : sectionDelta < 0
                                    ? "text-emerald-400"
                                    : "text-zinc-200"
                                }
                              >
                                {fmt(sectionTotalReal)}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td colSpan={3} className="px-4 py-3">
                            {sectionHasAnyReal && sectionDelta !== 0 && (
                              <span
                                className={`text-xs font-medium ${
                                  sectionDelta > 0 ? "text-red-400" : "text-emerald-400"
                                }`}
                              >
                                {sectionDelta > 0 ? "+" : ""}
                                {fmt(sectionDelta)}{" "}
                                {sectionDelta > 0 ? "sobrecosto" : "ahorro"}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Notes row */}
                  <div className="px-6 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sectionItems.map((concepto) => {
                      const item = getItem(concepto.key);
                      return (
                        <div key={`notes-${concepto.key}`} className="space-y-1">
                          <label className="text-xs text-zinc-600 truncate block">
                            Notas — {concepto.concepto}
                          </label>
                          <input
                            type="text"
                            value={item.notas}
                            onChange={(e) => setItemField(concepto.key, "notas", e.target.value)}
                            placeholder="Notas opcionales…"
                            className="w-full rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>

      {/* Fixed bottom summary bar */}
      {selectedNombre && selectedData && baseTc > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
            {/* Progress */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-500">
                <span className="text-amber-400 font-medium">{filledCount}</span>
                <span> / {conceptos.length} conceptos registrados</span>
              </span>
              {filledCount === conceptos.length && conceptos.length > 0 && (
                <span className="text-xs text-emerald-400 font-medium">Todos los conceptos completados</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-zinc-800 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{
                  width: conceptos.length > 0 ? `${(filledCount / conceptos.length) * 100}%` : "0%",
                }}
              />
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Precio cobrado</div>
                <div className="font-mono font-semibold text-zinc-100 text-sm">
                  {fmt(precioCobrado)}
                </div>
                <div className="text-xs text-zinc-600">Subtotal + IVA 16%</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Costo cotizado</div>
                <div className="font-mono font-semibold text-zinc-300 text-sm">
                  {fmt(totalCotizado)}
                </div>
                <div className="text-xs text-zinc-600">Sin IVA</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Costo real</div>
                <div
                  className={`font-mono font-semibold text-sm ${
                    totalReal > 0 ? "text-zinc-100" : "text-zinc-600"
                  }`}
                >
                  {totalReal > 0 ? fmt(totalReal) : "—"}
                </div>
                <div className="text-xs text-zinc-600">{filledCount}/{conceptos.length} conceptos</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Utilidad bruta</div>
                {totalReal > 0 ? (
                  <>
                    <div
                      className={`font-mono font-bold text-sm ${
                        utilidad >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {fmt(utilidad)}
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        margen >= 0 ? "text-emerald-400/70" : "text-red-400/70"
                      }`}
                    >
                      Margen: {margen.toFixed(1)}%
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-mono font-bold text-sm text-zinc-600">—</div>
                    <div className="text-xs text-zinc-700">Ingresa costos reales</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
