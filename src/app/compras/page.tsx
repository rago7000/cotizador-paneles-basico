"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import AppNav from "../components/AppNav";
import type { OrdenCompraEstado, ItemDemanda } from "../lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = "consolidar" | "ordenes";

const fmt = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SECTION_LABELS: Record<string, string> = {
  PANELES: "Paneles Solares",
  INVERSORES: "Microinversores",
  ESTRUCTURA: "Estructura",
  TORNILLERIA: "Tornilleria",
  GENERALES: "Generales",
};

const OC_ESTADOS: { value: OrdenCompraEstado; label: string; color: string; bg: string }[] = [
  { value: "borrador", label: "Borrador", color: "text-zinc-400", bg: "bg-zinc-700" },
  { value: "enviada", label: "Enviada", color: "text-sky-400", bg: "bg-sky-400/15" },
  { value: "confirmada", label: "Confirmada", color: "text-amber-400", bg: "bg-amber-400/15" },
  { value: "parcial", label: "Parcial", color: "text-orange-400", bg: "bg-orange-400/15" },
  { value: "recibida", label: "Recibida", color: "text-emerald-400", bg: "bg-emerald-400/15" },
  { value: "cancelada", label: "Cancelada", color: "text-red-400", bg: "bg-red-400/15" },
];

function ocEstadoInfo(e: OrdenCompraEstado) {
  return OC_ESTADOS.find((s) => s.value === e) ?? OC_ESTADOS[0];
}

const inputCls =
  "w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-colors";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const [tab, setTab] = useState<Tab>("consolidar");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-amber-400 font-bold text-lg leading-none">&#9728;</span>
            <span className="font-semibold text-zinc-100 text-sm tracking-tight hidden sm:block">
              Cotizador Solar
            </span>
          </div>
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Compras</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Consolida pedidos de cotizaciones aprobadas y gestiona ordenes de compra.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-900 border border-zinc-800 p-1 w-fit">
          <button
            onClick={() => setTab("consolidar")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === "consolidar" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Consolidar
          </button>
          <button
            onClick={() => setTab("ordenes")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === "ordenes" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Ordenes de Compra
          </button>
        </div>

        {tab === "consolidar" && <ConsolidarTab />}
        {tab === "ordenes" && <OrdenesTab />}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Consolidar
// ═══════════════════════════════════════════════════════════════════════════════

function ConsolidarTab() {
  const cotizaciones = useQuery(api.cotizaciones.listByEtapa, { etapa: "cerrado_ganado" }) ?? [];
  const proveedores = useQuery(api.proveedores.list) ?? [];
  const proveedorNames = useMemo(() => proveedores.map((p) => p.nombre), [proveedores]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [proveedorPorItem, setProveedorPorItem] = useState<Map<string, string>>(new Map());
  const crearOCMut = useMutation(api.ordenesCompra.crear);

  const selectedNames = useMemo(() => Array.from(selected), [selected]);

  const demandaResult = useQuery(
    api.consolidador.agregadoDemanda,
    selectedNames.length > 0 ? { cotizacionNombres: selectedNames } : "skip",
  );

  const toggleSelection = useCallback((nombre: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre);
      else next.add(nombre);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === cotizaciones.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cotizaciones.map((c) => c.nombre)));
    }
  }, [cotizaciones, selected.size]);

  // Group demanda items by proveedor for OC creation
  const byProveedor = useMemo(() => {
    if (!demandaResult?.items) return new Map<string, ItemDemanda[]>();
    const map = new Map<string, ItemDemanda[]>();
    for (const item of demandaResult.items) {
      const prov = proveedorPorItem.get(item.id) || "Sin asignar";
      if (!map.has(prov)) map.set(prov, []);
      map.get(prov)!.push(item);
    }
    return map;
  }, [demandaResult, proveedorPorItem]);

  async function handleCrearOC(proveedorNombre: string, items: ItemDemanda[]) {
    const lineas = items.map((item) => ({
      id: item.id,
      descripcion: item.descripcion,
      productoId: item.productoId,
      productoTabla: item.productoTabla,
      cantidad: item.cantidadTotal,
      unidad: item.unidad,
      precioUnitarioEst: item.precioUnitario,
      moneda: item.moneda,
      origenes: item.origenes,
    }));

    await crearOCMut({
      proveedorNombre,
      lineas,
      moneda: items[0]?.moneda ?? "MXN",
    });
  }

  return (
    <div className="space-y-6">
      {/* Cotizaciones checklist */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-bold">
            &#10003;
          </span>
          <h2 className="font-semibold text-zinc-100 text-base flex-1">
            Cotizaciones aprobadas
          </h2>
          <button
            onClick={selectAll}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {selected.size === cotizaciones.length ? "Deseleccionar" : "Seleccionar"} todas
          </button>
        </div>

        {cotizaciones.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-zinc-500 text-sm">
              No hay cotizaciones con etapa &quot;Cerrado ganado&quot;.
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Cambia la etapa de una cotizacion a &quot;Cerrado ganado&quot; para verla aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {cotizaciones.map((c) => {
              const qty = Number(c.cantidad) || 0;
              const potencia = Number(c.potencia) || 0;
              return (
                <label
                  key={c.nombre}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/20 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.nombre)}
                    onChange={() => toggleSelection(c.nombre)}
                    className="rounded border-zinc-600 bg-zinc-800 text-emerald-400 focus:ring-emerald-400/60"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-200 text-sm truncate">{c.nombre}</div>
                    <div className="text-xs text-zinc-500">
                      {qty > 0 ? `${qty} paneles` : "Sin paneles"}
                      {potencia > 0 ? ` x ${potencia}W` : ""}
                      {c.fecha ? ` — ${c.fecha}` : ""}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Demanda consolidada */}
      {demandaResult && demandaResult.items.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-bold">
              &#128230;
            </span>
            <h2 className="font-semibold text-zinc-100 text-base flex-1">
              Demanda consolidada
            </h2>
            <span className="text-xs text-zinc-500">
              {demandaResult.totalItems} items de {selectedNames.length} cotizaciones
            </span>
          </div>

          {/* Group by section */}
          {(() => {
            const bySec = new Map<string, ItemDemanda[]>();
            for (const item of demandaResult.items) {
              if (!bySec.has(item.seccion)) bySec.set(item.seccion, []);
              bySec.get(item.seccion)!.push(item);
            }

            return Array.from(bySec.entries()).map(([seccion, items]) => (
              <div key={seccion} className="border-b border-zinc-800/30 last:border-b-0">
                <div className="px-6 py-2 bg-zinc-800/20">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    {SECTION_LABELS[seccion] ?? seccion}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        <th className="text-left px-6 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Material</th>
                        <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Qty</th>
                        <th className="text-left px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Unidad</th>
                        <th className="text-center px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Moneda</th>
                        <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">P. unit.</th>
                        <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Subtotal</th>
                        <th className="text-left px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Desglose</th>
                        <th className="text-left px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide min-w-[140px]">Proveedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/10">
                          <td className="px-6 py-2.5">
                            <span className="font-medium text-zinc-200">{item.descripcion}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-zinc-100">
                            {item.cantidadTotal}
                          </td>
                          <td className="px-3 py-2.5 text-zinc-500">{item.unidad}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.moneda === "USD" ? "bg-sky-400/10 text-sky-400" : "bg-zinc-700 text-zinc-400"}`}>
                              {item.moneda}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-zinc-400 whitespace-nowrap">
                            {item.precioUnitario ? fmt(item.precioUnitario) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-zinc-300 whitespace-nowrap">
                            {item.precioUnitario ? fmt(item.precioUnitario * item.cantidadTotal) : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {item.origenes.map((o, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                                  title={o.cotizacionNombre}
                                >
                                  {o.cotizacionNombre.length > 15
                                    ? o.cotizacionNombre.slice(0, 15) + "..."
                                    : o.cotizacionNombre}
                                  : {o.cantidad}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <ProveedorCombobox
                              value={proveedorPorItem.get(item.id) ?? ""}
                              options={proveedorNames}
                              onChange={(val) => {
                                const next = new Map(proveedorPorItem);
                                if (val) next.set(item.id, val);
                                else next.delete(item.id);
                                setProveedorPorItem(next);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ));
          })()}

          {/* Create OC buttons per proveedor group */}
          {Array.from(byProveedor.entries())
            .filter(([name]) => name !== "Sin asignar")
            .map(([provName, items]) => (
              <div
                key={provName}
                className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/50 bg-zinc-800/10"
              >
                <div>
                  <span className="text-sm font-medium text-zinc-200">{provName}</span>
                  <span className="text-xs text-zinc-500 ml-2">{items.length} items</span>
                </div>
                <button
                  onClick={() => handleCrearOC(provName, items)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors"
                >
                  Crear OC
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Empty state for no selection */}
      {selected.size === 0 && cotizaciones.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <div className="text-4xl mb-3">&#128722;</div>
          <p className="text-zinc-400 font-medium">Selecciona cotizaciones para consolidar</p>
          <p className="text-zinc-600 text-sm mt-1">
            El sistema sumara la demanda de materiales y te permitira crear ordenes de compra.
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Ordenes de Compra
// ═══════════════════════════════════════════════════════════════════════════════

function OrdenesTab() {
  const ordenes = useQuery(api.ordenesCompra.list) ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {ordenes.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <div className="text-4xl mb-3">&#128203;</div>
          <p className="text-zinc-400 font-medium">No hay ordenes de compra</p>
          <p className="text-zinc-600 text-sm mt-1">
            Consolida cotizaciones aprobadas para crear ordenes.
          </p>
        </div>
      ) : (
        ordenes.map((oc) => (
          <OCCard
            key={oc._id}
            oc={oc}
            isExpanded={expandedId === oc._id}
            onToggle={() => setExpandedId(expandedId === oc._id ? null : oc._id)}
          />
        ))
      )}
    </div>
  );
}

// ─── OC Card ──────────────────────────────────────────────────────────────────

function OCCard({
  oc,
  isExpanded,
  onToggle,
}: {
  oc: {
    _id: Id<"ordenesCompra">;
    folio: string;
    proveedorNombre: string;
    lineas: Array<{
      id: string;
      descripcion: string;
      productoId?: string;
      productoTabla?: string;
      cantidad: number;
      unidad: string;
      moneda: string;
      precioUnitarioEst?: number;
      origenes: Array<{ cotizacionNombre: string; seguimientoKey: string; cantidad: number }>;
      notaBulk?: string;
    }>;
    estado: string;
    subtotalEst?: number;
    moneda: string;
    fechaCreacion: string;
    tcCompra?: number;
    notas?: string;
  };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const ei = ocEstadoInfo(oc.estado as OrdenCompraEstado);
  const marcarEnviadaMut = useMutation(api.ordenesCompra.marcarEnviada);
  const marcarConfirmadaMut = useMutation(api.ordenesCompra.marcarConfirmada);
  const marcarRecibidaMut = useMutation(api.ordenesCompra.marcarRecibida);
  const cancelarMut = useMutation(api.ordenesCompra.cancelar);
  const eliminarMut = useMutation(api.ordenesCompra.eliminar);

  const [costosReales, setCostosReales] = useState<Map<string, number>>(new Map());
  const [tcRecepcion, setTcRecepcion] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const showCostoReal = oc.estado === "confirmada" || oc.estado === "enviada";
  const totalEstimado = oc.lineas.reduce((a, l) => a + (l.precioUnitarioEst ?? 0) * l.cantidad, 0);

  async function handleRecibir() {
    const costosPorLinea = Array.from(costosReales.entries()).map(([lineaId, costoReal]) => ({
      lineaId,
      costoReal,
    }));
    if (costosPorLinea.length === 0) return;

    setSaving(true);
    try {
      await marcarRecibidaMut({
        id: oc._id,
        tcCompra: tcRecepcion ? Number(tcRecepcion) : undefined,
        costosPorLinea,
      });
      setCostosReales(new Map());
      setTcRecepcion("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header — clickable */}
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-zinc-800/20 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-100 text-sm">{oc.folio}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ei.bg} ${ei.color}`}>
              {ei.label}
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {oc.proveedorNombre} — {oc.lineas.length} items
            {oc.subtotalEst ? ` — Est. ${fmt(oc.subtotalEst)} ${oc.moneda}` : ""}
          </div>
        </div>
        <div className="text-xs text-zinc-600">
          {new Date(oc.fechaCreacion).toLocaleDateString("es-MX")}
        </div>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-zinc-800">
          {/* Lines table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="text-left px-6 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Material</th>
                  <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Cantidad</th>
                  <th className="text-center px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Moneda</th>
                  <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">P. unit. est.</th>
                  <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Subtotal est.</th>
                  <th className="text-left px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Desglose por cotizacion</th>
                  {showCostoReal && (
                    <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide min-w-[120px]">
                      Costo real
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {oc.lineas.map((linea) => {
                  const subtotalEst = (linea.precioUnitarioEst ?? 0) * linea.cantidad;
                  return (
                    <tr key={linea.id} className="border-b border-zinc-800/30">
                      <td className="px-6 py-3">
                        <div className="font-medium text-zinc-200">{linea.descripcion}</div>
                        {linea.productoId && (
                          <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                            ID: {linea.productoId.slice(0, 12)}...
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-100 font-semibold whitespace-nowrap">
                        {linea.cantidad} <span className="text-zinc-500 font-normal">{linea.unidad}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${linea.moneda === "USD" ? "bg-sky-400/10 text-sky-400" : "bg-zinc-700 text-zinc-400"}`}>
                          {linea.moneda}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-400 whitespace-nowrap">
                        {linea.precioUnitarioEst ? fmt(linea.precioUnitarioEst) : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-300 whitespace-nowrap">
                        {subtotalEst > 0 ? fmt(subtotalEst) : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          {linea.origenes.map((o, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <span className="text-zinc-500 truncate max-w-[200px]" title={o.cotizacionNombre}>
                                {o.cotizacionNombre}
                              </span>
                              <span className="font-mono font-semibold text-zinc-300">&times;{o.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      {showCostoReal && (
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={costosReales.get(linea.id) ?? ""}
                            onChange={(e) => {
                              const next = new Map(costosReales);
                              if (e.target.value) next.set(linea.id, Number(e.target.value));
                              else next.delete(linea.id);
                              setCostosReales(next);
                            }}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`${inputCls} text-right font-mono`}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="border-t border-zinc-700 bg-zinc-800/40">
                  <td className="px-6 py-3 text-xs font-semibold text-zinc-400 uppercase">Total</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-zinc-100">
                    {oc.lineas.reduce((a, l) => a + l.cantidad, 0)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[10px] text-zinc-500">{oc.moneda}</span>
                  </td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right font-mono font-bold text-zinc-100 whitespace-nowrap">
                    {totalEstimado > 0 ? fmt(totalEstimado) : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-500">
                    {oc.lineas.reduce((a, l) => a + l.origenes.length, 0)} origenes de {new Set(oc.lineas.flatMap(l => l.origenes.map(o => o.cotizacionNombre))).size} cotizaciones
                  </td>
                  {showCostoReal && <td className="px-3 py-3" />}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Actions bar */}
          <div className="px-6 py-4 border-t border-zinc-800/50 flex items-center justify-between gap-4">
            {/* TC input for reception */}
            {(oc.estado === "confirmada" || oc.estado === "enviada") && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500">TC:</label>
                <input
                  type="number"
                  value={tcRecepcion}
                  onChange={(e) => setTcRecepcion(e.target.value)}
                  placeholder="17.50"
                  className={`${inputCls} w-24 text-right font-mono`}
                />
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {oc.estado === "borrador" && (
                <>
                  <button
                    onClick={() => cancelarMut({ id: oc._id })}
                    className="px-3 py-1.5 rounded-lg border border-red-800 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => marcarEnviadaMut({ id: oc._id })}
                    className="px-3 py-1.5 rounded-lg bg-sky-500 text-xs font-semibold text-zinc-900 hover:bg-sky-400 transition-colors"
                  >
                    Marcar enviada
                  </button>
                </>
              )}
              {oc.estado === "enviada" && (
                <>
                  <button
                    onClick={() => marcarConfirmadaMut({ id: oc._id })}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors"
                  >
                    Marcar confirmada
                  </button>
                  <button
                    onClick={handleRecibir}
                    disabled={costosReales.size === 0 || saving}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Registrando..." : "Registrar recepcion"}
                  </button>
                </>
              )}
              {oc.estado === "confirmada" && (
                <button
                  onClick={handleRecibir}
                  disabled={costosReales.size === 0 || saving}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Registrando..." : "Registrar recepcion"}
                </button>
              )}
              {oc.estado === "parcial" && (
                <button
                  onClick={handleRecibir}
                  disabled={costosReales.size === 0 || saving}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Registrando..." : "Registrar mas items"}
                </button>
              )}
              {(oc.estado === "recibida" || oc.estado === "cancelada") && (
                <span className={`text-xs font-medium ${ei.color}`}>
                  {ei.label}
                </span>
              )}
              {(oc.estado === "cancelada" || oc.estado === "borrador") && (
                <button
                  onClick={() => eliminarMut({ id: oc._id })}
                  className="px-3 py-1.5 rounded-lg border border-red-800 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Proveedor Combobox ───────────────────────────────────────────────────────

function ProveedorCombobox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Position dropdown relative to viewport
  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lower));
  }, [options, search]);

  return (
    <div ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        value={value || search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Seleccionar proveedor..."
        className={inputCls}
      />
      {open && (filtered.length > 0 || search) && (
        <div
          className="fixed z-[9999] max-h-48 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setSearch("");
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-zinc-700 ${
                value === name ? "text-emerald-400 font-medium" : "text-zinc-300"
              }`}
            >
              {name}
            </button>
          ))}
          {search && !options.includes(search) && (
            <button
              type="button"
              onClick={() => {
                onChange(search);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-zinc-700 border-t border-zinc-700"
            >
              + Usar &quot;{search}&quot; como nuevo proveedor
            </button>
          )}
        </div>
      )}
    </div>
  );
}
