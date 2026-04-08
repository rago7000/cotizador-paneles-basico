"use client";

import { useEffect, useRef, useMemo, useState, createElement } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AppNav from "./components/AppNav";
import {
  useConvexCotizaciones,
  useConvexCatalogo,
  mejorOferta as mejorOfertaHelper,
} from "./lib/useConvexCatalogo";
import type {
  CotizacionData,
  CotizacionGuardada,
  LineItem,
  CatalogoPanel,
  CatalogoMicro,
  UtilidadConfig,
  CotizacionCliente,
} from "./lib/types";
import { calculateStructure } from "./lib/structure";
import { calculateElectrical, listProfiles } from "./lib/electrical";
import { useCotizacion } from "./lib/useCotizacion";
import { useAutosave } from "./lib/useAutosave";
import { uid, UTILIDAD_DEFAULT } from "./lib/cotizacion-state";
import { fmt, CollapseAllContext } from "./components/primitives";
import { generateArrangements } from "./lib/structure/generate-arrangements";
import { syncGeneralesFromElectrical } from "./lib/sync-generales";
import { autoSelectPanel, analyzePanelRecommendations } from "./lib/auto-select-panel";
import { num } from "./lib/normalize";
import { openPDFInNewWindow } from "./lib/open-pdf";
import { useTipoCambio } from "./lib/useTipoCambio";
import { useReciboCFE } from "./lib/useReciboCFE";
import { useCotizacionCalculada } from "./lib/useCotizacionCalculada";
import { useCotizacionPersistence } from "./lib/useCotizacionPersistence";
import type { CatalogoPanelConPrecio, OfertaSimple } from "./lib/auto-select-panel";

// ── Extracted components ─────────────────────────────────────────────────────
import ReciboCFEBanner from "./components/ReciboCFEBanner";
import PanelCliente from "./components/PanelCliente";
import ChatCotizacion from "./components/ChatCotizacion";
import SectionPaneles from "./components/SectionPaneles";
import SectionMicroinversores from "./components/SectionMicroinversores";
import SectionEstructura from "./components/SectionEstructura";
import SectionLineItems from "./components/SectionLineItems";
import SectionGenerales from "./components/SectionGenerales";
import TipoCambioWidget from "./components/TipoCambioWidget";
import ResumenSidebar from "./components/ResumenSidebar";
import PrecioClienteWidget from "./components/PrecioClienteWidget";
import ComparadorVariantes from "./components/ComparadorVariantes";
import PickerPaneles from "./components/PickerPaneles";
import PickerMicros from "./components/PickerMicros";
import MisCotizacionesModal from "./components/MisCotizacionesModal";

// PDF components imported lazily for new-window rendering
const loadCotizacionPDF = () => import("./components/CotizacionPDF").then((m) => m.default);
const loadCotizacionClientePDF = () => import("./components/CotizacionClientePDF").then((m) => m.default);
const loadGenerateSolicitudCFE = () => import("./components/SolicitudCFEPDF").then((m) => m.generateSolicitudCFE);

type AluminioItem = LineItem;
type GeneralItem = LineItem;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  // ── Convex hooks ──────────────────────────────────────────────────────────
  const {
    cotizaciones: convexCotizaciones,
    guardarCotizacion: convexGuardarCotizacion,
    cargarCotizacion: convexCargarCotizacion,
    eliminarCotizacion: convexEliminarCotizacion,
    guardarSeguimiento: convexGuardarSeguimiento,
    guardarCotizacionCliente: convexGuardarCotizacionCliente,
    eliminarCotizacionCliente: convexEliminarCotizacionCliente,
  } = useConvexCotizaciones();

  const {
    paneles: convexPaneles,
    micros: convexMicros,
    ofertas: convexOfertas,
    isLoading: catalogoLoading,
    guardarProductoPanel: convexGuardarProductoPanel,
    guardarProductoMicro: convexGuardarProductoMicro,
  } = useConvexCatalogo();

  // ── Cotización state (single reducer) ─────────────────────────────────────
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

  // ── Tipo de cambio (fetch + setters) ───────────────────────────────────────
  const tcActions = useTipoCambio(set);

  // ── Autosave (2s debounce) ────────────────────────────────────────────────
  const { autosaveStatus, resetSnapshot, markClean } = useAutosave({
    nombre: s.nombreCotizacion,
    getFormData,
    save: convexGuardarCotizacion,
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
    cotizacionId, nombreCotizacion, mostrarGuardadas, mostrarPDF, msgGuardado,
    pickerPanel, pickerMicro, pickerSearch, pickerMarca, pickerOrden,
    sugerirGuardarPanel, sugerirGuardarMicro,
    panelSeleccionado, microSeleccionado,
    reciboCFE, loadingRecibo, errorRecibo, reciboDetalle,
    reciboPDFBase64, reciboUltimoAnio,
    minisplits, minisplitTemporada,
    mostrarPrecioCliente, utilidad,
    nombreVariante, mostrarVariantes, mostrarPDFCliente, mostrarComparador,
    clienteTelefono, clienteEmail, clienteUbicacion, clienteNotas,
    etapa, etapaNotas, fechaCierre, fechaInstalacion, probabilidadCierre,
    origen, origenDetalle, tags,
  } = s;

  const [collapseAllCounter, setCollapseAllCounter] = useState(0);
  const [precioClienteExpanded, setPrecioClienteExpanded] = useState(false);

  // ── Derived data from Convex ──────────────────────────────────────────────
  const cotizacionesGuardadas = useMemo<CotizacionGuardada[]>(() => {
    return convexCotizaciones.map((c) => ({
      nombre: c.nombre,
      fecha: c.fecha ?? "",
      data: (convexCargarCotizacion(c.nombre) ?? {} as CotizacionData),
    }));
  }, [convexCotizaciones, convexCargarCotizacion]);

  // ── Client history: exact + fuzzy name matches ───────────────────────────
  const clienteHistorial = useMemo(() => {
    const clienteNombre = reciboCFE?.nombre?.trim();
    if (!clienteNombre || convexCotizaciones.length === 0) return null;

    // Normalize: lowercase, remove accents, split into sorted tokens
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

      // Exact match (case/accent insensitive)
      if (norm === clienteNorm) {
        exactas.push({ nombre, fecha: c.fecha ?? "" });
        continue;
      }

      // Token-based matching: same words in different order
      const cTokens = tokens(nombre);
      const shared = clienteTokens.filter((t) => cTokens.includes(t));
      const minLen = Math.min(clienteTokens.length, cTokens.length);
      if (minLen >= 2 && shared.length >= minLen) {
        similares.push({ nombre, fecha: c.fecha ?? "", razon: "mismo nombre, diferente orden" });
        continue;
      }

      // Partial overlap: most tokens match (for typos or extra words)
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

  // reciboInputRef moved to useReciboCFE hook

  const rawVariantesById = useQuery(
    api.cotizaciones.listCliente,
    cotizacionId ? { cotizacionBase: cotizacionId } : "skip"
  );
  // Also fetch legacy variants stored with nombreCotizacion as key
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
    let list = catalogoMicros.filter((m) => {
      if (pq && !`${m.marca} ${m.modelo}`.toLowerCase().includes(pq)) return false;
      if (pickerMarca && m.marca !== pickerMarca) return false;
      return true;
    });
    return list.sort((a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`));
  }, [catalogoMicros, pq, pickerMarca]);

  // ── All calculations (normalize + partidas + pricing + ROI + sizing) ─────
  const calc = useCotizacionCalculada({
    state: s,
    utilidad,
    structureRows,
    electricalProfileId,
  });
  const {
    n, cantidadNum, potenciaNum, precioNum,
    fletePanelesNum, garantiaPanelesNum,
    precioMicroNum, precioCableNum, precioECUNum,
    precioHerramientaNum, precioEndCapNum, fleteMicrosNum, fleteAluminioNum,
    panelesPorMicro, cantidadMicros,
    costoPanel, costoPanelesUSD,
    costoMicrosUSD, costoCablesUSD, costoECUUSD, costoHerramientaUSD, costoEndCapUSD,
    costoAluminioMXN, costoTornilleriaMXN, costoGeneralesMXN,
    tcLive, tcVal, tcPaneles, tcMicros, panelW,
    partidas, partidaPanelesMXN, partidaInversoresMXN, partidaEstructuraMXN,
    partidaTornilleriaMXN, partidaGeneralesMXN,
    subtotalMXN, ivaMXN, totalMXN,
    totalPanelesUSD, totalInversoresUSD, costoPorPanel, fleteAluminioSinIVA,
    precioCliente, clientePanelesMXN, clienteInversoresMXN, clienteEstructuraMXN,
    clienteTornilleriaMXN, clienteGeneralesMXN,
    clienteSubtotalMXN, clienteIvaMXN, clienteTotalMXN,
    utilidadNetaMXN, utilidadNetaPct, clientePorPanel, clientePorWatt,
    roi, kWpSistema, generacionMensualKwh, costoCFEporKwh,
    ahorroMensualMXN, ahorroAnualMXN, roiMeses, roiAnios,
    sizing, consumoMensualCFE, consumoMensualCalc,
    panelesPromedio, kWpPromedio, panelesEquilibrado, kWpEquilibrado,
    panelesMax, kWpMax, consumoP75, consumoMensualMax, maxHistKwh,
    panelesSugeridosCFE, kWpSugerido, historicoFiltrado, todosBimestres,
    minisplitKwhMes, minisplitKwhMesProm,
    consumoConIncremento, panelesConIncremento, kWpConIncremento,
    structureResult, electricalResult,
  } = calc;

  // ── Persistence (save/load/delete cotizaciones + variantes) ────────────
  const persistence = useCotizacionPersistence({
    state: s, set, setMany, loadCotizacion, getFormData, markClean,
    convexGuardarCotizacion, convexCargarCotizacion, convexEliminarCotizacion,
    convexGuardarCotizacionCliente, convexEliminarCotizacionCliente,
    catalogoPaneles, catalogoMicros, calc, variantes,
    loadCotizacionPDF, loadCotizacionClientePDF,
  });
  const {
    handleGuardar, handleCargar, handleEliminar,
    handleGuardarVariante, handleEliminarVariante, handleCargarVariante,
    handleVerPDFVariante,
  } = persistence;

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

  // ── Effects ───────────────────────────────────────────────────────────────
  // TC fetch moved to useTipoCambio hook

  const autoSelectedMicro = useRef(false);
  useEffect(() => {
    if (autoSelectedMicro.current || catalogoMicros.length === 0 || precioMicroinversor) return;
    const ds3d = catalogoMicros.find((m) => /ds3d|ds3-d/i.test(m.modelo));
    if (ds3d) {
      set("precioMicroinversor", String(ds3d.precio));
      set("precioCable", String(ds3d.precioCable));
      set("microSeleccionado", ds3d);
      autoSelectedMicro.current = true;
    }
  }, [catalogoMicros, precioMicroinversor]);

  // ── Auto-select panel (Step 5) — prefers catalog default, falls back to cheapest ──
  const autoSelectedPanel = useRef(false);
  useEffect(() => {
    if (autoSelectedPanel.current || catalogoPaneles.length === 0 || precioPorWatt) return;
    // 1. Try catalog default (esDefault flag set by user)
    const defaultPanel = convexPaneles.find((p) => p.esDefault);
    if (defaultPanel) {
      const match = catalogoPaneles.find((cp) => cp.id === `v2_${defaultPanel._id}`);
      if (match) {
        setMany({ potencia: String(match.potencia), precioPorWatt: String(match.precioPorWatt), panelSeleccionado: match });
        autoSelectedPanel.current = true;
        return;
      }
    }
    // 2. Fallback: cheapest $/W
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
  }, [catalogoPaneles, convexPaneles, precioPorWatt]);

  // ── Default panel from catalog (for quick-switch tag) ──
  const defaultPanelCatalogo = useMemo(() => {
    const dp = convexPaneles.find((p) => p.esDefault);
    if (!dp) return null;
    return catalogoPaneles.find((cp) => cp.id === `v2_${dp._id}`) ?? null;
  }, [convexPaneles, catalogoPaneles]);

  // buildVariantSnapshot moved to useCotizacionPersistence hook

  // ── Auto-proposals after first recibo ───────────────────────────────────
  const autoProposalPhase = useRef<"idle" | "save-base" | "save-opt">("idle");
  const basePortPanelRef = useRef(0);
  const basePanelCountRef = useRef(0);

  useEffect(() => {
    if (autoProposalPhase.current === "idle") return;
    if (subtotalMXN <= 0 || !nombreCotizacion.trim()) return;

    if (autoProposalPhase.current === "save-base") {
      // Guard: skip if proposals already exist
      if (variantes.some((v) => v.nombre === "Propuesta Base")) {
        autoProposalPhase.current = "idle";
        return;
      }
      // Save current config as base proposal
      const base = persistence.buildVariantSnapshot("Propuesta Base");
      basePortPanelRef.current = base.precios.porPanel;
      basePanelCountRef.current = cantidadNum;
      convexGuardarCotizacionCliente({
        cotizacionBase: base.cotizacionBase, nombre: base.nombre, fecha: base.fecha, data: base,
      });

      // Check if inverter is underutilized → apply optimized
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
      // Add discount info comparing to base price per panel
      if (basePortPanelRef.current > 0) {
        const descuento = ((basePortPanelRef.current - opt.precios.porPanel) / basePortPanelRef.current * 100).toFixed(0);
        opt.notas = `Descuento: -${descuento}% por panel vs Base ($${fmt(basePortPanelRef.current)} → $${fmt(opt.precios.porPanel)})`;
      }
      convexGuardarCotizacionCliente({
        cotizacionBase: opt.cotizacionBase, nombre: opt.nombre, fecha: opt.fecha, data: opt,
      });
      autoProposalPhase.current = "idle";
      // Restore to base panel count so the main view shows the default config
      handleApplyProposal(basePanelCountRef.current);
      set("mostrarVariantes", true);
      set("mostrarPrecioCliente", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalMXN, cantidadNum]);

  // ── Apply proposal cascade (Step 6) ──────────────────────────────────────
  const handleApplyProposal = (cantidadPaneles: number) => {
    const updates: Record<string, unknown> = { cantidad: String(cantidadPaneles) };

    // Auto-select panel if none selected
    let currentPotencia = Number(potencia) || 0;
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
          currentPotencia = match.potencia;
          autoSelectedPanel.current = true;
        }
      }
    }

    // Generate structure arrangements
    const arrangements = generateArrangements(cantidadPaneles);
    if (arrangements) {
      const mode = structureMode === "manual" ? "optimo" : structureMode;
      const chosen = mode === "optimo" ? arrangements.optimo : arrangements.conservador;
      updates.autoArrangements = arrangements;
      updates.structureMode = mode;
      updates.structureRows = chosen.rows;
      updates.showStructure = true;

      // Update aluminio from structure calculation
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

    // Calculate electrical and sync generales
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

  // ── Recibo CFE (upload + sizing) ──────────────────────────────────────────
  const { reciboInputRef, triggerUpload, handleReciboCFE } = useReciboCFE({
    set,
    potencia,
    reciboUltimoAnio,
    nombreCotizacion,
    variantesCount: variantes.length,
    onAutoProposal: (panelsP75, shouldSaveBase) => {
      if (shouldSaveBase) {
        autoProposalPhase.current = "save-base";
        set("utilidad", { ...UTILIDAD_DEFAULT });
      }
      setTimeout(() => handleApplyProposal(panelsP75), 0);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  // handleGuardar, handleCargar, handleEliminar, handleGuardarVariante,
  // handleEliminarVariante, handleCargarVariante, handleVerPDFVariante
  // → all moved to useCotizacionPersistence hook

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

  // handleReciboCFE moved to useReciboCFE hook

  // ── Panel recommendations ────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  if (catalogoLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm animate-pulse">Cargando datos del catálogo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">

      {/* ── Header ───────────────────────────────────────────────────────── */}
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

          {/* Save / autosave feedback */}
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
            onClick={() => { setCollapseAllCounter((c) => c + 1); set("mostrarPrecioCliente", false); set("reciboDetalle", false); setPrecioClienteExpanded(false); }}
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
        </div>
      </header>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <CollapseAllContext.Provider value={collapseAllCounter}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── LEFT: Form sections ──────────────────────────────────────── */}
          <div className="space-y-4 min-w-0">

            {/* CFE Recibo */}
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

            {/* Cliente / Pipeline / Origen */}
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

            {/* 1. Paneles */}
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

            {/* 2. Microinversores */}
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

            {/* 3. Estructura */}
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
              onSetStructureMode={(mode) => {
                set("structureMode", mode);
                if (mode !== "manual" && autoArrangements) {
                  const chosen = mode === "optimo" ? autoArrangements.optimo : autoArrangements.conservador;
                  set("structureRows", chosen.rows);
                  // Recalculate aluminio
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

            {/* 4. Tornillería */}
            <SectionLineItems
              num="4" title="Tornillería" items={tornilleria}
              onChange={updateTornilleria} partidaMXN={partidaTornilleriaMXN}
            />

            {/* 5. Generales */}
            <SectionGenerales
              items={generales}
              onChange={updateGeneral}
              partidaMXN={partidaGeneralesMXN}
            />
          </div>

          {/* ── RIGHT: Sidebar ───────────────────────────────────────────── */}
          <div className="space-y-4">
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

            {/* PDF Buttons — open in new window */}
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
                <button
                  onClick={async () => {
                    const generateSolicitudCFE = await loadGenerateSolicitudCFE();
                    const kWp = cantidadNum * potenciaNum / 1000;
                    // Parse address: "Calle #123, Colonia, Municipio, Estado, CP"
                    const dir = reciboCFE.direccion || "";
                    const parts = dir.split(",").map((s: string) => s.trim());
                    const callePart = parts[0] || "";
                    // Try to extract number from calle: "Av. Reforma #123" or "Calle 10 No. 456"
                    const numMatch = callePart.match(/(?:#|No\.?\s*|Num\.?\s*)(\d+\w*)/i);
                    const calle = numMatch ? callePart.slice(0, numMatch.index).trim() : callePart;
                    const numExt = numMatch ? numMatch[1] : "";
                    await generateSolicitudCFE({
                      nombreSolicitante: reciboCFE.nombre || "",
                      calle,
                      numeroExterior: numExt,
                      colonia: parts[1] || "",
                      municipio: parts[2] || "",
                      estado: parts[3] || clienteUbicacion || "",
                      codigoPostal: (dir.match(/\b\d{5}\b/) || [])[0] || "",
                      telefono: clienteTelefono || "",
                      email: clienteEmail || "",
                      rpu: reciboCFE.noServicio || "",
                      tarifa: reciboCFE.tarifa || "",
                      capacidadKW: kWp,
                      generacionMensualKWh: kWp * 132,
                      cantidadPaneles: cantidadNum,
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm font-medium text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Solicitud CFE (interconexion)
                </button>
              )}
            </div>
          </div>
        </div>
        </CollapseAllContext.Provider>

        {/* ── Comparador de variantes ──────────────────────────────── */}
        {mostrarComparador && variantes.length >= 2 && (
          <ComparadorVariantes
            variantes={variantes}
            onClose={() => set("mostrarComparador", false)}
          />
        )}
      </main>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
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
        onCargar={handleCargar} onEliminar={handleEliminar}
      />

      {/* AI Chat — contextual to current cotización */}
      <ChatCotizacion cotizacion={{
        // ── Identificación ──
        proyecto: nombreCotizacion || "(sin nombre)",
        etapa: etapa || "prospecto",
        cliente: {
          telefono: clienteTelefono || undefined,
          email: clienteEmail || undefined,
          ubicacion: clienteUbicacion || undefined,
          notas: clienteNotas || undefined,
        },
        origen: origen || undefined,

        // ── Sistema fotovoltaico ──
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

        // ── Costos desglosados (al instalador) ──
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

        // ── Precio al cliente (con utilidad) ──
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

        // ── Consumo eléctrico (recibo CFE) ──
        reciboCFE: reciboCFE ? {
          titular: reciboCFE.nombre,
          tarifa: reciboCFE.tarifa,
          consumoActualKwh: reciboCFE.consumoKwh,
          consumoMensualPromedioKwh: consumoMensualCalc,
          totalFacturadoMXN: reciboCFE.totalFacturado,
          costoPorKwh: Math.round(costoCFEporKwh * 100) / 100,
          historicoBimestral: reciboCFE.historico?.map((h: { periodo: string; kwh: number; importe: number }) => `${h.periodo}: ${h.kwh} kWh ($${h.importe})`),
        } : "sin recibo",

        // ── Minisplits (cargas adicionales planeadas) ──
        minisplits: minisplits.length > 0 ? {
          equipos: minisplits.map((m) => `${m.cantidad}x ${m.toneladas} ton ${m.tipo} (${m.horasDia}h/día)`),
          temporada: minisplitTemporada,
          consumoAdicionalKwhMes: minisplitKwhMesProm,
        } : "sin minisplits",

        // ── ROI ──
        roi: reciboCFE && ahorroMensualMXN > 0 ? {
          generacionMensualKwh: Math.round(generacionMensualKwh),
          ahorroMensualMXN: Math.round(ahorroMensualMXN),
          ahorroAnualMXN: Math.round(ahorroAnualMXN),
          paybackMeses: Math.round(roiMeses),
          paybackAnios: Math.round(roiAnios * 10) / 10,
        } : "sin datos de recibo para calcular",

        // ── Recomendaciones de sizing ──
        sizing: reciboCFE ? {
          panelesRecomendadoPromedio: panelesPromedio,
          panelesActual: cantidadNum,
          cobertura: consumoMensualCalc > 0 ? `${Math.round(generacionMensualKwh / consumoMensualCalc * 100)}%` : "N/A",
        } : "sin datos de recibo",

        // ── Diseño eléctrico (breakers, cables, circuitos) ──
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
    </div>
  );
}
