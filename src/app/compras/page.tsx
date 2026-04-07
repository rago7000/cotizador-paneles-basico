"use client";

import { useState, useMemo, useCallback } from "react";
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
                        <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Qty total</th>
                        <th className="text-left px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Unidad</th>
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
                            <input
                              type="text"
                              value={proveedorPorItem.get(item.id) ?? ""}
                              onChange={(e) => {
                                const next = new Map(proveedorPorItem);
                                if (e.target.value) next.set(item.id, e.target.value);
                                else next.delete(item.id);
                                setProveedorPorItem(next);
                              }}
                              placeholder="Proveedor..."
                              className={inputCls}
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
      cantidad: number;
      unidad: string;
      moneda: string;
      precioUnitarioEst?: number;
      origenes: Array<{ cotizacionNombre: string; seguimientoKey: string; cantidad: number }>;
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

  const [costosReales, setCostosReales] = useState<Map<string, number>>(new Map());
  const [tcRecepcion, setTcRecepcion] = useState<string>("");
  const [saving, setSaving] = useState(false);

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="text-left px-6 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Material</th>
                <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Qty</th>
                <th className="text-left px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide">Origenes</th>
                {(oc.estado === "confirmada" || oc.estado === "enviada") && (
                  <th className="text-right px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wide min-w-[120px]">
                    Costo real
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {oc.lineas.map((linea) => (
                <tr key={linea.id} className="border-b border-zinc-800/30">
                  <td className="px-6 py-2.5">
                    <span className="font-medium text-zinc-200">{linea.descripcion}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-zinc-300">
                    {linea.cantidad} {linea.unidad}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {linea.origenes.map((o, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                        >
                          {o.cotizacionNombre.length > 12
                            ? o.cotizacionNombre.slice(0, 12) + "..."
                            : o.cotizacionNombre}
                          : {o.cantidad}
                        </span>
                      ))}
                    </div>
                  </td>
                  {(oc.estado === "confirmada" || oc.estado === "enviada") && (
                    <td className="px-3 py-2.5">
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
              ))}
            </tbody>
          </table>

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
