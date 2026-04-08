"use client";

// ── PriceListView ────────────────────────────────────────────────────────
// Read-only view of a published price list.
// Shows priceListItems with filters by type and text search.
//
// Phase 4 UI — Step 6

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

// ── Types ─────────────────────────────────────────────────────────────────

type PriceList = Doc<"priceLists">;
type PriceListItem = Doc<"priceListItems">;

export interface PriceListViewProps {
  priceListId: Id<"priceLists">;
  proveedorNombre: string;
  onBack: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────

type TipoFilter = "all" | "productosPaneles" | "productosMicros" | "productosGenerales";

const TIPO_FILTERS: { key: TipoFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "productosPaneles", label: "Panel" },
  { key: "productosMicros", label: "Micro" },
  { key: "productosGenerales", label: "General" },
];

const TABLE_LABEL: Record<string, string> = {
  productosPaneles: "Panel",
  productosMicros: "Micro",
  productosGenerales: "Gral",
};

const TABLE_COLOR: Record<string, string> = {
  productosPaneles: "bg-amber-400/10 text-amber-400",
  productosMicros: "bg-blue-400/10 text-blue-400",
  productosGenerales: "bg-zinc-700/50 text-zinc-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtPrice(valor: number, moneda: string, unidad: string): string {
  const sym = moneda === "MXN" ? "$" : "US$";
  const decimals = unidad === "por_watt" ? 3 : 2;
  const suffix = unidad === "por_watt" ? "/W" : "";
  return `${sym}${valor.toFixed(decimals)}${suffix}`;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────

export default function PriceListView({
  priceListId,
  proveedorNombre,
  onBack,
}: PriceListViewProps) {
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("all");
  const [search, setSearch] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────
  const list = useQuery(api.priceLists.get, { id: priceListId });
  const items = useQuery(api.priceLists.listItems, { priceListId });

  // ── Derived ──────────────────────────────────────────────────────────

  // Counts by type
  const typeCounts = useMemo(() => {
    if (!items) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const item of items) {
      m.set(item.productoTable, (m.get(item.productoTable) ?? 0) + 1);
    }
    return m;
  }, [items]);

  // Filtered items
  const filtered = useMemo(() => {
    if (!items) return [];
    let result = items;

    // Type filter
    if (tipoFilter !== "all") {
      result = result.filter((i) => i.productoTable === tipoFilter);
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.productoSnapshot.modelo.toLowerCase().includes(q) ||
        (i.productoSnapshot.marca?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [items, tipoFilter, search]);

  // ── Loading ──────────────────────────────────────────────────────────
  if (!list || !items) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors mt-0.5"
          >
            ← Volver
          </button>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              {proveedorNombre} — Lista v{list.version}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
              <span>{fmtDate(list.fechaPublicacion)}</span>
              <span className="text-zinc-700">·</span>
              <span>{list.totalItems} items</span>
              <span className="text-zinc-700">·</span>
              <span>{list.monedaPrincipal}</span>
              <span className="text-zinc-700">·</span>
              {list.activa ? (
                <span className="text-green-400 font-medium">🟢 Activa</span>
              ) : (
                <span className="text-zinc-600">⚪ Inactiva</span>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
              Run: {list.importRunId.slice(-8)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar modelo o marca..."
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 w-56"
        />

        {/* Type toggles */}
        <div className="flex items-center gap-1">
          {TIPO_FILTERS.map((f) => {
            const isActive = tipoFilter === f.key;
            const count = f.key === "all"
              ? (items?.length ?? 0)
              : (typeCounts.get(f.key) ?? 0);

            return (
              <button
                key={f.key}
                onClick={() => setTipoFilter(f.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {f.label}
                <span className="ml-1 tabular-nums text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500 text-left">
              <th className="py-2 px-3 font-medium">Producto</th>
              <th className="py-2 px-3 font-medium">Marca</th>
              <th className="py-2 px-3 font-medium w-16">Tipo</th>
              <th className="py-2 px-3 font-medium w-14">Lista</th>
              <th className="py-2 px-3 font-medium text-right w-28">Precio</th>
              <th className="py-2 px-3 font-medium w-10 text-center">/W</th>
              <th className="py-2 px-3 font-medium text-zinc-600">Original (PDF)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-600">
                  {search.trim()
                    ? "No se encontraron items para esta búsqueda"
                    : "No hay items en esta lista"}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                >
                  {/* Modelo */}
                  <td className="py-2 px-3">
                    <span className="text-zinc-200 font-mono text-xs">
                      {item.productoSnapshot.modelo}
                    </span>
                    {item.productoSnapshot.potencia && (
                      <span className="ml-1.5 text-zinc-600 text-[10px]">
                        {item.productoSnapshot.potencia}W
                      </span>
                    )}
                  </td>

                  {/* Marca */}
                  <td className="py-2 px-3 text-zinc-400">
                    {item.productoSnapshot.marca ?? "—"}
                  </td>

                  {/* Tipo */}
                  <td className="py-2 px-3">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${TABLE_COLOR[item.productoTable] ?? "text-zinc-500"}`}>
                      {TABLE_LABEL[item.productoTable] ?? item.productoTable}
                    </span>
                  </td>

                  {/* Lista (proveedor context for future multi-list) */}
                  <td className="py-2 px-3">
                    <span className="text-zinc-600 text-[10px]">
                      v{list.version}
                    </span>
                  </td>

                  {/* Precio */}
                  <td className="py-2 px-3 text-right">
                    <span className="text-zinc-200 tabular-nums font-medium">
                      {fmtPrice(item.precio, item.moneda, item.unidad)}
                    </span>
                    <span className="ml-1 text-zinc-600 text-[10px]">
                      {item.moneda}
                    </span>
                  </td>

                  {/* /W indicator */}
                  <td className="py-2 px-3 text-center">
                    {item.unidad === "por_watt" ? (
                      <span className="text-green-400/60">✓</span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>

                  {/* Original text */}
                  <td className="py-2 px-3">
                    <span className="text-zinc-600 truncate max-w-xs block text-[11px]" title={item.precioOriginalTexto}>
                      {item.precioOriginalTexto}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <p className="text-xs text-zinc-600">
        Mostrando {filtered.length} de {items.length} items
      </p>
    </div>
  );
}
