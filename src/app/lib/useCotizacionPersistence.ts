"use client";

// ── useCotizacionPersistence ───────────────────────────────────────────────
// Encapsulates all save/load/delete operations for cotizaciones and variants.
//
// No internal state. No side effects beyond what the passed functions do.
// State stays in useCotizacion; autosave stays in useAutosave.
//
// Responsibilities:
//   1. Save / load / delete cotización (Convex)
//   2. Build variant snapshots (deterministic, from state + calc)
//   3. Save / load / delete variants (Convex)
//   4. Generate variant PDFs (open in new window)

import { createElement } from "react";
import type { CotizacionState } from "./cotizacion-state";
import { uid } from "./cotizacion-state";
import type {
  CotizacionData,
  CatalogoPanel,
  CatalogoMicro,
  CotizacionCliente,
} from "./types";
import type { UseCotizacionCalculadaResult } from "./useCotizacionCalculada";
import { openPDFInNewWindow } from "./open-pdf";

// ── Types ──────────────────────────────────────────────────────────────────

type SetField = <K extends keyof CotizacionState>(field: K, value: CotizacionState[K]) => void;
type SetManyFields = (fields: Partial<CotizacionState>) => void;

// Lazy PDF component loaders (defined at module level in page.tsx, passed in)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFLoader = () => Promise<React.ComponentType<any>>;

export interface UseCotizacionPersistenceInput {
  // ── State access ──
  state: CotizacionState;

  // ── Reducer actions ──
  set: SetField;
  setMany: SetManyFields;
  loadCotizacion: (data: CotizacionData) => void;
  getFormData: () => CotizacionData;

  // ── Autosave integration ──
  markClean: (data: CotizacionData) => void;

  // ── Convex functions ──
  convexGuardarCotizacion: (nombre: string, data: CotizacionData) => Promise<unknown>;
  convexCargarCotizacion: (nombre: string) => CotizacionData | null;
  convexEliminarCotizacion: (nombre: string) => Promise<unknown>;
  convexGuardarCotizacionCliente: (args: {
    id?: string;
    cotizacionBase: string;
    nombre: string;
    fecha: string;
    data: unknown;
  }) => Promise<unknown>;
  convexEliminarCotizacionCliente: (id: string) => Promise<unknown>;

  // ── Catálogo (for panel/micro matching on load) ──
  catalogoPaneles: CatalogoPanel[];
  catalogoMicros: CatalogoMicro[];

  // ── Calculations (for variant snapshots) ──
  calc: UseCotizacionCalculadaResult;

  // ── Variantes (for PDF discount comparison) ──
  variantes: CotizacionCliente[];

  // ── PDF loaders (module-level lazy imports from page.tsx) ──
  loadCotizacionPDF: PDFLoader;
  loadCotizacionClientePDF: PDFLoader;
}

export interface UseCotizacionPersistenceReturn {
  handleGuardar: () => Promise<void>;
  handleCargar: (nombre: string) => void;
  handleEliminar: (nombre: string) => Promise<void>;
  handleDuplicar: (nombre: string) => Promise<void>;
  handleGuardarVariante: () => Promise<void>;
  handleEliminarVariante: (id: string) => Promise<void>;
  handleCargarVariante: (v: CotizacionCliente) => void;
  handleVerPDFVariante: (v: CotizacionCliente, tipo: "cliente" | "costos") => Promise<void>;
  buildVariantSnapshot: (nombre: string) => CotizacionCliente;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCotizacionPersistence({
  state: s,
  set,
  setMany,
  loadCotizacion,
  getFormData,
  markClean,
  convexGuardarCotizacion,
  convexCargarCotizacion,
  convexEliminarCotizacion,
  convexGuardarCotizacionCliente,
  convexEliminarCotizacionCliente,
  catalogoPaneles,
  catalogoMicros,
  calc,
  variantes,
  loadCotizacionPDF,
  loadCotizacionClientePDF,
}: UseCotizacionPersistenceInput): UseCotizacionPersistenceReturn {

  // ── Helpers (read from state + calc, fully deterministic) ──────────────

  const buildVariantSnapshot = (nombre: string): CotizacionCliente => ({
    id: uid(),
    cotizacionBase: s.cotizacionId,
    nombre,
    fecha: new Date().toISOString(),
    utilidad: { ...s.utilidad },
    costos: {
      paneles: calc.partidaPanelesMXN,
      inversores: calc.partidaInversoresMXN,
      estructura: calc.partidaEstructuraMXN,
      tornilleria: calc.partidaTornilleriaMXN,
      generales: calc.partidaGeneralesMXN,
      subtotal: calc.subtotalMXN,
      iva: calc.ivaMXN,
      total: calc.totalMXN,
      cantidadPaneles: calc.cantidadNum,
      potenciaW: calc.potenciaNum,
    },
    precios: {
      paneles: calc.clientePanelesMXN,
      inversores: calc.clienteInversoresMXN,
      estructura: calc.clienteEstructuraMXN,
      tornilleria: calc.clienteTornilleriaMXN,
      generales: calc.clienteGeneralesMXN,
      montoFijo: s.utilidad.montoFijo,
      subtotal: calc.clienteSubtotalMXN,
      iva: calc.clienteIvaMXN,
      total: calc.clienteTotalMXN,
      porPanel: calc.clientePorPanel,
      porWatt: calc.clientePorWatt,
      utilidadNeta: calc.utilidadNetaMXN,
      utilidadPct: calc.utilidadNetaPct,
    },
    notas: "",
    vigenciaDias: 15,
    stateSnapshot: getFormData(),
  });

  // ── Cotización CRUD ───────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!s.nombreCotizacion.trim()) {
      set("msgGuardado", "err");
      setTimeout(() => set("msgGuardado", ""), 2500);
      return;
    }
    await convexGuardarCotizacion(s.nombreCotizacion.trim(), getFormData());
    set("msgGuardado", "ok");
    setTimeout(() => set("msgGuardado", ""), 2500);
  };

  const handleCargar = (nombre: string) => {
    const data = convexCargarCotizacion(nombre);
    if (!data) return;

    // 1. Load all state from persisted data
    loadCotizacion(data);

    // 2. Mark autosave baseline so it won't re-save unchanged data
    markClean(data);

    // 3. Restore panel selection from catalog (by ID, then by price match)
    const savedPanelId = data.panelCatalogoId;
    const savedPotencia = Number(data.potencia) || 0;
    const savedPrecioW = Number(data.precioPorWatt) || 0;
    const matchPanel = savedPanelId
      ? catalogoPaneles.find((p) => p.id === savedPanelId)
      : null;
    if (matchPanel) {
      set("panelSeleccionado", matchPanel);
    } else if (savedPotencia > 0 && savedPrecioW > 0) {
      set("panelSeleccionado",
        catalogoPaneles.find((p) =>
          p.potencia === savedPotencia && Math.abs(p.precioPorWatt - savedPrecioW) < 0.001
        ) ?? null
      );
    } else {
      set("panelSeleccionado", null);
    }

    // 4. Restore micro selection from catalog (by ID, then by price match)
    const savedMicroId = data.microCatalogoId;
    const savedPrecioMicro = Number(data.precioMicroinversor) || 0;
    const savedPrecioCable = Number(data.precioCable) || 0;
    const matchMicro = savedMicroId
      ? catalogoMicros.find((m) => m.id === savedMicroId)
      : null;
    if (matchMicro) {
      set("microSeleccionado", matchMicro);
    } else if (savedPrecioMicro > 0) {
      set("microSeleccionado",
        catalogoMicros.find((m) =>
          Math.abs(m.precio - savedPrecioMicro) < 0.01 &&
          Math.abs(m.precioCable - savedPrecioCable) < 0.01
        ) ?? null
      );
    } else {
      set("microSeleccionado", null);
    }
  };

  const handleEliminar = async (nombre: string) => {
    await convexEliminarCotizacion(nombre);
  };

  const handleDuplicar = async (nombre: string) => {
    const data = convexCargarCotizacion(nombre);
    if (!data) return;
    let candidato = `${nombre} (copia)`;
    let n = 2;
    while (convexCargarCotizacion(candidato) !== null) {
      candidato = `${nombre} (copia ${n})`;
      n++;
    }
    await convexGuardarCotizacion(candidato, data);
  };

  // ── Variantes ─────────────────────────────────────────────────────────

  const handleGuardarVariante = async () => {
    if (!s.nombreCotizacion.trim() || !s.nombreVariante.trim() || calc.subtotalMXN <= 0) return;
    const c: CotizacionCliente = buildVariantSnapshot(s.nombreVariante);
    await convexGuardarCotizacionCliente({
      cotizacionBase: c.cotizacionBase,
      nombre: c.nombre,
      fecha: c.fecha,
      data: c,
    });
    set("nombreVariante", "");
    set("mostrarVariantes", true);
  };

  const handleEliminarVariante = async (id: string) => {
    await convexEliminarCotizacionCliente(id);
  };

  const handleCargarVariante = (v: CotizacionCliente) => {
    // Preserve current cotización identity before loading snapshot
    const currentCotizacionId = s.cotizacionId;
    const currentNombre = s.nombreCotizacion;

    if (v.stateSnapshot) {
      // Full restore: all parameters (panels, micros, structure, generales, etc.)
      loadCotizacion(v.stateSnapshot);

      // Restore panel/micro selection from catalog IDs in snapshot
      const restoredPanel = v.stateSnapshot.panelCatalogoId
        ? catalogoPaneles.find((p) => p.id === v.stateSnapshot!.panelCatalogoId) ?? null
        : null;
      const restoredMicro = v.stateSnapshot.microCatalogoId
        ? catalogoMicros.find((m) => m.id === v.stateSnapshot!.microCatalogoId) ?? null
        : null;

      setMany({
        // Keep current cotización identity (don't let snapshot change it)
        cotizacionId: currentCotizacionId,
        nombreCotizacion: currentNombre,
        // Restore catalog selections
        panelSeleccionado: restoredPanel,
        microSeleccionado: restoredMicro,
        utilidad: v.utilidad,
        mostrarPrecioCliente: true,
        mostrarVariantes: false,
        nombreVariante: "",
      });
    } else {
      // Legacy variants without snapshot: restore what we can
      setMany({
        cantidad: String(v.costos.cantidadPaneles),
        utilidad: v.utilidad,
        mostrarPrecioCliente: true,
        mostrarVariantes: false,
        nombreVariante: "",
      });
    }
  };

  // ── Variant PDF generation ────────────────────────────────────────────

  const handleVerPDFVariante = async (
    v: CotizacionCliente,
    tipo: "cliente" | "costos",
  ) => {
    if (tipo === "cliente") {
      const CotizacionClientePDF = await loadCotizacionClientePDF();
      // Find base variant for discount comparison
      const baseVariant = variantes.find(
        (vv) => vv.nombre === "Propuesta Base" && vv.cotizacionBase === v.cotizacionBase
      );
      const precioAnterior = baseVariant && baseVariant.id !== v.id
        ? baseVariant.precios.porPanel
        : undefined;

      const el = createElement(CotizacionClientePDF, {
        nombreCotizacion: `${s.nombreCotizacion} — ${v.nombre}`,
        clienteNombre: s.reciboCFE?.nombre || "",
        cantidadPaneles: v.costos.cantidadPaneles,
        potenciaW: v.costos.potenciaW,
        kWp: v.costos.cantidadPaneles * v.costos.potenciaW / 1000,
        generacionMensualKwh: v.costos.cantidadPaneles * v.costos.potenciaW / 1000 * 132,
        partidas: {
          paneles: v.precios.paneles, inversores: v.precios.inversores,
          estructura: v.precios.estructura, tornilleria: v.precios.tornilleria,
          generales: v.precios.generales, montoFijo: v.precios.montoFijo,
        },
        subtotal: v.precios.subtotal, iva: v.precios.iva, total: v.precios.total,
        porPanel: v.precios.porPanel, porWatt: v.precios.porWatt,
        vigenciaDias: 15, notas: "",
        precioAnteriorPorPanel: precioAnterior,
      });
      await openPDFInNewWindow(el);
    } else if (s.tc) {
      const CotizacionPDF = await loadCotizacionPDF();
      // NOTE: Number(x) || 0 left intentionally — will be cleaned in a future pass
      const el = createElement(CotizacionPDF, {
        nombreCotizacion: `${s.nombreCotizacion} — ${v.nombre} (Costos)`,
        cantidad: v.costos.cantidadPaneles, potencia: v.costos.potenciaW,
        precioPorWatt: Number(s.precioPorWatt) || 0,
        fletePaneles: Number(s.fletePaneles) || 0,
        garantiaPaneles: Number(s.garantiaPaneles) || 0,
        precioMicroinversor: Number(s.precioMicroinversor) || 0,
        precioCable: Number(s.precioCable) || 0,
        precioECU: Number(s.precioECU) || 0, incluyeECU: s.incluyeECU,
        precioHerramienta: Number(s.precioHerramienta) || 0,
        incluyeHerramienta: s.incluyeHerramienta,
        precioEndCap: Number(s.precioEndCap) || 0, incluyeEndCap: s.incluyeEndCap,
        fleteMicros: Number(s.fleteMicros) || 0,
        aluminio: s.aluminio, fleteAluminio: Number(s.fleteAluminio) || 0,
        tornilleria: s.tornilleria, generales: s.generales, tc: s.tc,
      });
      await openPDFInNewWindow(el);
    }
  };

  return {
    handleGuardar,
    handleCargar,
    handleEliminar,
    handleDuplicar,
    handleGuardarVariante,
    handleEliminarVariante,
    handleCargarVariante,
    handleVerPDFVariante,
    buildVariantSnapshot,
  };
}
