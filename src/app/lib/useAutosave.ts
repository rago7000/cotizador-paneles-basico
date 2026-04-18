"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { CotizacionData } from "./types";

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Autosaves cotización data to Convex with debounce.
 *
 * - Only saves when `nombre` is non-empty
 * - Skips save if serialized data hasn't changed since last save
 * - Debounces by `delay` ms (default 2000)
 * - Returns current status for UI feedback
 */
export function useAutosave({
  nombre,
  getFormData,
  save,
  delay = 2000,
  enabled = true,
}: {
  nombre: string;
  getFormData: () => CotizacionData;
  save: (nombre: string, data: CotizacionData) => Promise<void>;
  delay?: number;
  /** When false, no debounced save runs. markClean/resetSnapshot still work. */
  enabled?: boolean;
}) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const isMountedRef = useRef(true);

  // Track mounted state to avoid setState after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const doSave = useCallback(async () => {
    const trimmed = nombre.trim();
    if (!trimmed) return;

    const data = getFormData();
    // Compare without `fecha` (it changes on every call)
    const { fecha: _, ...rest } = data as unknown as Record<string, unknown>;
    const fingerprint = JSON.stringify(rest);

    // Skip if nothing changed since last save
    if (fingerprint === lastSavedRef.current) return;

    try {
      setStatus("saving");
      await save(trimmed, data);
      lastSavedRef.current = fingerprint;
      if (isMountedRef.current) {
        setStatus("saved");
        // Clear "saved" status after 2s
        setTimeout(() => {
          if (isMountedRef.current) setStatus("idle");
        }, 2000);
      }
    } catch {
      if (isMountedRef.current) setStatus("error");
    }
  }, [nombre, getFormData, save]);

  /**
   * Call after loading a cotización to set the baseline snapshot,
   * preventing an immediate autosave of unchanged data.
   */
  const markClean = useCallback((data: CotizacionData) => {
    const { fecha: _, ...rest } = data as unknown as Record<string, unknown>;
    lastSavedRef.current = JSON.stringify(rest);
  }, []);

  /** Reset last-saved snapshot (forces next change to save) */
  const resetSnapshot = useCallback(() => {
    lastSavedRef.current = "";
  }, []);

  // Trigger debounced save whenever doSave identity changes (i.e., when deps change)
  useEffect(() => {
    if (!enabled || !nombre.trim()) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSave();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [doSave, delay, nombre, enabled]);

  return { autosaveStatus: enabled ? status : "idle" as const, resetSnapshot, markClean };
}
