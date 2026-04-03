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
import { fmt } from "./components/primitives";
import { generateArrangements } from "./lib/structure/generate-arrangements";
import { syncGeneralesFromElectrical } from "./lib/sync-generales";
import { autoSelectPanel, analyzePanelRecommendations } from "./lib/auto-select-panel";
import { openPDFInNewWindow } from "./lib/open-pdf";
import type { CatalogoPanelConPrecio, OfertaSimple } from "./lib/auto-select-panel";

// ── Extracted components ─────────────────────────────────────────────────────
import ReciboCFEBanner from "./components/ReciboCFEBanner";
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
    nombreCotizacion, mostrarGuardadas, mostrarPDF, msgGuardado,
    pickerPanel, pickerMicro, pickerSearch, pickerMarca, pickerOrden,
    sugerirGuardarPanel, sugerirGuardarMicro,
    panelSeleccionado, microSeleccionado,
    reciboCFE, loadingRecibo, errorRecibo, reciboDetalle,
    reciboPDFBase64, reciboUltimoAnio,
    minisplits, minisplitTemporada,
    mostrarPrecioCliente, utilidad,
    nombreVariante, mostrarVariantes, mostrarPDFCliente, mostrarComparador,
  } = s;

  // ── Derived data from Convex ──────────────────────────────────────────────
  const cotizacionesGuardadas = useMemo<CotizacionGuardada[]>(() => {
    return convexCotizaciones.map((c) => ({
      nombre: c.nombre,
      fecha: c.fecha ?? "",
      data: (convexCargarCotizacion(c.nombre) ?? {} as CotizacionData),
    }));
  }, [convexCotizaciones, convexCargarCotizacion]);

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

  const reciboInputRef = useRef<HTMLInputElement>(null);

  const rawVariantes = useQuery(
    api.cotizaciones.listCliente,
    nombreCotizacion.trim() ? { cotizacionBase: nombreCotizacion.trim() } : "skip"
  );
  const variantes = useMemo<CotizacionCliente[]>(() => {
    if (!rawVariantes) return [];
    return rawVariantes.map((v) => {
      try {
        const parsed = JSON.parse(v.data);
        return { ...parsed, id: v._id as string } as CotizacionCliente;
      } catch { return null; }
    }).filter((x): x is CotizacionCliente => x !== null);
  }, [rawVariantes]);

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

  // ── Numeric derivations ───────────────────────────────────────────────────
  const cantidadNum = Number(cantidad) || 0;
  const structureResult = useMemo(
    () => (structureRows.length > 0 ? calculateStructure(structureRows) : null),
    [structureRows],
  );
  const potenciaNum = Number(potencia) || 0;
  const precioNum = Number(precioPorWatt) || 0;
  const fletePanelesNum = Number(fletePaneles) || 0;
  const garantiaPanelesNum = Number(garantiaPaneles) || 0;
  const precioMicroNum = Number(precioMicroinversor) || 0;
  const precioCableNum = Number(precioCable) || 0;
  const precioECUNum = Number(precioECU) || 0;
  const precioHerramientaNum = Number(precioHerramienta) || 0;
  const precioEndCapNum = Number(precioEndCap) || 0;
  const fleteMicrosNum = Number(fleteMicros) || 0;

  const costoPanel = potenciaNum * precioNum;
  const costoPanelesUSD = costoPanel * cantidadNum;

  const panelesPorMicro = microSeleccionado?.panelesPorUnidad ?? 4;
  const cantidadMicros = cantidadNum > 0 ? Math.ceil(cantidadNum / panelesPorMicro) : 0;
  const electricalResult = useMemo(
    () => cantidadMicros > 0 ? calculateElectrical({
      equipmentProfileId: electricalProfileId,
      cantidadEquipos: cantidadMicros,
      cantidadPaneles: cantidadNum,
    }) : null,
    [electricalProfileId, cantidadMicros, cantidadNum],
  );
  const costoMicrosUSD = cantidadMicros * precioMicroNum;
  const costoCablesUSD = cantidadMicros * precioCableNum;
  const costoECUUSD = incluyeECU ? precioECUNum : 0;
  const costoHerramientaUSD = incluyeHerramienta ? precioHerramientaNum : 0;
  const costoEndCapUSD = incluyeEndCap ? precioEndCapNum * cantidadMicros : 0;

  const costoAluminioMXN = aluminio.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0
  );
  const fleteAluminioNum = Number(fleteAluminio) || 0;
  const fleteAluminioSinIVA = fleteAluminioNum / 1.16;
  const costoTornilleriaMXN = tornilleria.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0
  );
  const costoGeneralesMXN = generales.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0
  );

  const tcLive = (tcUsarManana && tc?.tipoCambioAlt) ? tc.tipoCambioAlt : (tc?.tipoCambio || 0);
  const tcVal = ((tcFrozen || tcManual) && Number(tcSnapshotLocal) > 0) ? Number(tcSnapshotLocal) : tcLive;
  const tcPaneles = Number(tcCustomPaneles) > 0 ? Number(tcCustomPaneles) : tcVal;
  const tcMicros  = Number(tcCustomMicros)  > 0 ? Number(tcCustomMicros)  : tcVal;

  const totalPanelesUSD = cantidadNum > 0 ? costoPanelesUSD + fletePanelesNum + garantiaPanelesNum : 0;
  const partidaPanelesMXN = totalPanelesUSD * tcPaneles;
  const totalInversoresUSD = cantidadNum > 0 ? costoMicrosUSD + costoCablesUSD + costoECUUSD + costoHerramientaUSD + costoEndCapUSD + fleteMicrosNum : 0;
  const partidaInversoresMXN = totalInversoresUSD * tcMicros;
  const partidaEstructuraMXN = costoAluminioMXN + fleteAluminioSinIVA;
  const partidaTornilleriaMXN = costoTornilleriaMXN;
  const partidaGeneralesMXN = costoGeneralesMXN;

  const subtotalMXN = partidaPanelesMXN + partidaInversoresMXN + partidaEstructuraMXN + partidaTornilleriaMXN + partidaGeneralesMXN;
  const ivaMXN = subtotalMXN * 0.16;
  const totalMXN = subtotalMXN + ivaMXN;
  const costoPorPanel = cantidadNum > 0 ? totalMXN / cantidadNum : 0;

  // ── Precio al cliente ─────────────────────────────────────────────────────
  const pctPaneles = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.panelesPct;
  const pctInversores = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.inversoresPct;
  const pctEstructura = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.estructuraPct;
  const pctTornilleria = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.tornilleriaPct;
  const pctGenerales = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.generalesPct;

  const clientePanelesMXN = partidaPanelesMXN * (1 + pctPaneles / 100);
  const clienteInversoresMXN = partidaInversoresMXN * (1 + pctInversores / 100);
  const clienteEstructuraMXN = partidaEstructuraMXN * (1 + pctEstructura / 100);
  const clienteTornilleriaMXN = partidaTornilleriaMXN * (1 + pctTornilleria / 100);
  const clienteGeneralesMXN = partidaGeneralesMXN * (1 + pctGenerales / 100);
  const clienteSubtotalMXN = clientePanelesMXN + clienteInversoresMXN + clienteEstructuraMXN + clienteTornilleriaMXN + clienteGeneralesMXN + utilidad.montoFijo;
  const clienteIvaMXN = clienteSubtotalMXN * 0.16;
  const clienteTotalMXN = clienteSubtotalMXN + clienteIvaMXN;
  const utilidadNetaMXN = clienteSubtotalMXN - subtotalMXN;
  const utilidadNetaPct = subtotalMXN > 0 ? (utilidadNetaMXN / subtotalMXN) * 100 : 0;
  const clientePorPanel = cantidadNum > 0 ? clienteTotalMXN / cantidadNum : 0;
  const clientePorWatt = cantidadNum > 0 && potenciaNum > 0 ? clienteTotalMXN / (cantidadNum * potenciaNum) : 0;

  // ── ROI ────────────────────────────────────────────────────────────────────
  const kWpSistema = cantidadNum * potenciaNum / 1000;
  const generacionMensualKwh = kWpSistema * 132;
  const costoCFEporKwh = reciboCFE && reciboCFE.consumoKwh > 0 ? reciboCFE.totalFacturado / reciboCFE.consumoKwh : 0;
  const ahorroMensualMXN = generacionMensualKwh * costoCFEporKwh;
  const ahorroAnualMXN = ahorroMensualMXN * 12;
  const roiMeses = ahorroMensualMXN > 0 ? clienteTotalMXN / ahorroMensualMXN : 0;
  const roiAnios = roiMeses / 12;

  // ── CFE sizing derivations ────────────────────────────────────────────────
  const consumoMensualCFE = reciboCFE
    ? reciboCFE.consumoMensualPromedio > 0
      ? reciboCFE.consumoMensualPromedio
      : Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1))
    : 0;
  const GEN_POR_KWP = 5.5 * 30 * 0.8;
  const panelW = Number(potencia) || 545;

  // Último año = 6 bimestres: el actual + 5 del historial
  // Todo el historial = actual + todos los anteriores
  const historicoFiltrado = reciboCFE
    ? reciboUltimoAnio ? reciboCFE.historico.slice(0, 5) : reciboCFE.historico
    : [];
  // Todos los bimestres (incluyendo actual) para cálculos de promedio/P75
  const todosBimestres = reciboCFE
    ? [reciboCFE.consumoKwh, ...historicoFiltrado.map((h) => h.kwh)]
    : [];
  const consumoMensualCalc = reciboCFE
    ? todosBimestres.length > 0
      ? Math.round(todosBimestres.reduce((s, kwh) => s + kwh, 0) / todosBimestres.length / 2)
      : Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1))
    : 0;

  const panelesPromedio = reciboCFE ? Math.ceil((consumoMensualCalc / GEN_POR_KWP * 1000) / panelW) : 0;
  const kWpPromedio = panelesPromedio * panelW / 1000;
  const maxHistKwh = reciboCFE ? Math.max(...todosBimestres) : 0;
  const consumoMensualMax = Math.round(maxHistKwh / 2);
  const panelesMax = reciboCFE ? Math.ceil((consumoMensualMax / GEN_POR_KWP * 1000) / panelW) : 0;
  const kWpMax = panelesMax * panelW / 1000;
  const todosKwhSorted = [...todosBimestres].sort((a, b) => a - b);
  const p75Index = Math.floor(todosKwhSorted.length * 0.75);
  const consumoP75 = todosKwhSorted.length > 0 ? Math.round(todosKwhSorted[p75Index] / 2) : 0;
  const panelesEquilibrado = reciboCFE ? Math.ceil((consumoP75 / GEN_POR_KWP * 1000) / panelW) : 0;
  const kWpEquilibrado = panelesEquilibrado * panelW / 1000;

  const WATTS_POR_TON: Record<string, number> = { inverter: 900, convencional: 1400 };
  const minisplitKwhMes = minisplits.reduce((sum, m) => {
    const watts = m.cantidad * Number(m.toneladas) * WATTS_POR_TON[m.tipo];
    return sum + (watts * m.horasDia * 30) / 1000;
  }, 0);
  const minisplitKwhMesProm = minisplitTemporada === "temporada" ? Math.round(minisplitKwhMes / 2) : Math.round(minisplitKwhMes);
  const consumoConIncremento = consumoMensualCalc + minisplitKwhMesProm;
  const panelesConIncremento = reciboCFE ? Math.ceil((consumoConIncremento / GEN_POR_KWP * 1000) / panelW) : 0;
  const kWpConIncremento = panelesConIncremento * panelW / 1000;
  const kWpSugerido = panelesPromedio * panelW / 1000;
  const panelesSugeridosCFE = panelesPromedio;

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((d) => (d.error ? set("tcError", d.error) : set("tc", d)))
      .catch(() => set("tcError", "No se pudo obtener el tipo de cambio"));
  }, []);

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

  // (auto-apply moved into handleReciboCFE for reliable timing)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!nombreCotizacion.trim()) { set("msgGuardado", "err"); setTimeout(() => set("msgGuardado", ""), 2500); return; }
    await convexGuardarCotizacion(nombreCotizacion.trim(), getFormData());
    set("msgGuardado", "ok");
    setTimeout(() => set("msgGuardado", ""), 2500);
  };

  const handleCargar = (nombre: string) => {
    const data = convexCargarCotizacion(nombre);
    if (!data) return;
    loadCotizacion(data);
    markClean(data); // set baseline snapshot so autosave won't re-save unchanged data
    const savedPanelId = data.panelCatalogoId;
    const savedPotencia = Number(data.potencia) || 0;
    const savedPrecioW = Number(data.precioPorWatt) || 0;
    const matchPanel = savedPanelId ? catalogoPaneles.find((p) => p.id === savedPanelId) : null;
    if (matchPanel) set("panelSeleccionado", matchPanel);
    else if (savedPotencia > 0 && savedPrecioW > 0) set("panelSeleccionado", catalogoPaneles.find((p) => p.potencia === savedPotencia && Math.abs(p.precioPorWatt - savedPrecioW) < 0.001) ?? null);
    else set("panelSeleccionado", null);
    const savedMicroId = data.microCatalogoId;
    const savedPrecioMicro = Number(data.precioMicroinversor) || 0;
    const savedPrecioCable = Number(data.precioCable) || 0;
    const matchMicro = savedMicroId ? catalogoMicros.find((m) => m.id === savedMicroId) : null;
    if (matchMicro) set("microSeleccionado", matchMicro);
    else if (savedPrecioMicro > 0) set("microSeleccionado", catalogoMicros.find((m) => Math.abs(m.precio - savedPrecioMicro) < 0.01 && Math.abs(m.precioCable - savedPrecioCable) < 0.01) ?? null);
    else set("microSeleccionado", null);
  };

  const handleGuardarVariante = async () => {
    if (!nombreCotizacion.trim() || !nombreVariante.trim() || subtotalMXN <= 0) return;
    const c: CotizacionCliente = {
      id: uid(), cotizacionBase: nombreCotizacion, nombre: nombreVariante,
      fecha: new Date().toISOString(), utilidad: { ...utilidad },
      costos: {
        paneles: partidaPanelesMXN, inversores: partidaInversoresMXN,
        estructura: partidaEstructuraMXN, tornilleria: partidaTornilleriaMXN,
        generales: partidaGeneralesMXN, subtotal: subtotalMXN, iva: ivaMXN,
        total: totalMXN, cantidadPaneles: cantidadNum, potenciaW: potenciaNum,
      },
      precios: {
        paneles: clientePanelesMXN, inversores: clienteInversoresMXN,
        estructura: clienteEstructuraMXN, tornilleria: clienteTornilleriaMXN,
        generales: clienteGeneralesMXN, montoFijo: utilidad.montoFijo,
        subtotal: clienteSubtotalMXN, iva: clienteIvaMXN, total: clienteTotalMXN,
        porPanel: clientePorPanel, porWatt: clientePorWatt,
        utilidadNeta: utilidadNetaMXN, utilidadPct: utilidadNetaPct,
      },
      notas: "", vigenciaDias: 15,
    };
    await convexGuardarCotizacionCliente({
      cotizacionBase: c.cotizacionBase, nombre: c.nombre, fecha: c.fecha, data: c,
    });
    set("nombreVariante", "");
    set("mostrarVariantes", true);
  };

  const handleEliminarVariante = async (id: string) => { await convexEliminarCotizacionCliente(id); };
  const handleCargarVariante = (v: CotizacionCliente) => {
    setMany({
      utilidad: v.utilidad,
      mostrarPrecioCliente: true,
      mostrarVariantes: false,
      nombreVariante: v.nombre,
    });
  };
  // ── Variant PDF (open in new window) ──
  const handleVerPDFVariante = async (v: CotizacionCliente, tipo: "cliente" | "costos") => {
    if (tipo === "cliente") {
      const CotizacionClientePDF = await loadCotizacionClientePDF();
      const el = createElement(CotizacionClientePDF, {
        nombreCotizacion: `${nombreCotizacion} — ${v.nombre}`,
        clienteNombre: reciboCFE?.nombre || "",
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
      });
      await openPDFInNewWindow(el);
    } else if (tc) {
      const CotizacionPDF = await loadCotizacionPDF();
      const el = createElement(CotizacionPDF, {
        nombreCotizacion: `${nombreCotizacion} — ${v.nombre} (Costos)`,
        cantidad: v.costos.cantidadPaneles, potencia: v.costos.potenciaW,
        precioPorWatt: Number(precioPorWatt) || 0,
        fletePaneles: Number(fletePaneles) || 0, garantiaPaneles: Number(garantiaPaneles) || 0,
        precioMicroinversor: Number(precioMicroinversor) || 0,
        precioCable: Number(precioCable) || 0,
        precioECU: Number(precioECU) || 0, incluyeECU,
        precioHerramienta: Number(precioHerramienta) || 0, incluyeHerramienta,
        precioEndCap: Number(precioEndCap) || 0, incluyeEndCap,
        fleteMicros: Number(fleteMicros) || 0,
        aluminio, fleteAluminio: Number(fleteAluminio) || 0,
        tornilleria, generales, tc,
      });
      await openPDFInNewWindow(el);
    }
  };

  const handleEliminar = async (nombre: string) => { await convexEliminarCotizacion(nombre); };

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

  const handleReciboCFE = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set("loadingRecibo", true);
    set("errorRecibo", "");
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await fetch("/api/leer-recibo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      set("reciboCFE", data);
      const reader = new FileReader();
      reader.onload = () => set("reciboPDFBase64", reader.result as string);
      reader.readAsDataURL(file);
      if (data.nombre && !nombreCotizacion.trim()) set("nombreCotizacion", data.nombre);

      // ── Auto-apply propuesta equilibrada (P75) ──
      // Calculate directly from recibo data + current potencia to avoid stale state
      const pw = Number(potencia) || 545;
      const GEN = 5.5 * 30 * 0.8; // GEN_POR_KWP
      const hist = reciboUltimoAnio ? data.historico.slice(0, 5) : data.historico;
      const allKwh = [data.consumoKwh, ...hist.map((h: { kwh: number }) => h.kwh)].sort((a: number, b: number) => a - b);
      const p75Idx = Math.floor(allKwh.length * 0.75);
      const cP75 = allKwh.length > 0 ? Math.round(allKwh[p75Idx] / 2) : 0;
      const panelsP75 = cP75 > 0 ? Math.ceil((cP75 / GEN * 1000) / pw) : 0;
      if (panelsP75 > 0) {
        // Use setTimeout(0) so the state from set("reciboCFE") is committed first
        setTimeout(() => handleApplyProposal(panelsP75), 0);
      }
    } catch (err: unknown) {
      set("errorRecibo", err instanceof Error ? err.message : "Error al procesar el recibo");
    } finally {
      set("loadingRecibo", false);
      if (reciboInputRef.current) reciboInputRef.current.value = "";
    }
  };

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
              onUploadClick={() => reciboInputRef.current?.click()}
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
            />

            {/* 1. Paneles */}
            <SectionPaneles
              catalogoPaneles={catalogoPaneles} panelSeleccionado={panelSeleccionado}
              onOpenPicker={() => set("pickerPanel", true)}
              onClearSeleccion={() => { set("panelSeleccionado", null); set("sugerirGuardarPanel", true); }}
              onSelectPanel={handleSelectPanelById}
              recommendations={panelRecommendations}
              cantidad={cantidad} potencia={potencia} precioPorWatt={precioPorWatt}
              fletePaneles={fletePaneles} garantiaPaneles={garantiaPaneles}
              tcCustomPaneles={tcCustomPaneles}
              onSetCantidad={(v) => set("cantidad", v)}
              onSetPotencia={(v) => { set("potencia", v); if (v) { set("sugerirGuardarPanel", true); set("panelSeleccionado", null); } }}
              onSetPrecioPorWatt={(v) => { set("precioPorWatt", v); if (v) { set("sugerirGuardarPanel", true); set("panelSeleccionado", null); } }}
              onSetFletePaneles={(v) => set("fletePaneles", v)}
              onSetGarantiaPaneles={(v) => set("garantiaPaneles", v)}
              onSetTcCustomPaneles={(v) => set("tcCustomPaneles", v)}
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
              onSetTcCustomMicros={(v) => set("tcCustomMicros", v)}
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
              onSetFrozen={(v) => set("tcFrozen", v)}
              onSetManual={(v) => set("tcManual", v)}
              onSetSnapshot={(v) => set("tcSnapshotLocal", v)}
              onSetUsarManana={(v) => set("tcUsarManana", v)}
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
            </div>
          </div>
        </div>

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
    </div>
  );
}
