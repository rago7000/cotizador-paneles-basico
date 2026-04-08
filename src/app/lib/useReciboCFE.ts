"use client";

// ── useReciboCFE ───────────────────────────────────────────────────────────
// Encapsulates CFE receipt handling: upload, parsing, sizing derivation.
//
// State stays in useCotizacion (the reducer owns all persisted fields).
// This hook owns:
//   1. File upload + /api/leer-recibo call
//   2. PDF base64 encoding
//   3. Sizing derivation via calcularSizing()
//   4. Convenience setters for recibo-related UI
//   5. The hidden <input> ref for file uploads
//
// Auto-proposal (P75 → handleApplyProposal) is NOT owned here.
// Instead, the hook calls `onAutoProposal(panelsP75)` so page.tsx
// orchestrates the cascade.

import { useRef, type RefObject } from "react";
import type { CotizacionState, ReciboCFEData } from "./cotizacion-state";
import { calcularSizing, type SizingResult } from "./calc-costos";

// ── Types ──────────────────────────────────────────────────────────────────

type SetField = <K extends keyof CotizacionState>(field: K, value: CotizacionState[K]) => void;

export interface UseReciboCFEOptions {
  set: SetField;
  /** Current potencia (string from state) — used for sizing inside handleReciboCFE. */
  potencia: string;
  /** Whether to filter historico to last year only. */
  reciboUltimoAnio: boolean;
  /** Current cotización name — used to auto-fill from recibo nombre. */
  nombreCotizacion: string;
  /** Number of existing variantes — controls auto-proposal behavior. */
  variantesCount: number;
  /** Callback for auto-applying P75 proposal after recibo upload. */
  onAutoProposal: (panelsP75: number, shouldSaveBase: boolean) => void;
}

export interface UseReciboCFEReturn {
  /** Ref for the hidden file input — attach to <input ref={...} />. */
  reciboInputRef: RefObject<HTMLInputElement | null>;
  /** Trigger file picker programmatically. */
  triggerUpload: () => void;
  /** onChange handler for the file input. */
  handleReciboCFE: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useReciboCFE({
  set,
  potencia,
  reciboUltimoAnio,
  nombreCotizacion,
  variantesCount,
  onAutoProposal,
}: UseReciboCFEOptions): UseReciboCFEReturn {
  const reciboInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => reciboInputRef.current?.click();

  const handleReciboCFE = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    set("loadingRecibo", true);
    set("errorRecibo", "");

    try {
      // ── Upload + parse ─────────────────────────────────────────────────
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await fetch("/api/leer-recibo", { method: "POST", body: fd });
      const data: ReciboCFEData = await res.json();
      if ((data as unknown as { error?: string }).error) {
        throw new Error((data as unknown as { error: string }).error);
      }

      set("reciboCFE", data);

      // ── Encode PDF as base64 for persistence ───────────────────────────
      const reader = new FileReader();
      reader.onload = () => set("reciboPDFBase64", reader.result as string);
      reader.readAsDataURL(file);

      // ── Auto-fill nombre if empty ──────────────────────────────────────
      if (data.nombre && !nombreCotizacion.trim()) {
        set("nombreCotizacion", data.nombre);
      }

      // ── Calculate P75 sizing using shared function (no duplication) ────
      const pw = Number(potencia) || 545;
      const sizing = calcularSizing(data, pw, reciboUltimoAnio);

      if (sizing.panelesEquilibrado > 0) {
        const shouldSaveBase = variantesCount === 0;
        onAutoProposal(sizing.panelesEquilibrado, shouldSaveBase);
      }
    } catch (err: unknown) {
      set("errorRecibo", err instanceof Error ? err.message : "Error al procesar el recibo");
    } finally {
      set("loadingRecibo", false);
      if (reciboInputRef.current) reciboInputRef.current.value = "";
    }
  };

  return {
    reciboInputRef,
    triggerUpload,
    handleReciboCFE,
  };
}
