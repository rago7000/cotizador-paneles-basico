"use client";

// ── InlinePriceEdit ───────────────────────────────────────────────────────
// Inline price editor for staging rows.
//
// Shows: original PDF text (read-only, gray) + editable normalized value.
// Validates: non-empty, positive number.
// On confirm: calls onSave with the new normalized price object.

import { useState, useRef, useEffect } from "react";

interface NormalizedPrice {
  valor: number;
  moneda: string;
  unidad: string;
  valorPorWatt?: number;
}

interface InlinePriceEditProps {
  /** Current normalized price (may be undefined if not yet parsed) */
  current: NormalizedPrice | undefined;
  /** Original price text from PDF (read-only reference) */
  originalText: string | undefined;
  /** Potencia in watts (for recalculating valorPorWatt) */
  potenciaW?: number;
  /** Callback to save the new price */
  onSave: (price: NormalizedPrice) => Promise<void>;
  /** Whether the cell is read-only */
  readOnly?: boolean;
}

export default function InlinePriceEdit({
  current,
  originalText,
  potenciaW,
  onSave,
  readOnly,
}: InlinePriceEditProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [moneda, setMoneda] = useState("USD");
  const [unidad, setUnidad] = useState("por_watt");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize form from current value when entering edit mode
  const startEdit = () => {
    if (readOnly) return;
    setValue(current?.valor?.toString() ?? "");
    setMoneda(current?.moneda ?? "USD");
    setUnidad(current?.unidad ?? "por_watt");
    setError("");
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const validate = (v: string): string | null => {
    if (!v.trim()) return "Precio requerido";
    const n = Number(v);
    if (!Number.isFinite(n)) return "No es un número válido";
    if (n <= 0) return "Debe ser mayor a 0";
    if (n > 100000) return "Valor sospechosamente alto";
    return null;
  };

  const handleSave = async () => {
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }

    const valor = Number(value);
    // valorPorWatt: solo calculable si tenemos los datos correctos.
    // Preferimos undefined a un valor incorrecto.
    let valorPorWatt: number | undefined;
    if (unidad === "por_watt" && moneda === "USD") {
      // Precio ya expresado en USD/W → directo
      valorPorWatt = valor;
    } else if (unidad === "por_pieza" && moneda === "USD" && potenciaW && potenciaW > 0) {
      // Precio por pieza en USD → dividir entre watts
      valorPorWatt = valor / potenciaW;
    }
    // Si moneda es MXN o no hay potenciaW → undefined (no podemos calcular USD/W sin tipo de cambio)

    setSaving(true);
    try {
      await onSave({ valor, moneda, unidad, valorPorWatt });
      setEditing(false);
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  // ── Display mode ────────────────────────────────────────────────────

  if (!editing) {
    const fmtValue = current
      ? `${current.moneda === "MXN" ? "$" : "US$"}${current.valor.toFixed(current.unidad === "por_watt" ? 3 : 2)}${current.unidad === "por_watt" ? "/W" : ""}`
      : "—";

    const isWarning = current && (current.valor <= 0);

    return (
      <div
        className={`text-right ${readOnly ? "" : "cursor-pointer group"}`}
        onClick={startEdit}
      >
        <span className={`tabular-nums ${isWarning ? "text-red-400" : "text-zinc-200"} ${readOnly ? "" : "group-hover:text-amber-400 transition-colors"}`}>
          {fmtValue}
        </span>
        {originalText && (
          <p className="text-zinc-600 text-[10px]">{originalText}</p>
        )}
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────

  return (
    <div className="space-y-1.5">
      {/* Original text (read-only reference) */}
      {originalText && (
        <p className="text-zinc-600 text-[10px] text-right">
          PDF: {originalText}
        </p>
      )}

      {/* Value input */}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className={`w-20 rounded border px-1.5 py-1 text-xs text-right text-zinc-100 bg-zinc-800 outline-none transition ${
            error ? "border-red-400" : "border-zinc-600 focus:border-amber-400"
          }`}
          placeholder="0.185"
        />

        {/* Currency toggle */}
        <select
          value={moneda}
          onChange={(e) => setMoneda(e.target.value)}
          disabled={saving}
          className="rounded border border-zinc-600 bg-zinc-800 px-1 py-1 text-[10px] text-zinc-400 outline-none"
        >
          <option value="USD">USD</option>
          <option value="MXN">MXN</option>
        </select>

        {/* Unit toggle */}
        <select
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          disabled={saving}
          className="rounded border border-zinc-600 bg-zinc-800 px-1 py-1 text-[10px] text-zinc-400 outline-none"
        >
          <option value="por_watt">/W</option>
          <option value="por_pieza">pza</option>
        </select>
      </div>

      {/* Error / actions */}
      <div className="flex items-center justify-end gap-1.5">
        {error && <span className="text-[10px] text-red-400">{error}</span>}
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
        >
          Esc
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[10px] text-amber-400 hover:text-amber-300 font-medium px-1"
        >
          {saving ? "..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
