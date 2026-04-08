"use client";

// ── useTipoCambio ──────────────────────────────────────────────────────────
// Encapsulates exchange-rate fetching + handler wiring.
//
// State stays in useCotizacion (the reducer owns all persisted fields).
// This hook owns:
//   1. The fetch-on-mount side effect
//   2. Convenience setters for the TipoCambioWidget props
//
// Numeric resolution (tcLive → tcVal → tcPaneles/tcMicros) lives in
// normalizeState() and is NOT duplicated here.

import { useEffect } from "react";
import type { TipoCambioData } from "./types";
import type { CotizacionState } from "./cotizacion-state";

// ── Types ──────────────────────────────────────────────────────────────────

/** Matches useCotizacion's `set` signature exactly. */
type SetField = <K extends keyof CotizacionState>(field: K, value: CotizacionState[K]) => void;

/** Raw TC state fields read from the cotización reducer. */
export interface TipoCambioState {
  tc: TipoCambioData | null;
  tcError: string;
  tcFrozen: boolean;
  tcManual: boolean;
  tcSnapshotLocal: string;
  tcUsarManana: boolean;
  tcCustomPaneles: string;
  tcCustomMicros: string;
}

/** Everything the TipoCambioWidget and SectionPaneles/Micros need. */
export interface TipoCambioActions {
  onSetFrozen: (v: boolean) => void;
  onSetManual: (v: boolean) => void;
  onSetSnapshot: (v: string) => void;
  onSetUsarManana: (v: boolean) => void;
  onSetTcCustomPaneles: (v: string) => void;
  onSetTcCustomMicros: (v: string) => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useTipoCambio(
  set: SetField,
): TipoCambioActions {
  // ── Fetch on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((d) => (d.error ? set("tcError", d.error) : set("tc", d)))
      .catch(() => set("tcError", "No se pudo obtener el tipo de cambio"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // `set` is stable (from useReducer dispatch), safe to omit from deps.

  // ── Convenience setters (stable refs via set) ──────────────────────────
  return {
    onSetFrozen:          (v) => set("tcFrozen", v),
    onSetManual:          (v) => set("tcManual", v),
    onSetSnapshot:        (v) => set("tcSnapshotLocal", v),
    onSetUsarManana:      (v) => set("tcUsarManana", v),
    onSetTcCustomPaneles: (v) => set("tcCustomPaneles", v),
    onSetTcCustomMicros:  (v) => set("tcCustomMicros", v),
  };
}
