"use client";

import { useEffect, useRef, useMemo, useState, createElement } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AppNav from "./AppNav";
import {
  useConvexCotizaciones,
  useConvexCatalogo,
  mejorOferta as mejorOfertaHelper,
} from "../lib/useConvexCatalogo";
import type {
  CotizacionData,
  CotizacionGuardada,
  LineItem,
  CatalogoPanel,
  CatalogoMicro,
  CotizacionCliente,
} from "../lib/types";
import { calculateStructure } from "../lib/structure";
import { calculateElectrical, listProfiles } from "../lib/electrical";
import { useCotizacion } from "../lib/useCotizacion";
import { useAutosave } from "../lib/useAutosave";
import { uid, UTILIDAD_DEFAULT } from "../lib/cotizacion-state";
import { fmt, CollapseAllContext } from "./primitives";
import { generateArrangements } from "../lib/structure/generate-arrangements";
import { syncGeneralesFromElectrical } from "../lib/sync-generales";
import { autoSelectPanel, analyzePanelRecommendations } from "../lib/auto-select-panel";
import { openPDFInNewWindow } from "../lib/open-pdf";
import { useTipoCambio } from "../lib/useTipoCambio";
import { useReciboCFE } from "../lib/useReciboCFE";
import { useCotizacionCalculada, type UseCotizacionCalculadaResult } from "../lib/useCotizacionCalculada";
import { useCotizacionPersistence } from "../lib/useCotizacionPersistence";
import type { CatalogoPanelConPrecio, OfertaSimple } from "../lib/auto-select-panel";

import ReciboCFEBanner from "./ReciboCFEBanner";
import PanelCliente from "./PanelCliente";
import ChatCotizacion from "./ChatCotizacion";
import SectionPaneles from "./SectionPaneles";
import SectionMicroinversores from "./SectionMicroinversores";
import SectionEstructura from "./SectionEstructura";
import SectionLineItems from "./SectionLineItems";
import ConfigEmpresaModal from "./ConfigEmpresaModal";
import SectionGenerales from "./SectionGenerales";
import TipoCambioWidget from "./TipoCambioWidget";
import ResumenSidebar from "./ResumenSidebar";
import PrecioClienteWidget from "./PrecioClienteWidget";
import ComparadorVariantes from "./ComparadorVariantes";
import PickerPaneles from "./PickerPaneles";
import PickerMicros from "./PickerMicros";
import MisCotizacionesModal from "./MisCotizacionesModal";

const loadCotizacionPDF = () => import("./CotizacionPDF").then((m) => m.default);
const loadCotizacionClientePDF = () => import("./CotizacionClientePDF").then((m) => m.default);

type AluminioItem = LineItem;
type GeneralItem = LineItem;

// ── Calc snapshot exposed to parent for delta sidebar ──────────────────────
export interface CalcSnapshot {
  nombre: string;
  cantidadNum: number;
  potenciaNum: number;
  kWpSistema: number;
  partidaPanelesMXN: number;
  partidaInversoresMXN: number;
  partidaEstructuraMXN: number;
  partidaTornilleriaMXN: number;
  partidaGeneralesMXN: number;
  subtotalMXN: number;
  totalMXN: number;
  costoPorPanel: number;
  clienteSubtotalMXN: number;
  clienteTotalMXN: number;
  clientePorPanel: number;
  clientePorWatt: number;
  utilidadNetaMXN: number;
  utilidadNetaPct: number;
  roiMeses: number;
  roiAnios: number;
}

function makeCalcSnapshot(nombre: string, calc: UseCotizacionCalculadaResult): CalcSnapshot {
  return {
    nombre,
    cantidadNum: calc.cantidadNum,
    potenciaNum: calc.potenciaNum,
    kWpSistema: calc.kWpSistema,
    partidaPanelesMXN: calc.partidaPanelesMXN,
    partidaInversoresMXN: calc.partidaInversoresMXN,
    partidaEstructuraMXN: calc.partidaEstructuraMXN,
    partidaTornilleriaMXN: calc.partidaTornilleriaMXN,
    partidaGeneralesMXN: calc.partidaGeneralesMXN,
    subtotalMXN: calc.subtotalMXN,
    totalMXN: calc.totalMXN,
    costoPorPanel: calc.costoPorPanel,
    clienteSubtotalMXN: calc.clienteSubtotalMXN,
    clienteTotalMXN: calc.clienteTotalMXN,
    clientePorPanel: calc.clientePorPanel,
    clientePorWatt: calc.clientePorWatt,
    utilidadNetaMXN: calc.utilidadNetaMXN,
    utilidadNetaPct: calc.utilidadNetaPct,
    roiMeses: calc.roiMeses,
    roiAnios: calc.roiAnios,
  };
}

// ── Props ──────────────────────────────────────────────────────────────────
export interface CotizadorWorkspaceProps {
  /** Render mode. "single" preserves current full-header look. */
  mode?: "single" | "primary" | "secondary";
  /** When false, skips debounced autosave to Convex. */
  enableAutosave?: boolean;
  /** When true, hides right ResumenSidebar (used in split mode). */
  compactSidebar?: boolean;
  /** Optional initial load applied once on mount. */
  initialLoad?:
    | { kind: "cotizacion"; nombre: string }
    | { kind: "variante"; variante: CotizacionCliente }
    | null;
  /** Notifies parent of calc snapshot changes (for delta sidebar). */
  onCalcChange?: (calc: CalcSnapshot) => void;
  /** Close handler — only meaningful for mode="secondary". */
  onClose?: () => void;
  /** Trigger compare flow — only meaningful for mode="single". */
  onRequestCompare?: () => void;
  /** External collapse counter (split mode). When provided, drives section collapse. */
  externalCollapseCounter?: number;
}

export default function CotizadorWorkspace({
  mode = "single",
  enableAutosave = true,
  compactSidebar = false,
  initialLoad = null,
  onCalcChange,
  onClose,
  onRequestCompare,
  externalCollapseCounter,
}: CotizadorWorkspaceProps) {
  // ── Convex hooks (deduped by Convex client across instances) ────────────
  const {
    cotizaciones: convexCotizaciones,
    guardarCotizacion: convexGuardarCotizacion,
    cargarCotizacion: convexCargarCotizacion,
    eliminarCotizacion: convexEliminarCotizacion,
    guardarCotizacionCliente: convexGuardarCotizacionCliente,
    eliminarCotizacionCliente: convexEliminarCotizacionCliente,
  } = useConvexCotizaciones();

  const configEmpresa = useQuery(api.configEmpresa.get);
  const [showConfigEmpresa, setShowConfigEmpresa] = useState(false);

  const {
    paneles: convexPaneles,
    micros: convexMicros,
    ofertas: convexOfertas,
    isLoading: catalogoLoading,
    guardarProductoPanel: convexGuardarProductoPanel,
    guardarProductoMicro: convexGuardarProductoMicro,
  } = useConvexCatalogo();

  // ── Cotización state (single reducer per workspace) ─────────────────────
  const {
    state: s,
    set,
    setMany,
    loadCotizacion,
    updateLineItem,
    addMinisplit,
    removeMinisplit,
    updateMinisplit,
    getFormData,
  } = useCotizacion();

  // ── Tipo de cambio (fetch + setters) ─────────────────────────────────────
  const tcActions = useTipoCambio(set);

  // ── Autosave (only enabled in primary/single) ────────────────────────────
  const { autosaveStatus, markClean } = useAutosave({
    nombre: s.nombreCotizacion,
    getFormData,
    save: convexGuardarCotizacion,
    enabled: enableAutosave,
  });

  const {
    cantidad, potencia, precioPorWatt, fletePaneles, garantiaPaneles,
    precioMicroinversor, precioCable, precioECU, incluyeECU,
    precioHerramienta, incluyeHerramienta,
    precioEndCap, incluyeEndCap, fleteMicros,
    aluminio, fleteAluminio, structureRows, showStructure,
    electricalProfileId, showElectrical,
    structureMode, autoArrangements,
    tornilleria, generales,
    tc, tcError, tcFrozen, tcManual, tcSnapshotLocal, tcUsarManana,
    tcCustomPaneles, tcCustomMicros,
    cotizacionId, nombreCotizacion, mostrarGuardadas, msgGuardado,
    pickerPanel, pickerMicro, pickerSearch, pickerMarca, pickerOrden,
    sugerirGuardarPanel, sugerirGuardarMicro,
    panelSeleccionado, microSeleccionado,
    reciboCFE, loadingRecibo, errorRecibo, reciboDetalle,
    reciboUltimoAnio,
    minisplits, minisplitTemporada,
    mostrarPrecioCliente, utilidad,
    nombreVariante, mostrarVariantes, mostrarComparador,
    clienteTelefono, clienteEmail, clienteUbicacion, clienteNotas,
    etapa, etapaNotas, fechaCierre, fechaInstalacion, probabilidadCierre,
    origen, origenDetalle, tags,
  } = s;

  // Local-only collapse counter when no parent callback (single mode self-managed)
  const [localCollapseCounter, setLocalCollapseCounter] = useState(0);
  const [precioClienteExpanded, setPrecioClienteExpanded] = useState(false);

  // ── Derived data from Convex ──────────────────────────────────────────────
  const cotizacionesGuardadas = useMemo<CotizacionGuardada[]>(() => {
    return convexCotizaciones.map((c) => ({
      nombre: c.nombre,
      fecha: c.fecha ?? "",
      data: (convexCargarCotizacion(c.nombre) ?? {} as CotizacionData),
    }));
  }, [convexCotizaciones, convexCargarCotizacion]);

  const clienteHistorial = useMemo(() => {
    const clienteNombre = reciboCFE?.nombre?.trim();
    if (!clienteNombre || convexCotizaciones.length === 0) return null;

    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const tokens = (s: string) => normalize(s).split(/\s+/).filter(Boolean).sort();

    const clienteNorm = normalize(clienteNombre);
    const clienteTokens = tokens(clienteNombre);

    const exactas: { nombre: string; fecha: string }[] = [];
    const similares: { nombre: string; fecha: string; razon: string }[] = [];

    for (const c of convexCotizaciones) {
      const nombre = c.nombre?.trim();
      if (!nombre) continue;
      const norm = normalize(nombre);

      if (norm === clienteNorm) {
        exactas.push({ nombre, fecha: c.fecha ?? "" });
        continue;
      }

      const cTokens = tokens(nombre);
      const shared = clienteTokens.filter((t) => cTokens.includes(t));
      const minLen = Math.min(clienteTokens.length, cTokens.length);
      if (minLen >= 2 && shared.length >= minLen) {
        similares.push({ nombre, fecha: c.fecha ?? "", razon: "mismo nombre, diferente orden" });
        continue;
      }

      if (minLen >= 2 && shared.length >= minLen - 1 && shared.length >= 2) {
        similares.push({ nombre, fecha: c.fecha ?? "", razon: "nombre similar" });
      }
    }

    if (exactas.length === 0 && similares.length === 0) return null;
    return { exactas, similares };
  }, [reciboCFE?.nombre, convexCotizaciones]);

  const catalogoPaneles = useMemo<CatalogoPanel[]>(() => {
    return convexPaneles
      .map((p) => {
        const best = mejorOfertaHelper(p.id, convexOfertas);
        if (!best) return null;
        const ofertasProducto = convexOfertas.filter((o) => o.productoId === p.id);
        return {
          id: `v2_${p.id}`,
          marca: p.marca, modelo: p.modelo, potencia: p.potencia,
          precioPorWatt: best.precio, notas: best.notas || "",
          fechaActualizacion: best.fecha,
          totalOfertas: ofertasProducto.length,
        } as CatalogoPanel;
      })
      .filter((x): x is CatalogoPanel => x !== null);
  }, [convexPaneles, convexOfertas]);

  const catalogoMicros = useMemo<CatalogoMicro[]>(() => {
    return convexMicros
      .map((m) => {
        const best = mejorOfertaHelper(m.id, convexOfertas);
        if (!best) return null;
        const ofertasProducto = convexOfertas.filter((o) => o.productoId === m.id);
        return {
          id: `v2_${m.id}`,
          marca: m.marca, modelo: m.modelo,
          precio: best.precio, precioCable: best.precioCable || 0,
          panelesPorUnidad: m.panelesPorUnidad, notas: best.notas || "",
          fechaActualizacion: best.fecha,
          totalOfertas: ofertasProducto.length,
        } as CatalogoMicro;
      })
      .filter((x): x is CatalogoMicro => x !== null);
  }, [convexMicros, convexOfertas]);

  const rawVariantesById = useQuery(
    api.cotizaciones.listCliente,
    cotizacionId ? { cotizacionBase: cotizacionId } : "skip"
  );
  const rawVariantesByName = useQuery(
    api.cotizaciones.listCliente,
    nombreCotizacion.trim() ? { cotizacionBase: nombreCotizacion.trim() } : "skip"
  );
  const variantes = useMemo<CotizacionCliente[]>(() => {
    const seen = new Set<string>();
    const result: CotizacionCliente[] = [];
    for (const raw of [rawVariantesById, rawVariantesByName]) {
      if (!raw) continue;
      for (const v of raw) {
        if (seen.has(v._id as string)) continue;
        seen.add(v._id as string);
        try {
          const parsed = JSON.parse(v.data);
          result.push({ ...parsed, id: v._id as string } as CotizacionCliente);
        } catch { /* skip */ }
      }
    }
    return result;
  }, [rawVariantesById, rawVariantesByName]);

  // ── Picker filtered lists ─────────────────────────────────────────────────
  const pq = pickerSearch.toLowerCase().trim();
  const pickerMarcasPaneles = useMemo(() => [...new Set(catalogoPaneles.map((p) => p.marca))].sort(), [catalogoPaneles]);
  const pickerMarcasMicros = useMemo(() => [...new Set(catalogoMicros.map((m) => m.marca))].sort(), [catalogoMicros]);

  const pickerPanelesFiltrados = useMemo(() => {
    let list = catalogoPaneles.filter((p) => {
      if (pq && !`${p.marca} ${p.modelo}`.toLowerCase().includes(pq)) return false;
      if (pickerMarca && p.marca !== pickerMarca) return false;
      return true;
    });
    if (pickerOrden === "potencia") list = [...list].sort((a, b) => b.potencia - a.potencia);
    else if (pickerOrden === "precio") list = [...list].sort((a, b) => a.precioPorWatt - b.precioPorWatt);
    else list = [...list].sort((a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`));
    return list;
  }, [catalogoPaneles, pq, pickerMarca, pickerOrden]);

  const pickerMicrosFiltrados = useMemo(() => {
    const list = catalogoMicros.filter((m) => {
      if (pq && !`${m.marca} ${m.modelo}`.toLowerCase().includes(pq)) return false;
      if (pickerMarca && m.marca !== pickerMarca) return false;
      return true;
    });
    return list.sort((a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`));
  }, [catalogoMicros, pq, pickerMarca]);

  // ── All calculations ─────────────────────────────────────────────────────
  const calc = useCotizacionCalculada({
    state: s,
    utilidad,
    structureRows,
    electricalProfileId,
  });
  const {
    cantidadNum, potenciaNum, precioNum,
    fletePanelesNum, garantiaPanelesNum,
    precioMicroNum, precioCableNum, precioECUNum,
    precioHerramientaNum, precioEndCapNum, fleteMicrosNum, fleteAluminioNum,
    panelesPorMicro, cantidadMicros,
    costoPanel, costoPanelesUSD,
    costoMicrosUSD, costoCablesUSD, costoECUUSD, costoHerramientaUSD, costoEndCapUSD,
    tcLive, tcVal, tcPaneles, tcMicros,
    partidaPanelesMXN, partidaInversoresMXN, partidaEstructuraMXN,
    partidaTornilleriaMXN, partidaGeneralesMXN,
    subtotalMXN, ivaMXN, totalMXN,
    totalPanelesUSD, totalInversoresUSD, costoPorPanel, fleteAluminioSinIVA,
    clientePanelesMXN, clienteInversoresMXN, clienteEstructuraMXN,
    clienteTornilleriaMXN, clienteGeneralesMXN,
    clienteSubtotalMXN, clienteIvaMXN, clienteTotalMXN,
    utilidadNetaMXN, utilidadNetaPct, clientePorPanel, clientePorWatt,
    kWpSistema, generacionMensualKwh, costoCFEporKwh,
    ahorroMensualMXN, ahorroAnualMXN, roiMeses, roiAnios,
    consumoMensualCFE, consumoMensualCalc,
    panelesPromedio, kWpPromedio, panelesEquilibrado, kWpEquilibrado,
    panelesMax, kWpMax, consumoP75, consumoMensualMax, maxHistKwh,
    panelesSugeridosCFE, kWpSugerido, historicoFiltrado,
    minisplitKwhMes, minisplitKwhMesProm,
    consumoConIncremento, panelesConIncremento, kWpConIncremento,
    structureResult, electricalResult,
  } = calc;

  // ── Notify parent of calc changes (for delta sidebar) ──
  useEffect(() => {
    if (!onCalcChange) return;
    onCalcChange(makeCalcSnapshot(nombreCotizacion, calc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nombreCotizacion, cantidadNum, potenciaNum, kWpSistema,
    partidaPanelesMXN, partidaInversoresMXN, partidaEstructuraMXN,
    partidaTornilleriaMXN, partidaGeneralesMXN,
    subtotalMXN, totalMXN, costoPorPanel,
    clienteSubtotalMXN, clienteTotalMXN, clientePorPanel, clientePorWatt,
    utilidadNetaMXN, utilidadNetaPct, roiMeses, roiAnios,
  ]);

  // ── Persistence ──────────────────────────────────────────────────────────
  const persistence = useCotizacionPersistence({
    state: s, set, setMany, loadCotizacion, getFormData, markClean,
    convexGuardarCotizacion, convexCargarCotizacion, convexEliminarCotizacion,
    convexGuardarCotizacionCliente, convexEliminarCotizacionCliente,
    catalogoPaneles, catalogoMicros, calc, variantes,
    loadCotizacionPDF, loadCotizacionClientePDF,
  });
  const {
    handleGuardar, handleCargar, handleEliminar, handleDuplicar,
    handleGuardarVariante, handleEliminarVariante, handleCargarVariante,
    handleVerPDFVariante,
  } = persistence;

  // ── Hydration tracking (block auto-select until initial load processed) ──
  const initialLoadProcessed = useRef(initialLoad === null);

  // ── Apply initialLoad once on mount or when key changes ──
  const lastInitialLoadKey = useRef<string | null>(null);
  useEffect(() => {
    if (!initialLoad) {
      initialLoadProcessed.current = true;
      return;
    }
    const key =
      initialLoad.kind === "cotizacion"
        ? `c:${initialLoad.nombre}`
        : `v:${initialLoad.variante.id}`;
    if (lastInitialLoadKey.current === key) return;
    lastInitialLoadKey.current = key;

    if (initialLoad.kind === "cotizacion") {
      handleCargar(initialLoad.nombre);
    } else {
      handleCargarVariante(initialLoad.variante);
    }
    initialLoadProcessed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoad]);

  // ── Auto-sync generales when panel count or electrical result changes ────
  const prevSyncKey = useRef("");
  useEffect(() => {
    if (!electricalResult || cantidadNum <= 0) return;
    const syncKey = `${cantidadNum}-${electricalResult.totalCircuitos}-${electricalResult.breakerResumen.map(b => `${b.amperaje}x${b.cantidad}`).join(",")}`;
    if (syncKey === prevSyncKey.current) return;
    prevSyncKey.current = syncKey;
    const synced = syncGeneralesFromElectrical(electricalResult, generales, cantidadNum);
    set("generales", synced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electricalResult, cantidadNum]);

  // ── Auto-select micro (skip in secondary until hydrated) ────────────────
  const autoSelectedMicro = useRef(false);
  useEffect(() => {
    if (mode === "secondary" && !initialLoadProcessed.current) return;
    if (autoSelectedMicro.current || catalogoMicros.length === 0 || precioMicroinversor) return;
    const ds3d = catalogoMicros.find((m) => /ds3d|ds3-d/i.test(m.modelo));
    if (ds3d) {
      set("precioMicroinversor", String(ds3d.precio));
      set("precioCable", String(ds3d.precioCable));
      set("microSeleccionado", ds3d);
      autoSelectedMicro.current = true;
    }
  }, [catalogoMicros, precioMicroinversor, mode]);

  // ── Auto-select panel (skip in secondary until hydrated) ────────────────
  const autoSelectedPanel = useRef(false);
  useEffect(() => {
    if (mode === "secondary" && !initialLoadProcessed.current) return;
    if (autoSelectedPanel.current || catalogoPaneles.length === 0 || precioPorWatt) return;
    const defaultPanel = convexPaneles.find((p) => p.esDefault);
    if (defaultPanel) {
      const match = catalogoPaneles.find((cp) => cp.id === `v2_${defaultPanel._id}`);
      if (match) {
        setMany({ potencia: String(match.potencia), precioPorWatt: String(match.precioPorWatt), panelSeleccionado: match });
        autoSelectedPanel.current = true;
        return;
      }
    }
    const panelConPrecio: CatalogoPanelConPrecio[] = catalogoPaneles.map((p) => ({
      id: p.id, marca: p.marca, modelo: p.modelo, potencia: p.potencia,
      precioWatt: p.precioPorWatt, precio: p.precioPorWatt * p.potencia,
    }));
    const best = autoSelectPanel(panelConPrecio);
    if (best) {
      const match = catalogoPaneles.find((p) => p.id === best.id);
      if (match) {
        setMany({ potencia: String(match.potencia), precioPorWatt: String(match.precioPorWatt), panelSeleccionado: match });
        autoSelectedPanel.current = true;
      }
    }
  }, [catalogoPaneles, convexPaneles, precioPorWatt, mode]);

  const defaultPanelCatalogo = useMemo(() => {
    const dp = convexPaneles.find((p) => p.esDefault);
    if (!dp) return null;
    return catalogoPaneles.find((cp) => cp.id === `v2_${dp._id}`) ?? null;
  }, [convexPaneles, catalogoPaneles]);

  // ── Auto-proposals after first recibo (only in primary/single) ──────────
  const autoProposalPhase = useRef<"idle" | "save-base" | "save-opt">("idle");
  const basePortPanelRef = useRef(0);
  const basePanelCountRef = useRef(0);

  useEffect(() => {
    if (mode === "secondary") return; // sandbox: no auto-proposals
    if (autoProposalPhase.current === "idle") return;
    if (subtotalMXN <= 0 || !nombreCotizacion.trim()) return;

    if (autoProposalPhase.current === "save-base") {
      if (variantes.some((v) => v.nombre === "Propuesta Base")) {
        autoProposalPhase.current = "idle";
        return;
      }
      const base = persistence.buildVariantSnapshot("Propuesta Base");
      basePortPanelRef.current = base.precios.porPanel;
      basePanelCountRef.current = cantidadNum;
      convexGuardarCotizacionCliente({
        cotizacionBase: base.cotizacionBase, nombre: base.nombre, fecha: base.fecha, data: base,
      });

      const cap = cantidadMicros * panelesPorMicro;
      if (cantidadNum > 0 && cap > cantidadNum) {
        autoProposalPhase.current = "save-opt";
        handleApplyProposal(cap);
      } else {
        autoProposalPhase.current = "idle";
        set("mostrarVariantes", true);
      }
    } else if (autoProposalPhase.current === "save-opt") {
      const opt = persistence.buildVariantSnapshot("Propuesta Optimizada");
      if (basePortPanelRef.current > 0) {
        const descuento = ((basePortPanelRef.current - opt.precios.porPanel) / basePortPanelRef.current * 100).toFixed(0);
        opt.notas = `Descuento: -${descuento}% por panel vs Base ($${fmt(basePortPanelRef.current)} → $${fmt(opt.precios.porPanel)})`;
      }
      convexGuardarCotizacionCliente({
        cotizacionBase: opt.cotizacionBase, nombre: opt.nombre, fecha: opt.fecha, data: opt,
      });
      autoProposalPhase.current = "idle";
      handleApplyProposal(basePanelCountRef.current);
      set("mostrarVariantes", true);
      set("mostrarPrecioCliente", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalMXN, cantidadNum, mode]);

  // ── Apply proposal cascade ──────────────────────────────────────────────
  const handleApplyProposal = (cantidadPaneles: number) => {
    const updates: Record<string, unknown> = { cantidad: String(cantidadPaneles) };

    if (!panelSeleccionado && catalogoPaneles.length > 0) {
      const panelConPrecio: CatalogoPanelConPrecio[] = catalogoPaneles.map((p) => ({
        id: p.id, marca: p.marca, modelo: p.modelo, potencia: p.potencia,
        precioWatt: p.precioPorWatt, precio: p.precioPorWatt * p.potencia,
      }));
      const best = autoSelectPanel(panelConPrecio);
      if (best) {
        const match = catalogoPaneles.find((p) => p.id === best.id);
        if (match) {
          updates.potencia = String(match.potencia);
          updates.precioPorWatt = String(match.precioPorWatt);
          updates.panelSeleccionado = match;
          autoSelectedPanel.current = true;
        }
      }
    }

    const arrangements = generateArrangements(cantidadPaneles);
    if (arrangements) {
      const modeChosen = structureMode === "manual" ? "optimo" : structureMode;
      const chosen = modeChosen === "optimo" ? arrangements.optimo : arrangements.conservador;
      updates.autoArrangements = arrangements;
      updates.structureMode = modeChosen;
      updates.structureRows = chosen.rows;
      updates.showStructure = true;

      const structResult = calculateStructure(chosen.rows);
      if (structResult.totals.totalPaneles > 0) {
        const t = structResult.totals;
        updates.aluminio = [
          { id: uid(), nombre: "Angulo - 1 1/2 X 1 1/2 X 0.1875\" (3/16)", cantidad: String(t.totalAngulosCompra + t.totalAngulosContraflambeoCompra), precioUnitario: "700.94", unidad: "Pza" },
          { id: uid(), nombre: "Unicanal - PARA PANEL SOLAR GRANDE", cantidad: String(t.totalUnicanalesCompra), precioUnitario: "839.34", unidad: "Pza" },
          { id: uid(), nombre: "Clip - PARA PANEL SOLAR", cantidad: String(t.clipsConDesperdicio), precioUnitario: "41.58", unidad: "Pza" },
        ];
      }
    }

    const ppMicro = microSeleccionado?.panelesPorUnidad ?? 4;
    const microCount = cantidadPaneles > 0 ? Math.ceil(cantidadPaneles / ppMicro) : 0;
    if (microCount > 0) {
      const elecResult = calculateElectrical({
        equipmentProfileId: electricalProfileId,
        cantidadEquipos: microCount,
        cantidadPaneles: cantidadPaneles,
      });
      const syncedGenerales = syncGeneralesFromElectrical(elecResult, generales, cantidadPaneles);
      updates.generales = syncedGenerales;
    }

    setMany(updates as Partial<typeof s>);
  };

  // ── Recibo CFE ────────────────────────────────────────────────────────────
  const { reciboInputRef, triggerUpload, handleReciboCFE } = useReciboCFE({
    set,
    potencia,
    reciboUltimoAnio,
    nombreCotizacion,
    variantesCount: variantes.length,
    onAutoProposal: (panelsP75, shouldSaveBase) => {
      if (mode === "secondary") return; // no proposals in sandbox
      if (shouldSaveBase) {
        autoProposalPhase.current = "save-base";
        set("utilidad", { ...UTILIDAD_DEFAULT });
      }
      setTimeout(() => handleApplyProposal(panelsP75), 0);
    },
  });

  // ── Misc handlers ─────────────────────────────────────────────────────────
  const updateAluminio = (i: number, f: keyof AluminioItem, v: string) => updateLineItem("aluminio", i, f, v);
  const updateTornilleria = (i: number, f: keyof LineItem, v: string) => updateLineItem("tornilleria", i, f, v);
  const updateGeneral = (i: number, f: keyof GeneralItem, v: string) => updateLineItem("generales", i, f, v);

  const seleccionarPanel = (p: CatalogoPanel) => {
    setMany({ potencia: String(p.potencia), precioPorWatt: String(p.precioPorWatt), panelSeleccionado: p, pickerPanel: false, sugerirGuardarPanel: false });
  };
  const seleccionarMicro = (m: CatalogoMicro) => {
    setMany({ precioMicroinversor: String(m.precio), precioCable: String(m.precioCable), microSeleccionado: m, pickerMicro: false, sugerirGuardarMicro: false });
  };

  const guardarPanelEnCatalogo = async (marca: string, modelo: string) => {
    await convexGuardarProductoPanel({ marca, modelo, potencia: potenciaNum });
    set("sugerirGuardarPanel", false);
  };
  const guardarMicroEnCatalogo = async (marca: string, modelo: string) => {
    await convexGuardarProductoMicro({ marca, modelo, panelesPorUnidad: 4 });
    set("sugerirGuardarMicro", false);
  };

  const panelRecommendations = useMemo(() => {
    if (catalogoPaneles.length === 0) return null;
    const panelConPrecio: CatalogoPanelConPrecio[] = catalogoPaneles.map((p) => ({
      id: p.id, marca: p.marca, modelo: p.modelo, potencia: p.potencia,
      precioWatt: p.precioPorWatt, precio: p.precioPorWatt * p.potencia,
    }));
    const ofertasSimple: OfertaSimple[] = convexOfertas.map((o) => ({
      productoId: o.productoId,
      precio: o.precio,
      precioTiers: o.precioTiers,
    }));
    const microP = Number(precioMicroinversor) || 180;
    return analyzePanelRecommendations(panelConPrecio, ofertasSimple, microP, panelesPorMicro);
  }, [catalogoPaneles, convexOfertas, precioMicroinversor, panelesPorMicro]);

  const handleSelectPanelById = (panelId: string) => {
    const match = catalogoPaneles.find((p) => p.id === panelId);
    if (match) {
      setMany({
        potencia: String(match.potencia),
        precioPorWatt: String(match.precioPorWatt),
        panelSeleccionado: match,
        sugerirGuardarPanel: false,
      });
    }
  };

  // ── Save-as for secondary mode (prompts for new name) ──
  const handleGuardarComo = async () => {
    const nuevoNombre = window.prompt("Guardar como…", nombreCotizacion || "Sin nombre");
    if (!nuevoNombre || !nuevoNombre.trim()) return;
    set("nombreCotizacion", nuevoNombre.trim());
    // Defer save to next tick so the new name is in state
    setTimeout(async () => {
      const data = getFormData();
      await convexGuardarCotizacion(nuevoNombre.trim(), { ...data, nombre: nuevoNombre.trim() });
      markClean({ ...data, nombre: nuevoNombre.trim() });
    }, 0);
  };

  const effectiveCollapseCounter = externalCollapseCounter ?? localCollapseCounter;

  // When external counter changes (parent triggered Hide all), reset per-workspace UI
  const lastExternalCounter = useRef(externalCollapseCounter);
  useEffect(() => {
    if (externalCollapseCounter === undefined) return;
    if (externalCollapseCounter === lastExternalCounter.current) return;
    lastExternalCounter.current = externalCollapseCounter;
    set("mostrarPrecioCliente", false);
    set("reciboDetalle", false);
    setPrecioClienteExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCollapseCounter]);

  const triggerCollapseAll = () => {
    setLocalCollapseCounter((c) => c + 1);
    set("mostrarPrecioCliente", false);
    set("reciboDetalle", false);
    setPrecioClienteExpanded(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (catalogoLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm animate-pulse">Cargando datos del catálogo...</p>
      </div>
    );
  }

  // Determine wrapper depending on mode
  const isCompact = mode !== "single";

  const headerNode = mode === "single" ? (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl">☀️</span>
          <span className="hidden sm:block text-sm font-semibold text-zinc-100 tracking-tight">Cotizador Solar</span>
        </div>
        <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
        <AppNav />
        <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

        <input
          type="text" value={nombreCotizacion}
          onChange={(e) => set("nombreCotizacion", e.target.value)}
          placeholder="Nombre de la cotización…"
          className="flex-1 min-w-0 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
        />

        {msgGuardado === "ok" && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-400 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Guardado
          </span>
        )}
        {msgGuardado === "err" && <span className="hidden sm:block text-xs text-red-400 shrink-0">Pon un nombre</span>}
        {!msgGuardado && autosaveStatus === "saving" && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 shrink-0 animate-pulse">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Guardando…
          </span>
        )}
        {!msgGuardado && autosaveStatus === "saved" && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Auto-guardado
          </span>
        )}
        {!msgGuardado && autosaveStatus === "error" && (
          <span className="hidden sm:block text-xs text-red-400/70 shrink-0">Error al auto-guardar</span>
        )}

        <button
          onClick={triggerCollapseAll}
          title="Ocultar todo"
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
          <span className="hidden sm:inline">Ocultar</span>
        </button>

        <button onClick={handleGuardar} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          <span className="hidden sm:inline">Guardar</span>
        </button>

        <button onClick={() => set("mostrarGuardadas", true)} className="shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          <span className="hidden sm:inline">Mis cotizaciones</span>
          {cotizacionesGuardadas.length > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-300">{cotizacionesGuardadas.length}</span>
          )}
        </button>

        {onRequestCompare && (
          <button
            onClick={onRequestCompare}
            title="Comparar otra cotización lado a lado"
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/5 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-400/10 hover:border-violet-400/50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v10M16 7v10M4 5h16M4 19h16" /></svg>
            <span className="hidden sm:inline">Comparar lado a lado</span>
          </button>
        )}
      </div>
    </header>
  ) : (
    // Compact toolbar for primary/secondary in split mode
    <div className={`border-b border-zinc-800 px-3 py-2 flex items-center gap-2 ${mode === "secondary" ? "bg-emerald-950/20" : "bg-amber-950/20"}`}>
      <span className={`text-[10px] uppercase tracking-wider font-semibold shrink-0 ${mode === "secondary" ? "text-emerald-400" : "text-amber-400"}`}>
        {mode === "secondary" ? "Sandbox" : "Primario"}
      </span>
      <input
        type="text" value={nombreCotizacion}
        onChange={(e) => set("nombreCotizacion", e.target.value)}
        placeholder="Nombre…"
        className="flex-1 min-w-0 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400"
      />
      {mode === "primary" && msgGuardado === "ok" && (
        <span className="text-[10px] text-emerald-400 shrink-0">Guardado</span>
      )}
      {mode === "primary" && !msgGuardado && autosaveStatus === "saving" && (
        <span className="text-[10px] text-zinc-500 shrink-0 animate-pulse">Guardando…</span>
      )}
      {mode === "primary" && !msgGuardado && autosaveStatus === "saved" && (
        <span className="text-[10px] text-zinc-500 shrink-0">Auto-guardado</span>
      )}
      <button
        onClick={() => set("mostrarGuardadas", true)}
        title={mode === "secondary" ? "Cargar otra cotización en este panel" : "Mis cotizaciones"}
        className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
      >
        {mode === "secondary" ? "Cargar otra…" : "Mis cot."}
      </button>
      {mode === "primary" && (
        <button
          onClick={handleGuardar}
          className="shrink-0 rounded-md bg-amber-400 px-2 py-1 text-[11px] font-semibold text-zinc-900 hover:bg-amber-300"
        >
          Guardar
        </button>
      )}
      {mode === "secondary" && (
        <>
          <button
            onClick={handleGuardarComo}
            className="shrink-0 rounded-md bg-emerald-400 px-2 py-1 text-[11px] font-semibold text-zinc-900 hover:bg-emerald-300"
          >
            Guardar como…
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Cerrar comparación"
              className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </>
      )}
    </div>
  );

  const wrapperClass = isCompact
    ? "bg-zinc-950 text-zinc-100 font-sans rounded-2xl border border-zinc-800 overflow-hidden min-w-0"
    : "min-h-screen bg-zinc-950 text-zinc-100 font-sans";

  const mainClass = isCompact
    ? "px-3 py-3"
    : "mx-auto max-w-7xl px-4 sm:px-6 py-8";

  const gridClass = compactSidebar
    ? "space-y-4 min-w-0"
    : "grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6";

  return (
    <CollapseAllContext.Provider value={effectiveCollapseCounter}>
    <div className={wrapperClass}>
      {headerNode}

      <main className={mainClass}>
        {compactSidebar ? (
          <div className={gridClass}>
            {renderLeftSections()}
          </div>
        ) : (
          <div className={gridClass}>
            {renderLeftSections()}
            <div className="space-y-4">
              {renderRightSidebar()}
            </div>
          </div>
        )}

        {mostrarComparador && variantes.length >= 2 && (
          <ComparadorVariantes
            variantes={variantes}
            onClose={() => set("mostrarComparador", false)}
          />
        )}
      </main>

      {/* Modals (per-workspace) */}
      <ConfigEmpresaModal open={showConfigEmpresa} onClose={() => setShowConfigEmpresa(false)} />

      <PickerPaneles
        open={pickerPanel} catalogoPaneles={catalogoPaneles}
        pickerPanelesFiltrados={pickerPanelesFiltrados}
        pickerSearch={pickerSearch} pickerMarca={pickerMarca}
        pickerOrden={pickerOrden} pickerMarcasPaneles={pickerMarcasPaneles}
        onClose={() => { set("pickerPanel", false); set("pickerSearch", ""); set("pickerMarca", ""); }}
        onSelect={(p) => { seleccionarPanel(p); set("pickerSearch", ""); set("pickerMarca", ""); }}
        onSetSearch={(v) => set("pickerSearch", v)}
        onSetMarca={(v) => set("pickerMarca", v)}
        onSetOrden={(v) => set("pickerOrden", v)}
      />

      <PickerMicros
        open={pickerMicro} catalogoMicros={catalogoMicros}
        pickerMicrosFiltrados={pickerMicrosFiltrados}
        pickerSearch={pickerSearch} pickerMarca={pickerMarca}
        pickerMarcasMicros={pickerMarcasMicros}
        onClose={() => { set("pickerMicro", false); set("pickerSearch", ""); set("pickerMarca", ""); }}
        onSelect={(m) => { seleccionarMicro(m); set("pickerSearch", ""); set("pickerMarca", ""); }}
        onSetSearch={(v) => set("pickerSearch", v)}
        onSetMarca={(v) => set("pickerMarca", v)}
      />

      <MisCotizacionesModal
        open={mostrarGuardadas} cotizaciones={cotizacionesGuardadas}
        onClose={() => set("mostrarGuardadas", false)}
        onCargar={handleCargar} onEliminar={handleEliminar} onDuplicar={handleDuplicar}
      />

      {/* AI Chat — only in single mode (avoid duplicating chat UI in split) */}
      {mode === "single" && (
        <ChatCotizacion cotizacion={{
          proyecto: nombreCotizacion || "(sin nombre)",
          etapa: etapa || "prospecto",
          cliente: {
            telefono: clienteTelefono || undefined,
            email: clienteEmail || undefined,
            ubicacion: clienteUbicacion || undefined,
            notas: clienteNotas || undefined,
          },
          origen: origen || undefined,
          panel: panelSeleccionado
            ? { marca: panelSeleccionado.marca, modelo: panelSeleccionado.modelo, potenciaW: panelSeleccionado.potencia, precioPorWattUSD: panelSeleccionado.precioPorWatt }
            : { potenciaW: potenciaNum, precioPorWattUSD: precioNum },
          cantidadPaneles: cantidadNum,
          potenciaTotalW: cantidadNum * potenciaNum,
          potenciaTotalkWp: kWpSistema,
          microinversor: microSeleccionado
            ? { marca: microSeleccionado.marca, modelo: microSeleccionado.modelo, panelesPorUnidad: microSeleccionado.panelesPorUnidad, precioUnitarioUSD: microSeleccionado.precio, precioCableUSD: microSeleccionado.precioCable }
            : { panelesPorUnidad: 4, precioUnitarioUSD: precioMicroNum, precioCableUSD: precioCableNum },
          cantidadMicros,
          relacionPanelMicro: `${panelesPorMicro}:1 (${panelesPorMicro} paneles por micro → ${cantidadNum} paneles = ${cantidadMicros} micros)`,
          accesorios: {
            ecuMonitoreo: incluyeECU ? { precioUSD: precioECUNum, cantidad: 1 } : "no incluido",
            herramienta: incluyeHerramienta ? { precioUSD: precioHerramientaNum } : "no incluida",
            endCaps: incluyeEndCap ? { precioUnitarioUSD: precioEndCapNum, cantidad: cantidadMicros } : "no incluidos",
          },
          costos: {
            tipoCambio: { panelesUSDaMXN: tcPaneles, microsUSDaMXN: tcMicros },
            paneles: {
              unitarioUSD: costoPanel,
              totalUSD: costoPanelesUSD,
              fleteUSD: fletePanelesNum,
              garantiaUSD: garantiaPanelesNum,
              totalConFleteUSD: totalPanelesUSD,
              totalMXN: partidaPanelesMXN,
            },
            inversores: {
              microsUSD: costoMicrosUSD,
              cablesUSD: costoCablesUSD,
              ecuUSD: costoECUUSD,
              herramientaUSD: costoHerramientaUSD,
              endCapsUSD: costoEndCapUSD,
              fleteUSD: fleteMicrosNum,
              totalUSD: totalInversoresUSD,
              totalMXN: partidaInversoresMXN,
            },
            estructuraMXN: partidaEstructuraMXN,
            tornilleriaMXN: partidaTornilleriaMXN,
            generalesMXN: partidaGeneralesMXN,
            subtotalMXN,
            ivaMXN,
            totalMXN,
            costoPorPanelMXN: costoPorPanel,
          },
          precioCliente: mostrarPrecioCliente ? {
            markupTipo: utilidad.tipo,
            markupPorcentaje: utilidad.tipo === "global" ? utilidad.globalPct : { paneles: utilidad.panelesPct, inversores: utilidad.inversoresPct, estructura: utilidad.estructuraPct, tornilleria: utilidad.tornilleriaPct, generales: utilidad.generalesPct },
            montoFijoMXN: utilidad.montoFijo,
            subtotalMXN: clienteSubtotalMXN,
            ivaMXN: clienteIvaMXN,
            totalMXN: clienteTotalMXN,
            porPanelMXN: clientePorPanel,
            porWattMXN: clientePorWatt,
            utilidadNetaMXN,
            utilidadNetaPct: Math.round(utilidadNetaPct * 10) / 10,
          } : "no configurado",
          reciboCFE: reciboCFE ? {
            titular: reciboCFE.nombre,
            tarifa: reciboCFE.tarifa,
            consumoActualKwh: reciboCFE.consumoKwh,
            consumoMensualPromedioKwh: consumoMensualCalc,
            totalFacturadoMXN: reciboCFE.totalFacturado,
            costoPorKwh: Math.round(costoCFEporKwh * 100) / 100,
            historicoBimestral: reciboCFE.historico?.map((h: { periodo: string; kwh: number; importe: number }) => `${h.periodo}: ${h.kwh} kWh ($${h.importe})`),
          } : "sin recibo",
          minisplits: minisplits.length > 0 ? {
            equipos: minisplits.map((m) => `${m.cantidad}x ${m.toneladas} ton ${m.tipo} (${m.horasDia}h/día)`),
            temporada: minisplitTemporada,
            consumoAdicionalKwhMes: minisplitKwhMesProm,
          } : "sin minisplits",
          roi: reciboCFE && ahorroMensualMXN > 0 ? {
            generacionMensualKwh: Math.round(generacionMensualKwh),
            ahorroMensualMXN: Math.round(ahorroMensualMXN),
            ahorroAnualMXN: Math.round(ahorroAnualMXN),
            paybackMeses: Math.round(roiMeses),
            paybackAnios: Math.round(roiAnios * 10) / 10,
          } : "sin datos de recibo para calcular",
          sizing: reciboCFE ? {
            panelesRecomendadoPromedio: panelesPromedio,
            panelesActual: cantidadNum,
            cobertura: consumoMensualCalc > 0 ? `${Math.round(generacionMensualKwh / consumoMensualCalc * 100)}%` : "N/A",
          } : "sin datos de recibo",
          electrico: electricalResult ? {
            perfilEquipo: electricalResult.perfil.nombre,
            tipoEquipo: electricalResult.perfil.tipo,
            amperajePorUnidad: electricalResult.perfil.amperajeACPorUnidad,
            maxPorCircuito: electricalResult.perfil.maxUnidadesPorCircuito,
            toleranciaNEC: `${(electricalResult.perfil.toleranciaBreaker * 100)}%`,
            totalCircuitos: electricalResult.totalCircuitos,
            circuitos: electricalResult.circuitos.map((c) => ({
              numero: c.circuitoNumero,
              equipos: c.unidadesEnCircuito,
              amperajeA: Math.round(c.amperajeCircuito * 10) / 10,
              amperajeConToleranciaA: Math.round(c.amperajeConTolerancia * 10) / 10,
              breakerA: c.breakerSeleccionado,
              cable: c.tipoCable,
            })),
            breakerResumen: electricalResult.breakerResumen.map((b) => `${b.cantidad}x pastilla ${b.amperaje}A`),
            cables: electricalResult.cableACResumen.map((c) => `${c.circuitos} circuito(s): ${c.tipo}`),
            tierraFisica: electricalResult.tierraFisica ? `${electricalResult.tierraFisica.calibreAWG} AWG` : undefined,
            warnings: electricalResult.warnings.length > 0 ? electricalResult.warnings : undefined,
            stringConfig: electricalResult.stringConfig?.map((sc) => ({
              mppt: sc.mpptNumero,
              strings: sc.stringsEnMPPT,
              panelesPorString: sc.panelesPorString,
            })),
            desconectorDC: electricalResult.desconectorDC,
          } : "sin cálculo eléctrico",
        }} />
      )}
    </div>
    </CollapseAllContext.Provider>
  );

  // ── Render helpers ──────────────────────────────────────────────────────
  function renderLeftSections() {
    return (
      <div className="space-y-4 min-w-0">
        <input ref={reciboInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleReciboCFE} />
        <ReciboCFEBanner
          reciboCFE={reciboCFE} reciboDetalle={reciboDetalle}
          onSetReciboDetalle={(v) => set("reciboDetalle", v)}
          loadingRecibo={loadingRecibo} errorRecibo={errorRecibo}
          reciboUltimoAnio={reciboUltimoAnio}
          onSetReciboUltimoAnio={(v) => set("reciboUltimoAnio", v)}
          potencia={potencia} minisplits={minisplits}
          minisplitTemporada={minisplitTemporada as "anual" | "temporada"}
          onAddMinisplit={addMinisplit} onRemoveMinisplit={removeMinisplit}
          onUpdateMinisplit={updateMinisplit}
          onSetMinisplitTemporada={(v) => set("minisplitTemporada", v)}
          onUploadClick={triggerUpload}
          onSetReciboCFE={(v) => set("reciboCFE", v)}
          onSetCantidad={(v) => set("cantidad", v)}
          onApplyProposal={handleApplyProposal}
          consumoMensualCFE={consumoMensualCFE} kWpSugerido={kWpSugerido}
          panelesSugeridosCFE={panelesSugeridosCFE}
          consumoMensualCalc={consumoMensualCalc}
          panelesPromedio={panelesPromedio} panelesEquilibrado={panelesEquilibrado}
          panelesMax={panelesMax} panelesConIncremento={panelesConIncremento}
          kWpPromedio={kWpPromedio} kWpEquilibrado={kWpEquilibrado}
          kWpMax={kWpMax} kWpConIncremento={kWpConIncremento}
          consumoP75={consumoP75} consumoMensualMax={consumoMensualMax}
          maxHistKwh={maxHistKwh} minisplitKwhMes={minisplitKwhMes}
          minisplitKwhMesProm={minisplitKwhMesProm}
          consumoConIncremento={consumoConIncremento}
          historicoFiltrado={historicoFiltrado}
          clienteHistorial={clienteHistorial}
          onCargarCotizacion={handleCargar}
        />

        <PanelCliente
          nombreCliente={reciboCFE?.nombre || nombreCotizacion}
          clienteTelefono={clienteTelefono}
          clienteEmail={clienteEmail}
          clienteUbicacion={clienteUbicacion}
          clienteNotas={clienteNotas}
          etapa={etapa}
          etapaNotas={etapaNotas}
          fechaCierre={fechaCierre}
          fechaInstalacion={fechaInstalacion}
          probabilidadCierre={probabilidadCierre}
          origen={origen}
          origenDetalle={origenDetalle}
          tags={tags}
          onChange={(field, value) => set(field as keyof typeof s, value)}
        />

        <SectionPaneles
          catalogoPaneles={catalogoPaneles} panelSeleccionado={panelSeleccionado}
          onOpenPicker={() => set("pickerPanel", true)}
          onClearSeleccion={() => { set("panelSeleccionado", null); set("sugerirGuardarPanel", true); }}
          onSelectPanel={handleSelectPanelById}
          recommendations={panelRecommendations}
          defaultPanel={defaultPanelCatalogo}
          cantidad={cantidad} potencia={potencia} precioPorWatt={precioPorWatt}
          fletePaneles={fletePaneles} garantiaPaneles={garantiaPaneles}
          tcCustomPaneles={tcCustomPaneles}
          onSetCantidad={(v) => set("cantidad", v)}
          onSetPotencia={(v) => { set("potencia", v); if (v) { set("sugerirGuardarPanel", true); set("panelSeleccionado", null); } }}
          onSetPrecioPorWatt={(v) => { set("precioPorWatt", v); if (v) { set("sugerirGuardarPanel", true); set("panelSeleccionado", null); } }}
          onSetFletePaneles={(v) => set("fletePaneles", v)}
          onSetGarantiaPaneles={(v) => set("garantiaPaneles", v)}
          onSetTcCustomPaneles={tcActions.onSetTcCustomPaneles}
          sugerirGuardarPanel={sugerirGuardarPanel}
          onGuardarPanel={guardarPanelEnCatalogo}
          onDismissGuardarPanel={() => set("sugerirGuardarPanel", false)}
          tcVal={tcVal} partidaPanelesMXN={partidaPanelesMXN}
          cantidadNum={cantidadNum} potenciaNum={potenciaNum} precioNum={precioNum}
          costoPanel={costoPanel} costoPanelesUSD={costoPanelesUSD}
          fletePanelesNum={fletePanelesNum} garantiaPanelesNum={garantiaPanelesNum}
          totalPanelesUSD={totalPanelesUSD}
        />

        <SectionMicroinversores
          catalogoMicros={catalogoMicros} microSeleccionado={microSeleccionado}
          onOpenPicker={() => set("pickerMicro", true)}
          onClearSeleccion={() => { set("microSeleccionado", null); set("sugerirGuardarMicro", true); }}
          precioMicroinversor={precioMicroinversor} precioCable={precioCable}
          precioECU={precioECU} incluyeECU={incluyeECU}
          precioHerramienta={precioHerramienta} incluyeHerramienta={incluyeHerramienta}
          precioEndCap={precioEndCap} incluyeEndCap={incluyeEndCap}
          fleteMicros={fleteMicros} tcCustomMicros={tcCustomMicros}
          onSetPrecioMicroinversor={(v) => { set("precioMicroinversor", v); if (v) { set("sugerirGuardarMicro", true); set("microSeleccionado", null); } }}
          onSetPrecioCable={(v) => { set("precioCable", v); if (v) { set("sugerirGuardarMicro", true); set("microSeleccionado", null); } }}
          onSetPrecioECU={(v) => set("precioECU", v)}
          onSetIncluyeECU={(v) => set("incluyeECU", v)}
          onSetPrecioHerramienta={(v) => set("precioHerramienta", v)}
          onSetIncluyeHerramienta={(v) => set("incluyeHerramienta", v)}
          onSetPrecioEndCap={(v) => set("precioEndCap", v)}
          onSetIncluyeEndCap={(v) => set("incluyeEndCap", v)}
          onSetFleteMicros={(v) => set("fleteMicros", v)}
          onSetTcCustomMicros={tcActions.onSetTcCustomMicros}
          sugerirGuardarMicro={sugerirGuardarMicro}
          onGuardarMicro={guardarMicroEnCatalogo}
          onDismissGuardarMicro={() => set("sugerirGuardarMicro", false)}
          tcVal={tcVal} partidaInversoresMXN={partidaInversoresMXN}
          cantidadNum={cantidadNum} cantidadMicros={cantidadMicros}
          panelesPorMicro={panelesPorMicro}
          precioMicroNum={precioMicroNum} precioCableNum={precioCableNum}
          precioECUNum={precioECUNum} precioHerramientaNum={precioHerramientaNum}
          precioEndCapNum={precioEndCapNum}
          fleteMicrosNum={fleteMicrosNum}
          costoMicrosUSD={costoMicrosUSD} costoCablesUSD={costoCablesUSD}
          costoECUUSD={costoECUUSD} costoHerramientaUSD={costoHerramientaUSD}
          costoEndCapUSD={costoEndCapUSD}
          totalInversoresUSD={totalInversoresUSD}
          showElectrical={showElectrical}
          onSetShowElectrical={(v) => set("showElectrical", v)}
          electricalProfileId={electricalProfileId}
          onSetElectricalProfileId={(v) => set("electricalProfileId", v)}
          electricalProfiles={listProfiles()}
          electricalResult={electricalResult}
        />

        <SectionEstructura
          aluminio={aluminio} onChangeAluminio={updateAluminio}
          fleteAluminio={fleteAluminio}
          onSetFleteAluminio={(v) => set("fleteAluminio", v)}
          showStructure={showStructure}
          onSetShowStructure={(v) => set("showStructure", v)}
          structureRows={structureRows}
          onSetStructureRows={(rows) => { set("structureRows", rows); set("structureMode", "manual"); }}
          structureResult={structureResult}
          partidaEstructuraMXN={partidaEstructuraMXN}
          fleteAluminioSinIVA={fleteAluminioSinIVA}
          structureMode={structureMode}
          autoArrangements={autoArrangements}
          onSetStructureMode={(modeArg) => {
            set("structureMode", modeArg);
            if (modeArg !== "manual" && autoArrangements) {
              const chosen = modeArg === "optimo" ? autoArrangements.optimo : autoArrangements.conservador;
              set("structureRows", chosen.rows);
              const structResult = calculateStructure(chosen.rows);
              if (structResult.totals.totalPaneles > 0) {
                const t = structResult.totals;
                set("aluminio", [
                  { id: uid(), nombre: "Angulo - 1 1/2 X 1 1/2 X 0.1875\" (3/16)", cantidad: String(t.totalAngulosCompra + t.totalAngulosContraflambeoCompra), precioUnitario: "700.94", unidad: "Pza" },
                  { id: uid(), nombre: "Unicanal - PARA PANEL SOLAR GRANDE", cantidad: String(t.totalUnicanalesCompra), precioUnitario: "839.34", unidad: "Pza" },
                  { id: uid(), nombre: "Clip - PARA PANEL SOLAR", cantidad: String(t.clipsConDesperdicio), precioUnitario: "41.58", unidad: "Pza" },
                ]);
              }
            }
          }}
        />

        <SectionLineItems
          num="4" title="Tornillería" items={tornilleria}
          onChange={updateTornilleria} partidaMXN={partidaTornilleriaMXN}
        />

        <SectionGenerales
          items={generales}
          onChange={updateGeneral}
          partidaMXN={partidaGeneralesMXN}
        />
      </div>
    );
  }

  function renderRightSidebar() {
    return (
      <>
        <TipoCambioWidget
          tc={tc} tcError={tcError} tcFrozen={tcFrozen} tcManual={tcManual}
          tcUsarManana={tcUsarManana} tcSnapshotLocal={tcSnapshotLocal}
          tcLive={tcLive} tcVal={tcVal}
          onSetFrozen={tcActions.onSetFrozen}
          onSetManual={tcActions.onSetManual}
          onSetSnapshot={tcActions.onSetSnapshot}
          onSetUsarManana={tcActions.onSetUsarManana}
        />

        <ResumenSidebar
          partidaPanelesMXN={partidaPanelesMXN}
          partidaInversoresMXN={partidaInversoresMXN}
          partidaEstructuraMXN={partidaEstructuraMXN}
          partidaTornilleriaMXN={partidaTornilleriaMXN}
          partidaGeneralesMXN={partidaGeneralesMXN}
          subtotalMXN={subtotalMXN} ivaMXN={ivaMXN} totalMXN={totalMXN}
          costoPorPanel={costoPorPanel} cantidadNum={cantidadNum}
          panelSeleccionado={panelSeleccionado}
          microSeleccionado={microSeleccionado}
          cantidadMicros={cantidadMicros}
          panelesPorMicro={panelesPorMicro}
          onApplyProposal={handleApplyProposal}
        />

        <PrecioClienteWidget
          mostrarPrecioCliente={mostrarPrecioCliente}
          onSetMostrarPrecioCliente={(v) => set("mostrarPrecioCliente", v)}
          subtotalMXN={subtotalMXN} totalMXN={totalMXN}
          utilidad={utilidad}
          onSetUtilidad={(u) => set("utilidad", u)}
          partidaPanelesMXN={partidaPanelesMXN}
          partidaInversoresMXN={partidaInversoresMXN}
          partidaEstructuraMXN={partidaEstructuraMXN}
          partidaTornilleriaMXN={partidaTornilleriaMXN}
          partidaGeneralesMXN={partidaGeneralesMXN}
          clientePanelesMXN={clientePanelesMXN}
          clienteInversoresMXN={clienteInversoresMXN}
          clienteEstructuraMXN={clienteEstructuraMXN}
          clienteTornilleriaMXN={clienteTornilleriaMXN}
          clienteGeneralesMXN={clienteGeneralesMXN}
          clienteSubtotalMXN={clienteSubtotalMXN}
          clienteIvaMXN={clienteIvaMXN} clienteTotalMXN={clienteTotalMXN}
          clientePorPanel={clientePorPanel} clientePorWatt={clientePorWatt}
          utilidadNetaMXN={utilidadNetaMXN} utilidadNetaPct={utilidadNetaPct}
          cantidadNum={cantidadNum} potenciaNum={potenciaNum}
          kWpSistema={kWpSistema}
          roiAnios={roiAnios} roiMeses={roiMeses}
          ahorroMensualMXN={ahorroMensualMXN} ahorroAnualMXN={ahorroAnualMXN}
          costoCFEporKwh={costoCFEporKwh}
          generacionMensualKwh={generacionMensualKwh}
          reciboCFEExists={!!reciboCFE}
          nombreCotizacion={nombreCotizacion}
          nombreVariante={nombreVariante}
          onSetNombreVariante={(v) => set("nombreVariante", v)}
          variantes={variantes}
          mostrarVariantes={mostrarVariantes}
          onSetMostrarVariantes={(v) => set("mostrarVariantes", v)}
          mostrarComparador={mostrarComparador}
          onSetMostrarComparador={(v) => set("mostrarComparador", v)}
          onGuardarVariante={handleGuardarVariante}
          onEliminarVariante={handleEliminarVariante}
          onCargarVariante={handleCargarVariante}
          onVerPDFVariante={handleVerPDFVariante}
          panelRecommendations={panelRecommendations}
          panelSeleccionado={panelSeleccionado}
          defaultPanel={defaultPanelCatalogo}
          onSelectPanel={handleSelectPanelById}
          onApplyProposal={handleApplyProposal}
          cantidadMicros={cantidadMicros}
          panelesPorMicro={panelesPorMicro}
          panelesPromedio={panelesPromedio}
          panelesEquilibrado={panelesEquilibrado}
          panelesMax={panelesMax}
          panelesConIncremento={panelesConIncremento}
          reciboUltimoAnio={reciboUltimoAnio}
          onSetReciboUltimoAnio={(v) => set("reciboUltimoAnio", v)}
          expanded={precioClienteExpanded}
          onSetExpanded={setPrecioClienteExpanded}
        />

        <div className="space-y-2">
          <button
            onClick={async () => {
              if (!tc) return;
              const CotizacionPDF = await loadCotizacionPDF();
              await openPDFInNewWindow(createElement(CotizacionPDF, {
                nombreCotizacion, cantidad: cantidadNum,
                potencia: potenciaNum, precioPorWatt: precioNum,
                fletePaneles: fletePanelesNum, garantiaPaneles: garantiaPanelesNum,
                precioMicroinversor: precioMicroNum, precioCable: precioCableNum,
                precioECU: precioECUNum, incluyeECU,
                precioHerramienta: precioHerramientaNum, incluyeHerramienta,
                precioEndCap: precioEndCapNum, incluyeEndCap,
                fleteMicros: fleteMicrosNum,
                aluminio, fleteAluminio: fleteAluminioNum,
                tornilleria, generales, tc,
              }));
            }}
            disabled={!tc}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            PDF costos (interno)
          </button>
          {mostrarPrecioCliente && clienteTotalMXN > 0 && (
            <button
              onClick={async () => {
                const CotizacionClientePDF = await loadCotizacionClientePDF();
                await openPDFInNewWindow(createElement(CotizacionClientePDF, {
                  nombreCotizacion,
                  clienteNombre: reciboCFE?.nombre || "",
                  cantidadPaneles: cantidadNum, potenciaW: potenciaNum,
                  kWp: cantidadNum * potenciaNum / 1000,
                  generacionMensualKwh: cantidadNum * potenciaNum / 1000 * 132,
                  partidas: {
                    paneles: clientePanelesMXN * 1.16, inversores: clienteInversoresMXN * 1.16,
                    estructura: clienteEstructuraMXN * 1.16, tornilleria: clienteTornilleriaMXN * 1.16,
                    generales: clienteGeneralesMXN * 1.16, montoFijo: utilidad.montoFijo * 1.16,
                  },
                  subtotal: clienteSubtotalMXN, iva: clienteIvaMXN, total: clienteTotalMXN,
                  porPanel: clientePorPanel, porWatt: clientePorWatt,
                  vigenciaDias: 15, notas: "",
                }));
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              PDF cotizacion cliente
            </button>
          )}
          {reciboCFE && cantidadNum > 0 && potenciaNum > 0 && (
            <div className="space-y-2">
              <button
                onClick={async () => {
                  const { generateSolicitudCFE } = await import("./SolicitudCFEPDF");
                  const { EMPRESA_DEFAULT } = await import("../lib/fill-solicitud-cfe");
                  const kWp = cantidadNum * potenciaNum / 1000;

                  let dirRaw = (reciboCFE.direccion || "").trim();
                  const cpMatch = dirRaw.match(/\b(\d{5})\b/);
                  const parsedCP = cpMatch ? cpMatch[1] : "";
                  if (cpMatch) dirRaw = dirRaw.replace(cpMatch[0], "").trim();

                  let segments: string[];
                  if (dirRaw.includes(",")) {
                    segments = dirRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
                  } else {
                    const colMatch = dirRaw.match(/^(.+?)\s+(COL\.?\s+|COLONIA\s+|FRACC?\.?\s+|FRAC\s+)(.+)$/i);
                    if (colMatch) {
                      segments = [colMatch[1].trim(), (colMatch[2] + colMatch[3]).trim()];
                    } else {
                      segments = [dirRaw];
                    }
                  }

                  const callePart = segments[0] || "";
                  const numMatch = callePart.match(/\s+(\d+[\w-]*)\s*$/);
                  const parsedCalle = numMatch ? callePart.slice(0, numMatch.index).trim() : callePart;
                  const parsedNumExt = numMatch ? numMatch[1] : "";

                  const parsedColonia = segments[1] || "";
                  const parsedMunicipio = segments[2] || "";
                  const parsedEstado = segments[3] || clienteUbicacion || "";

                  const emp = configEmpresa ?? EMPRESA_DEFAULT;
                  await generateSolicitudCFE({
                    nombreSolicitante: reciboCFE.nombre || "",
                    calle: parsedCalle,
                    numeroExterior: parsedNumExt,
                    colonia: parsedColonia,
                    municipio: parsedMunicipio,
                    estado: parsedEstado,
                    codigoPostal: parsedCP,
                    telefono: clienteTelefono || "",
                    email: clienteEmail || "",
                    rpu: reciboCFE.noServicio || "",
                    tarifa: reciboCFE.tarifa || "",
                    capacidadKW: kWp,
                    generacionMensualKWh: kWp * 132,
                    cantidadPaneles: cantidadNum,
                    empresa: {
                      nombre: emp.nombre,
                      calle: emp.calle ?? undefined,
                      numeroExterior: emp.numeroExterior ?? undefined,
                      colonia: emp.colonia ?? undefined,
                      codigoPostal: emp.codigoPostal ?? undefined,
                      municipio: emp.municipio ?? undefined,
                      estado: emp.estado ?? undefined,
                      telefono: emp.telefono ?? undefined,
                      email: emp.email ?? undefined,
                      puesto: emp.puesto ?? undefined,
                    },
                  });
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm font-medium text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Solicitud CFE (interconexion)
              </button>
              <button
                onClick={() => setShowConfigEmpresa(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Datos de empresa
              </button>
            </div>
          )}
        </div>
      </>
    );
  }
}
