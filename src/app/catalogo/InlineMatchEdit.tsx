"use client";

// ── InlineMatchEdit ───────────────────────────────────────────────────────
// Inline product match editor for staging rows.
//
// Shows current match (if any) or "Sin match" placeholder.
// Click to open a searchable dropdown of canonical products.
// Selecting a product → resolution: "matched", confidence: "manual".
// Clearing the match → resolution: "pending".

import { useState, useRef, useEffect, useMemo } from "react";
import type { CanonicalProduct } from "../lib/import-utils";

interface InlineMatchEditProps {
  /** Currently matched product ID (if any) */
  matchedProductId: string | undefined;
  /** Currently matched product table */
  matchedProductTable: string | undefined;
  /** Confidence of the current match */
  matchConfidence: string | undefined;
  /** Current resolution */
  resolution: string;
  /** All canonical products for the dropdown */
  products: CanonicalProduct[];
  /** Row tipo — used to pre-filter dropdown (panel → productosPaneles, etc.) */
  rowTipo: string;
  /** Callback to save the match */
  onSave: (match: {
    matchedProductId: string;
    matchedProductTable: "productosPaneles" | "productosMicros" | "productosGenerales";
    matchConfidence: "manual";
    resolution: "matched";
  } | {
    matchedProductId: undefined;
    matchedProductTable: undefined;
    matchConfidence: undefined;
    resolution: "pending";
  }) => Promise<void>;
  /** Whether the cell is read-only */
  readOnly?: boolean;
}

// Map row tipo → product table for pre-filtering
const TIPO_TO_TABLE: Record<string, string> = {
  panel: "productosPaneles",
  micro: "productosMicros",
  general: "productosGenerales",
};

export default function InlineMatchEdit({
  matchedProductId,
  matchedProductTable,
  matchConfidence,
  resolution,
  products,
  rowTipo,
  onSave,
  readOnly,
}: InlineMatchEditProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find current matched product for display
  const currentProduct = useMemo(
    () => matchedProductId ? products.find((p) => p.id === matchedProductId) : null,
    [matchedProductId, products],
  );

  // Pre-filter by tipo, then search
  const filteredProducts = useMemo(() => {
    const preferredTable = TIPO_TO_TABLE[rowTipo];
    let filtered = products;

    // If searching, search all products; if not, filter by type
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = products.filter((p) =>
        p.modelo.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.aliases.some((a) => a.toLowerCase().includes(q))
      );
    } else if (preferredTable) {
      // Show preferred type first, then others
      const preferred = products.filter((p) => p.table === preferredTable);
      const others = products.filter((p) => p.table !== preferredTable);
      filtered = [...preferred, ...others];
    }

    return filtered.slice(0, 20); // Limit dropdown size
  }, [products, search, rowTipo]);

  // Focus input when opening
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = async (product: CanonicalProduct) => {
    setSaving(true);
    try {
      await onSave({
        matchedProductId: product.id,
        matchedProductTable: product.table,
        matchConfidence: "manual",
        resolution: "matched",
      });
      setOpen(false);
      setSearch("");
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave({
        matchedProductId: undefined,
        matchedProductTable: undefined,
        matchConfidence: undefined,
        resolution: "pending",
      });
      setOpen(false);
      setSearch("");
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  // ── Table label helper ──────────────────────────────────────────────

  const tableLabel = (table: string) => {
    if (table === "productosPaneles") return "Panel";
    if (table === "productosMicros") return "Micro";
    if (table === "productosGenerales") return "Gral";
    return "";
  };

  // ── Display mode ────────────────────────────────────────────────────

  if (!open) {
    return (
      <div
        className={`${readOnly ? "" : "cursor-pointer group"}`}
        onClick={() => { if (!readOnly) { setOpen(true); setSearch(""); } }}
      >
        {currentProduct ? (
          <div>
            <span className={`text-zinc-300 ${readOnly ? "" : "group-hover:text-amber-400 transition-colors"}`}>
              {currentProduct.marca} {currentProduct.modelo}
            </span>
            <span className="text-zinc-600 ml-1 text-[10px]">
              {tableLabel(currentProduct.table)}
            </span>
          </div>
        ) : matchedProductId ? (
          // Product exists in match but not found in current products list
          <span className={`text-zinc-400 ${readOnly ? "" : "group-hover:text-amber-400 transition-colors"}`}>
            {matchedProductTable?.replace("productos", "") ?? ""}
            <span className="text-zinc-500 ml-1 font-mono text-[10px]">{matchedProductId.slice(-6)}</span>
          </span>
        ) : (
          <span className={`italic ${readOnly ? "text-zinc-600" : "text-zinc-600 group-hover:text-amber-400 transition-colors"}`}>
            {readOnly ? "Sin match" : "Seleccionar..."}
          </span>
        )}
      </div>
    );
  }

  // ── Dropdown mode ─────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            // Select first result on Enter
            if (e.key === "Enter" && filteredProducts.length > 0) {
              handleSelect(filteredProducts[0]);
            }
          }}
          disabled={saving}
          placeholder="Buscar modelo o marca..."
          className="w-full rounded border border-amber-400/50 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 outline-none placeholder-zinc-600"
        />
        {matchedProductId && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="text-zinc-500 hover:text-red-400 text-xs shrink-0 transition-colors"
            title="Limpiar match"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown list */}
      <div className="absolute z-20 mt-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
        {filteredProducts.length === 0 ? (
          <div className="px-3 py-2 text-xs text-zinc-600">
            No se encontraron productos
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isSelected = p.id === matchedProductId;
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                disabled={saving}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors border-b border-zinc-800/50 last:border-0 ${
                  isSelected
                    ? "bg-amber-400/10 text-amber-400"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium">{p.marca}</span>{" "}
                    <span className="font-mono text-zinc-400">{p.modelo}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0">
                    {tableLabel(p.table)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
