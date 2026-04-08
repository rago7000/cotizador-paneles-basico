"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AppNav from "../components/AppNav";
import { useConvexCotizaciones } from "../lib/useConvexCatalogo";
import type {
  CotizacionData,
  CotizacionGuardada,
  SeguimientoEstado,
} from "../lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Seccion = "PANELES" | "INVERSORES" | "ESTRUCTURA" | "TORNILLERIA" | "GENERALES";
type VistaTab = "concepto" | "proveedor" | "estado";

interface ConceptoCotizado {
  key: string;
  seccion: Seccion;
  concepto: string;
  detalle: string;
  totalMXN: number;
  monedaOrigen: "MXN" | "USD";
}

interface ItemLocal {
  key: string;
  realMXN?: number;
  incluyeIVA?: boolean;
  tcCompra?: number;
  montoOriginal?: number;
  monedaOriginal?: string;
  proveedorNombre?: string;
  estado?: SeguimientoEstado;
  fechaPedido?: string;
  fechaPago?: string;
  fechaRecibido?: string;
  notas?: string;
  facturaRef?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESTADOS: { value: SeguimientoEstado; label: string; color: string; bg: string }[] = [
  { value: "pendiente", label: "Pendiente", color: "text-zinc-400", bg: "bg-zinc-700" },
  { value: "pedido", label: "Pedido", color: "text-sky-400", bg: "bg-sky-400/15" },
  { value: "pagado", label: "Pagado", color: "text-amber-400", bg: "bg-amber-400/15" },
  { value: "recibido", label: "Recibido", color: "text-emerald-400", bg: "bg-emerald-400/15" },
];

function estadoInfo(e?: SeguimientoEstado) {
  return ESTADOS.find((s) => s.value === e) ?? ESTADOS[0];
}

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
      monedaOrigen: "USD",
    });
  }
  if (fletePanelesNum > 0) {
    result.push({
      key: "pan-flete",
      seccion: "PANELES",
      concepto: "Flete paneles",
      detalle: `USD ${fletePanelesNum} × TC ${tcPaneles.toFixed(2)}`,
      totalMXN: fletePanelesNum * tcPaneles,
      monedaOrigen: "USD",
    });
  }
  if (garantiaPanelesNum > 0) {
    result.push({
      key: "pan-garantia",
      seccion: "PANELES",
      concepto: "Garantía contra daños",
      detalle: `USD ${garantiaPanelesNum} × TC ${tcPaneles.toFixed(2)}`,
      totalMXN: garantiaPanelesNum * tcPaneles,
      monedaOrigen: "USD",
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
      monedaOrigen: "USD",
    });
  }
  if (precioCableNum > 0 && cantidadMicros > 0) {
    result.push({
      key: "inv-cables",
      seccion: "INVERSORES",
      concepto: `${cantidadMicros} cables troncales`,
      detalle: `$${precioCableNum}/ud × TC ${tcMicros.toFixed(2)}`,
      totalMXN: cantidadMicros * precioCableNum * tcMicros,
      monedaOrigen: "USD",
    });
  }
  if (data.incluyeECU && precioECUNum > 0) {
    result.push({
      key: "inv-ecu",
      seccion: "INVERSORES",
      concepto: "ECU-R Monitoreo",
      detalle: `$${precioECUNum} × TC ${tcMicros.toFixed(2)}`,
      totalMXN: precioECUNum * tcMicros,
      monedaOrigen: "USD",
    });
  }
  if (data.incluyeHerramienta && precioHerramientaNum > 0) {
    result.push({
      key: "inv-herramienta",
      seccion: "INVERSORES",
      concepto: "Herramienta desconectora",
      detalle: `$${precioHerramientaNum} × TC ${tcMicros.toFixed(2)}`,
      totalMXN: precioHerramientaNum * tcMicros,
      monedaOrigen: "USD",
    });
  }
  if (fleteMicrosNum > 0) {
    result.push({
      key: "inv-flete",
      seccion: "INVERSORES",
      concepto: "Flete microinversores",
      detalle: `USD ${fleteMicrosNum} × TC ${tcMicros.toFixed(2)}`,
      totalMXN: fleteMicrosNum * tcMicros,
      monedaOrigen: "USD",
    });
  }

  // ESTRUCTURA — use item.id for stable keys
  const fleteAluminioNum = Number(data.fleteAluminio) || 0;
  (data.aluminio || []).forEach((item) => {
    const qty = Number(item.cantidad) || 0;
    const precio = Number(item.precioUnitario) || 0;
    if (qty > 0 && precio > 0) {
      result.push({
        key: `est-${item.id}`,
        seccion: "ESTRUCTURA",
        concepto: item.nombre,
        detalle: `${qty} ${item.unidad} × $${precio}`,
        totalMXN: qty * precio,
        monedaOrigen: "MXN",
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
      monedaOrigen: "MXN",
    });
  }

  // TORNILLERIA — use item.id for stable keys
  (data.tornilleria || []).forEach((item) => {
    const qty = Number(item.cantidad) || 0;
    const precio = Number(item.precioUnitario) || 0;
    if (qty > 0 && precio > 0) {
      result.push({
        key: `tor-${item.id}`,
        seccion: "TORNILLERIA",
        concepto: item.nombre,
        detalle: `${qty} ${item.unidad} × $${precio}`,
        totalMXN: qty * precio,
        monedaOrigen: "MXN",
      });
    }
  });

  // GENERALES — use item.id for stable keys
  (data.generales || []).forEach((item) => {
    const qty = Number(item.cantidad) || 0;
    const precio = Number(item.precioUnitario) || 0;
    if (qty > 0 && precio > 0) {
      result.push({
        key: `gen-${item.id}`,
        seccion: "GENERALES",
        concepto: item.nombre,
        detalle: `${qty} ${item.unidad} × $${precio}`,
        totalMXN: qty * precio,
        monedaOrigen: "MXN",
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

const inputCls =
  "w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/60 focus:border-amber-400/60 transition-colors";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComparativaPage() {
  const {
    cotizaciones: convexCotizaciones,
    cargarCotizacion: convexCargarCotizacion,
  } = useConvexCotizaciones();

  const bulkUpsertMut = useMutation(api.seguimientoItems.bulkUpsert);

  const [selectedNombre, setSelectedNombre] = useState<string>("");
  const [selectedData, setSelectedData] = useState<CotizacionData | null>(null);
  const [liveTc, setLiveTc] = useState<number>(0);
  const [loadingTc, setLoadingTc] = useState(false);
  const [localEdits, setLocalEdits] = useState<Map<string, ItemLocal>>(new Map());
  const [msgGuardado, setMsgGuardado] = useState(false);
  const [vistaTab, setVistaTab] = useState<VistaTab>("concepto");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Derive cotizacion names for the selector
  const cotizacionNames = useMemo(
    () => convexCotizaciones.map((c) => c.nombre),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- convexCotizaciones changes ref every render but content is stable
    [convexCotizaciones.length],
  );

  // Use a ref for the loader function to avoid dependency instability
  const cargarRef = useRef(convexCargarCotizacion);
  cargarRef.current = convexCargarCotizacion;

  // Load v2 seguimiento items from Convex (reactive)
  const rawItems = useQuery(
    api.seguimientoItems.listByCotizacion,
    selectedNombre ? { cotizacionNombre: selectedNombre } : "skip"
  );

  // Build items map: merge server data with local edits
  const items = useMemo<Map<string, ItemLocal>>(() => {
    const map = new Map<string, ItemLocal>();
    if (rawItems) {
      for (const doc of rawItems) {
        map.set(doc.key, {
          key: doc.key,
          realMXN: doc.realMXN ?? undefined,
          incluyeIVA: doc.incluyeIVA ?? undefined,
          tcCompra: doc.tcCompra ?? undefined,
          montoOriginal: doc.montoOriginal ?? undefined,
          monedaOriginal: doc.monedaOriginal ?? undefined,
          proveedorNombre: doc.proveedorNombre ?? undefined,
          estado: (doc.estado as SeguimientoEstado) ?? undefined,
          fechaPedido: doc.fechaPedido ?? undefined,
          fechaPago: doc.fechaPago ?? undefined,
          fechaRecibido: doc.fechaRecibido ?? undefined,
          notas: doc.notas ?? undefined,
          facturaRef: doc.facturaRef ?? undefined,
        });
      }
    }
    // Overlay local edits
    for (const [key, edit] of localEdits) {
      const base = map.get(key) ?? { key };
      map.set(key, { ...base, ...edit });
    }
    return map;
  }, [rawItems, localEdits]);

  // Reset and load data when selection changes
  useEffect(() => {
    setLocalEdits(new Map());
    setLiveTc(0);
    if (!selectedNombre) {
      setSelectedData(null);
      return;
    }
    const data = cargarRef.current(selectedNombre);
    setSelectedData(data);
  }, [selectedNombre]);

  // Fetch live DOF — only when selection or frozen state changes (NOT on every object reference change)
  const tcFrozen = selectedData?.tcFrozen ?? false;
  const tcSnapshot = selectedData?.tcSnapshot;
  useEffect(() => {
    if (!selectedNombre) return;
    if (tcFrozen) {
      setLiveTc(0);
      return;
    }
    let cancelled = false;
    setLoadingTc(true);
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.tipoCambio) setLiveTc(d.tipoCambio); })
      .catch(() => {
        if (!cancelled && tcSnapshot) setLiveTc(Number(tcSnapshot) || 0);
      })
      .finally(() => { if (!cancelled) setLoadingTc(false); });
    return () => { cancelled = true; };
  }, [selectedNombre, tcFrozen, tcSnapshot]);

  const baseTc = useMemo(() => {
    if (!selectedData) return 0;
    if (selectedData.tcFrozen) return Number(selectedData.tcSnapshot) || 0;
    return liveTc;
  }, [selectedData, liveTc]);

  const conceptos = useMemo<ConceptoCotizado[]>(() => {
    if (!selectedData || baseTc <= 0) return [];
    return derivarConceptos(selectedData, baseTc);
  }, [selectedData, baseTc]);

  // Helpers
  const getItem = useCallback((key: string): ItemLocal => {
    return items.get(key) ?? { key };
  }, [items]);

  const setItemField = useCallback((key: string, field: keyof ItemLocal, value: unknown) => {
    setLocalEdits((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) ?? { key };
      next.set(key, { ...existing, [field]: value });
      return next;
    });
  }, []);

  // Compute realMXN from USD inputs when montoOriginal or tcCompra change
  const getEffectiveRealMXN = useCallback((item: ItemLocal, concepto: ConceptoCotizado): number => {
    if (concepto.monedaOrigen === "USD" && item.montoOriginal && item.tcCompra) {
      return item.montoOriginal * item.tcCompra;
    }
    return item.realMXN ?? 0;
  }, []);

  // Summary calculations
  const totalCotizado = conceptos.reduce((acc, c) => acc + c.totalMXN, 0);
  const precioCobrado = totalCotizado * 1.16;

  const totalReal = useMemo(() => {
    return conceptos.reduce((acc, c) => {
      const item = getItem(c.key);
      const real = getEffectiveRealMXN(item, c);
      return acc + real;
    }, 0);
  }, [conceptos, getItem, getEffectiveRealMXN]);

  const utilidad = precioCobrado - totalReal;
  const margen = precioCobrado > 0 ? (utilidad / precioCobrado) * 100 : 0;
  const overrunGlobal = totalReal > 0 && totalReal > totalCotizado * 1.10;

  const filledCount = conceptos.filter((c) => {
    const item = getItem(c.key);
    return getEffectiveRealMXN(item, c) > 0;
  }).length;

  // Save
  async function handleGuardar() {
    if (!selectedNombre) return;
    const itemsToSave = conceptos.map((c) => {
      const item = getItem(c.key);
      const effectiveReal = getEffectiveRealMXN(item, c);
      return {
        key: c.key,
        ...(effectiveReal > 0 ? { realMXN: effectiveReal } : {}),
        ...(item.incluyeIVA !== undefined ? { incluyeIVA: item.incluyeIVA } : {}),
        ...(item.tcCompra ? { tcCompra: item.tcCompra } : {}),
        ...(item.montoOriginal ? { montoOriginal: item.montoOriginal } : {}),
        ...(item.monedaOriginal ? { monedaOriginal: item.monedaOriginal } : {}),
        ...(item.proveedorNombre ? { proveedorNombre: item.proveedorNombre } : {}),
        ...(item.estado ? { estado: item.estado as "pendiente" | "pedido" | "pagado" | "recibido" } : {}),
        ...(item.fechaPedido ? { fechaPedido: item.fechaPedido } : {}),
        ...(item.fechaPago ? { fechaPago: item.fechaPago } : {}),
        ...(item.fechaRecibido ? { fechaRecibido: item.fechaRecibido } : {}),
        ...(item.notas ? { notas: item.notas } : {}),
        ...(item.facturaRef ? { facturaRef: item.facturaRef } : {}),
      };
    });
    await bulkUpsertMut({ cotizacionNombre: selectedNombre, items: itemsToSave });
    setLocalEdits(new Map());
    setMsgGuardado(true);
    setTimeout(() => setMsgGuardado(false), 2500);
  }

  // Export to clipboard
  function handleExport() {
    const header = "Sección\tConcepto\tCotizado MXN\tReal MXN\tProveedor\tEstado\tΔ MXN\tNotas";
    const rows = conceptos.map((c) => {
      const item = getItem(c.key);
      const real = getEffectiveRealMXN(item, c);
      const delta = real > 0 ? real - c.totalMXN : 0;
      return [
        SECTION_LABELS[c.seccion],
        c.concepto,
        c.totalMXN.toFixed(2),
        real > 0 ? real.toFixed(2) : "",
        item.proveedorNombre ?? "",
        item.estado ?? "pendiente",
        delta !== 0 ? delta.toFixed(2) : "",
        item.notas ?? "",
      ].join("\t");
    });
    navigator.clipboard.writeText([header, ...rows].join("\n"));
  }

  // Group by section
  const bySection = useMemo(() => {
    const map: Partial<Record<Seccion, ConceptoCotizado[]>> = {};
    for (const c of conceptos) {
      if (!map[c.seccion]) map[c.seccion] = [];
      map[c.seccion]!.push(c);
    }
    return map;
  }, [conceptos]);

  // Group by proveedor
  const byProveedor = useMemo(() => {
    const map = new Map<string, ConceptoCotizado[]>();
    for (const c of conceptos) {
      const item = getItem(c.key);
      const prov = item.proveedorNombre || "Sin proveedor";
      if (!map.has(prov)) map.set(prov, []);
      map.get(prov)!.push(c);
    }
    return map;
  }, [conceptos, getItem]);

  // Group by estado
  const byEstado = useMemo(() => {
    const map = new Map<SeguimientoEstado, ConceptoCotizado[]>();
    for (const e of ["pendiente", "pedido", "pagado", "recibido"] as SeguimientoEstado[]) {
      map.set(e, []);
    }
    for (const c of conceptos) {
      const item = getItem(c.key);
      const estado = item.estado ?? "pendiente";
      map.get(estado)!.push(c);
    }
    return map;
  }, [conceptos, getItem]);

  const isFrozen = selectedData?.tcFrozen === true;
  const hasCustomTcPaneles = selectedData && Number(selectedData.tcCustomPaneles) > 0;
  const hasCustomTcMicros = selectedData && Number(selectedData.tcCustomMicros) > 0;
  const tcPaneles = hasCustomTcPaneles ? Number(selectedData!.tcCustomPaneles) : baseTc;
  const tcMicros = hasCustomTcMicros ? Number(selectedData!.tcCustomMicros) : baseTc;

  // Date field helper based on estado
  function fechaLabelForEstado(estado?: SeguimientoEstado) {
    switch (estado) {
      case "pedido": return "Fecha pedido";
      case "pagado": return "Fecha pago";
      case "recibido": return "Fecha recibido";
      default: return "Fecha";
    }
  }
  function fechaFieldForEstado(estado?: SeguimientoEstado): keyof ItemLocal {
    switch (estado) {
      case "pedido": return "fechaPedido";
      case "pagado": return "fechaPago";
      case "recibido": return "fechaRecibido";
      default: return "fechaPedido";
    }
  }
  function getFechaForEstado(item: ItemLocal): string {
    switch (item.estado) {
      case "pedido": return item.fechaPedido ?? "";
      case "pagado": return item.fechaPago ?? "";
      case "recibido": return item.fechaRecibido ?? "";
      default: return item.fechaPedido ?? "";
    }
  }

  // ─── Render helpers ─────────────────────────────────────────────────────────

  function renderConceptoRow(concepto: ConceptoCotizado) {
    const item = getItem(concepto.key);
    const realVal = getEffectiveRealMXN(item, concepto);
    const hasReal = realVal > 0;
    const delta = hasReal ? realVal - concepto.totalMXN : null;
    const deltaPercent = delta !== null && concepto.totalMXN > 0 ? (delta / concepto.totalMXN) * 100 : null;
    const deltaColor = delta === null ? "text-zinc-600" : delta > 0 ? "text-red-400" : delta < 0 ? "text-emerald-400" : "text-zinc-400";
    const overrun = hasReal && realVal > concepto.totalMXN * 1.05;
    const isExpanded = expandedKey === concepto.key;
    const ei = estadoInfo(item.estado);
    const isUSD = concepto.monedaOrigen === "USD";

    return (
      <div
        key={concepto.key}
        className={`border-b border-zinc-800/50 transition-colors ${overrun ? "bg-red-950/20" : "hover:bg-zinc-800/20"}`}
      >
        {/* Main row — always visible */}
        <div
          className="grid grid-cols-[1fr_auto_auto_auto_auto] sm:grid-cols-[1fr_100px_120px_100px_80px] items-center gap-2 px-4 sm:px-6 py-3 cursor-pointer"
          onClick={() => setExpandedKey(isExpanded ? null : concepto.key)}
        >
          {/* Concepto + estado pill */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-200 text-sm truncate">{concepto.concepto}</span>
              {overrun && <span className="text-red-400 text-xs" title="Sobrecosto >5%">!</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-500 truncate">{concepto.detalle}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ei.bg} ${ei.color}`}>
                {ei.label}
              </span>
            </div>
          </div>

          {/* Cotizado */}
          <div className="text-right font-mono text-xs text-zinc-400 whitespace-nowrap hidden sm:block">
            {fmt(concepto.totalMXN)}
          </div>

          {/* Real */}
          <div className="text-right font-mono text-sm font-medium whitespace-nowrap">
            {hasReal ? (
              <span className={overrun ? "text-red-400" : "text-zinc-100"}>{fmt(realVal)}</span>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </div>

          {/* Delta */}
          <div className={`text-right font-mono text-xs whitespace-nowrap hidden sm:block ${deltaColor}`}>
            {delta !== null ? `${delta > 0 ? "+" : ""}${fmt(delta)}` : "—"}
          </div>

          {/* Delta % */}
          <div className={`text-right font-mono text-xs whitespace-nowrap hidden sm:block ${deltaColor}`}>
            {deltaPercent !== null ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}%` : ""}
          </div>
        </div>

        {/* Expanded detail — editable fields */}
        {isExpanded && (
          <div className="px-4 sm:px-6 pb-4 pt-1 space-y-3 border-t border-zinc-800/30 bg-zinc-900/50">
            {/* Row 1: Cost inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {isUSD ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Monto USD</label>
                    <input
                      type="number"
                      value={item.montoOriginal ?? ""}
                      onChange={(e) => setItemField(concepto.key, "montoOriginal", e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`${inputCls} text-right font-mono`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wide">TC compra</label>
                    <input
                      type="number"
                      value={item.tcCompra ?? ""}
                      onChange={(e) => setItemField(concepto.key, "tcCompra", e.target.value ? Number(e.target.value) : undefined)}
                      placeholder={baseTc > 0 ? baseTc.toFixed(2) : "0.00"}
                      min="0"
                      step="0.01"
                      className={`${inputCls} text-right font-mono`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wide">= Real MXN</label>
                    <div className="px-2 py-1 text-sm font-mono text-right text-zinc-300 bg-zinc-800/50 rounded border border-zinc-700/50">
                      {item.montoOriginal && item.tcCompra
                        ? fmt(item.montoOriginal * item.tcCompra)
                        : <span className="text-zinc-600">—</span>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Real MXN</label>
                  <input
                    type="number"
                    value={item.realMXN ?? ""}
                    onChange={(e) => setItemField(concepto.key, "realMXN", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`${inputCls} text-right font-mono`}
                  />
                </div>
              )}
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.incluyeIVA ?? false}
                    onChange={(e) => setItemField(concepto.key, "incluyeIVA", e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-amber-400 focus:ring-amber-400/60"
                  />
                  Incluye IVA
                </label>
              </div>
            </div>

            {/* Row 2: Status, proveedor, fecha, factura */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Estado</label>
                <select
                  value={item.estado ?? "pendiente"}
                  onChange={(e) => setItemField(concepto.key, "estado", e.target.value as SeguimientoEstado)}
                  className={selectCls}
                >
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Proveedor</label>
                <input
                  type="text"
                  value={item.proveedorNombre ?? ""}
                  onChange={(e) => setItemField(concepto.key, "proveedorNombre", e.target.value || undefined)}
                  placeholder="Proveedor..."
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  {fechaLabelForEstado(item.estado)}
                </label>
                <input
                  type="date"
                  value={getFechaForEstado(item)}
                  onChange={(e) => setItemField(concepto.key, fechaFieldForEstado(item.estado), e.target.value || undefined)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Ref. factura</label>
                <input
                  type="text"
                  value={item.facturaRef ?? ""}
                  onChange={(e) => setItemField(concepto.key, "facturaRef", e.target.value || undefined)}
                  placeholder="Factura..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Row 3: Notas */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Notas</label>
              <input
                type="text"
                value={item.notas ?? ""}
                onChange={(e) => setItemField(concepto.key, "notas", e.target.value || undefined)}
                placeholder="Notas opcionales..."
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-amber-400 font-bold text-lg leading-none">&#9728;</span>
            <span className="font-semibold text-zinc-100 text-sm tracking-tight hidden sm:block">
              Cotizador Solar
            </span>
          </div>
          <AppNav />
          <div className="flex items-center gap-2 shrink-0">
            {selectedNombre && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
                  title="Copiar tabla al portapapeles (Excel/Sheets)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copiar
                </button>
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
              </>
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
              &#9881;
            </span>
            <h2 className="font-semibold text-zinc-100 text-base">Configuraci&oacute;n</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Cotizaci&oacute;n selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Cotizaci&oacute;n
              </label>
              <select
                value={selectedNombre}
                onChange={(e) => setSelectedNombre(e.target.value)}
                className={selectCls}
              >
                <option value="">-- Selecciona una cotizaci&oacute;n --</option>
                {cotizacionNames.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
              {cotizacionNames.length === 0 && (
                <p className="text-xs text-zinc-500">No hay cotizaciones guardadas.</p>
              )}
            </div>

            {/* TC info */}
            {selectedData ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Tipos de cambio cotizados
                </label>
                <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">TC base (DOF)</span>
                    {loadingTc ? (
                      <span className="text-xs text-zinc-500 animate-pulse">Cargando&hellip;</span>
                    ) : isFrozen ? (
                      <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
                        <span className="text-amber-400/70">&#128274;</span>
                        {Number(selectedData.tcSnapshot) > 0
                          ? `$${Number(selectedData.tcSnapshot).toFixed(2)}`
                          : "&mdash;"}
                        <span className="text-zinc-500 font-normal font-sans ml-1">congelado</span>
                      </span>
                    ) : baseTc > 0 ? (
                      <span className="text-xs font-mono font-semibold text-zinc-200">
                        ${baseTc.toFixed(2)}
                        <span className="text-zinc-500 font-normal font-sans ml-1">DOF en vivo</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">&mdash;</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">Paneles</span>
                    {hasCustomTcPaneles ? (
                      <span className="text-xs font-mono font-semibold text-sky-400">
                        ${tcPaneles.toFixed(2)}
                        <span className="text-zinc-500 font-normal font-sans ml-1">personalizado</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">
                        {baseTc > 0 ? `$${baseTc.toFixed(2)}` : "&mdash;"}
                        <span className="text-zinc-600 font-sans ml-1">{isFrozen ? "(congelado)" : "(DOF)"}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">Microinversores</span>
                    {hasCustomTcMicros ? (
                      <span className="text-xs font-mono font-semibold text-sky-400">
                        ${tcMicros.toFixed(2)}
                        <span className="text-zinc-500 font-normal font-sans ml-1">personalizado</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">
                        {baseTc > 0 ? `$${baseTc.toFixed(2)}` : "&mdash;"}
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
                  <p className="text-xs text-zinc-600">Selecciona una cotizaci&oacute;n para ver el TC.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!selectedNombre && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <div className="text-4xl mb-3">&#128202;</div>
            <p className="text-zinc-400 font-medium">Selecciona una cotizaci&oacute;n para comenzar</p>
            <p className="text-zinc-600 text-sm mt-1">
              Podr&aacute;s ingresar los costos reales de compra y ver la utilidad del proyecto.
            </p>
          </div>
        )}

        {/* Loading TC state */}
        {selectedNombre && selectedData && !isFrozen && loadingTc && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-zinc-500 text-sm animate-pulse">Obteniendo tipo de cambio DOF&hellip;</p>
          </div>
        )}

        {/* Vista tabs */}
        {selectedNombre && selectedData && baseTc > 0 && (
          <>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-900 border border-zinc-800 p-1 w-fit">
              {([
                { value: "concepto" as VistaTab, label: "Por concepto" },
                { value: "proveedor" as VistaTab, label: "Por proveedor" },
                { value: "estado" as VistaTab, label: "Por estado" },
              ]).map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setVistaTab(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    vistaTab === tab.value
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ─── Vista: Por concepto (grouped by section) ─── */}
            {vistaTab === "concepto" && (
              <>
                {SECTIONS.map((seccion) => {
                  const sectionItems = bySection[seccion];
                  if (!sectionItems || sectionItems.length === 0) return null;

                  const sectionTotalCotizado = sectionItems.reduce((acc, c) => acc + c.totalMXN, 0);
                  const sectionTotalReal = sectionItems.reduce((acc, c) => {
                    return acc + getEffectiveRealMXN(getItem(c.key), c);
                  }, 0);
                  const sectionDelta = sectionTotalReal - sectionTotalCotizado;
                  const sectionHasAnyReal = sectionTotalReal > 0;
                  const sectionOverrun = sectionHasAnyReal && sectionTotalReal > sectionTotalCotizado;

                  return (
                    <div key={seccion} className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-800/30">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold">
                          {SECTION_NUMS[seccion]}
                        </span>
                        <h2 className="font-semibold text-zinc-100 text-base flex-1">
                          {SECTION_LABELS[seccion]}
                        </h2>
                        <div className="flex items-center gap-4 text-xs">
                          {sectionOverrun && (
                            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="Sobrecosto" />
                          )}
                          <span className="text-zinc-500">
                            Cotizado:{" "}
                            <span className="text-zinc-300 font-medium">{fmt(sectionTotalCotizado)}</span>
                          </span>
                          {sectionHasAnyReal && (
                            <span className="text-zinc-500">
                              Real:{" "}
                              <span className={`font-medium ${sectionDelta > 0 ? "text-red-400" : sectionDelta < 0 ? "text-emerald-400" : "text-zinc-300"}`}>
                                {fmt(sectionTotalReal)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Column headers (desktop) */}
                      <div className="hidden sm:grid grid-cols-[1fr_100px_120px_100px_80px] gap-2 px-6 py-2 border-b border-zinc-800/50">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Concepto</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">Cotizado</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">Real</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">&Delta; MXN</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">&Delta; %</span>
                      </div>

                      {sectionItems.map(renderConceptoRow)}
                    </div>
                  );
                })}
              </>
            )}

            {/* ─── Vista: Por proveedor ─── */}
            {vistaTab === "proveedor" && (
              <>
                {Array.from(byProveedor.entries()).map(([provName, provConceptos]) => {
                  const provTotal = provConceptos.reduce((acc, c) => acc + getEffectiveRealMXN(getItem(c.key), c), 0);
                  const provCotizado = provConceptos.reduce((acc, c) => acc + c.totalMXN, 0);
                  const estadoCounts = new Map<SeguimientoEstado, number>();
                  for (const c of provConceptos) {
                    const e = getItem(c.key).estado ?? "pendiente";
                    estadoCounts.set(e, (estadoCounts.get(e) ?? 0) + 1);
                  }

                  return (
                    <div key={provName} className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-800/30">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-400/10 text-sky-400 text-xs font-bold">
                          &#128188;
                        </span>
                        <h2 className="font-semibold text-zinc-100 text-base flex-1">{provName}</h2>
                        <div className="flex items-center gap-3 text-xs">
                          {Array.from(estadoCounts.entries()).map(([estado, count]) => {
                            const ei = estadoInfo(estado);
                            return (
                              <span key={estado} className={`${ei.color}`}>
                                {count} {ei.label.toLowerCase()}
                              </span>
                            );
                          })}
                          <span className="text-zinc-500">
                            Cotizado: <span className="text-zinc-300 font-medium">{fmt(provCotizado)}</span>
                          </span>
                          {provTotal > 0 && (
                            <span className="text-zinc-500">
                              Real: <span className="text-zinc-100 font-medium">{fmt(provTotal)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="hidden sm:grid grid-cols-[1fr_100px_120px_100px_80px] gap-2 px-6 py-2 border-b border-zinc-800/50">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Concepto</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">Cotizado</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">Real</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">&Delta; MXN</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">&Delta; %</span>
                      </div>
                      {provConceptos.map(renderConceptoRow)}
                    </div>
                  );
                })}
              </>
            )}

            {/* ─── Vista: Por estado ─── */}
            {vistaTab === "estado" && (
              <>
                {ESTADOS.map((estadoDef) => {
                  const estadoConceptos = byEstado.get(estadoDef.value) ?? [];
                  if (estadoConceptos.length === 0) return null;

                  const estadoTotalCotizado = estadoConceptos.reduce((acc, c) => acc + c.totalMXN, 0);
                  const estadoTotalReal = estadoConceptos.reduce((acc, c) => acc + getEffectiveRealMXN(getItem(c.key), c), 0);

                  return (
                    <div key={estadoDef.value} className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-800/30">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${estadoDef.bg} ${estadoDef.color} text-xs font-bold`}>
                          {estadoConceptos.length}
                        </span>
                        <h2 className={`font-semibold text-base flex-1 ${estadoDef.color}`}>
                          {estadoDef.label}
                        </h2>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-zinc-500">
                            Cotizado: <span className="text-zinc-300 font-medium">{fmt(estadoTotalCotizado)}</span>
                          </span>
                          {estadoTotalReal > 0 && (
                            <span className="text-zinc-500">
                              Real: <span className="text-zinc-100 font-medium">{fmt(estadoTotalReal)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="hidden sm:grid grid-cols-[1fr_100px_120px_100px_80px] gap-2 px-6 py-2 border-b border-zinc-800/50">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Concepto</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">Cotizado</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">Real</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">&Delta; MXN</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide text-right">&Delta; %</span>
                      </div>
                      {estadoConceptos.map(renderConceptoRow)}
                    </div>
                  );
                })}
              </>
            )}
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
              <div className="flex items-center gap-2">
                {overrunGlobal && (
                  <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    Sobrecosto &gt;10%
                  </span>
                )}
                {filledCount === conceptos.length && conceptos.length > 0 && (
                  <span className="text-xs text-emerald-400 font-medium">Todos completados</span>
                )}
              </div>
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
                <div className="font-mono font-semibold text-zinc-100 text-sm">{fmt(precioCobrado)}</div>
                <div className="text-xs text-zinc-600">Subtotal + IVA 16%</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Costo cotizado</div>
                <div className="font-mono font-semibold text-zinc-300 text-sm">{fmt(totalCotizado)}</div>
                <div className="text-xs text-zinc-600">Sin IVA</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Costo real</div>
                <div className={`font-mono font-semibold text-sm ${totalReal > 0 ? "text-zinc-100" : "text-zinc-600"}`}>
                  {totalReal > 0 ? fmt(totalReal) : "&mdash;"}
                </div>
                <div className="text-xs text-zinc-600">{filledCount}/{conceptos.length} conceptos</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Utilidad bruta</div>
                {totalReal > 0 ? (
                  <>
                    <div className={`font-mono font-bold text-sm ${utilidad >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmt(utilidad)}
                    </div>
                    <div className={`text-xs font-medium ${margen >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                      Margen: {margen.toFixed(1)}%
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-mono font-bold text-sm text-zinc-600">&mdash;</div>
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
