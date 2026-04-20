/**
 * Roundtrip test: verifies cotizacion data survives the full
 * save/load cycle without losing any fields.
 *
 * Flow: State -> stateToFormData -> cotizacionDataToArgs -> (Convex doc)
 *       -> docToCotizacionData -> LOAD_COTIZACION reducer -> State
 */

import { describe, it, expect } from "vitest";
import {
  INITIAL_STATE,
  stateToFormData,
  cotizacionReducer,
} from "../src/app/lib/cotizacion-state";
import type { CotizacionState } from "../src/app/lib/cotizacion-state";
import type { CotizacionData, LineItem, UtilidadConfig } from "../src/app/lib/types";

// ── Re-implement transformers (cannot import from useConvexCatalogo - needs React)

function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined),
  ) as Partial<T>;
}

function cotizacionDataToArgs(nombre: string, data: CotizacionData) {
  return pickDefined({
    nombre,
    fecha: data.fecha,
    cotizacionId: data.cotizacionId || undefined,
    tcCustomPaneles: data.tcCustomPaneles || undefined,
    tcCustomMicros: data.tcCustomMicros || undefined,
    tcSnapshot: data.tcSnapshot || undefined,
    tcFrozen: data.tcFrozen || undefined,
    cantidad: data.cantidad || undefined,
    potencia: data.potencia || undefined,
    precioPorWatt: data.precioPorWatt || undefined,
    fletePaneles: data.fletePaneles || undefined,
    garantiaPaneles: data.garantiaPaneles || undefined,
    precioMicroinversor: data.precioMicroinversor || undefined,
    precioCable: data.precioCable || undefined,
    precioECU: data.precioECU || undefined,
    incluyeECU: data.incluyeECU,
    precioHerramienta: data.precioHerramienta || undefined,
    incluyeHerramienta: data.incluyeHerramienta,
    precioEndCap: data.precioEndCap || undefined,
    incluyeEndCap: data.incluyeEndCap,
    fleteMicros: data.fleteMicros || undefined,
    aluminio: data.aluminio?.length ? data.aluminio : undefined,
    fleteAluminio: data.fleteAluminio || undefined,
    tornilleria: data.tornilleria?.length ? data.tornilleria : undefined,
    generales: data.generales?.length ? data.generales : undefined,
    panelCatalogoId: data.panelCatalogoId || undefined,
    microCatalogoId: data.microCatalogoId || undefined,
    reciboCFE: data.reciboCFE ?? undefined,
    reciboPDFBase64: data.reciboPDFBase64 ?? undefined,
    minisplits: data.minisplits?.length ? data.minisplits : undefined,
    minisplitTemporada: data.minisplitTemporada || undefined,
    utilidad: data.utilidad ?? undefined,
    clienteTelefono: data.clienteTelefono || undefined,
    clienteEmail: data.clienteEmail || undefined,
    clienteUbicacion: data.clienteUbicacion || undefined,
    clienteNotas: data.clienteNotas || undefined,
    etapa: data.etapa || undefined,
    etapaNotas: data.etapaNotas || undefined,
    fechaCierre: data.fechaCierre || undefined,
    fechaInstalacion: data.fechaInstalacion || undefined,
    probabilidadCierre:
      data.probabilidadCierre != null && data.probabilidadCierre > 0
        ? data.probabilidadCierre
        : undefined,
    origen: data.origen || undefined,
    origenDetalle: data.origenDetalle || undefined,
    tags: data.tags?.length ? data.tags : undefined,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToCotizacionData(doc: any): CotizacionData {
  return {
    nombre: doc.nombre ?? "",
    cotizacionId: doc.cotizacionId,
    fecha: doc.fecha ?? "",
    tcCustomPaneles: doc.tcCustomPaneles ?? "",
    tcCustomMicros: doc.tcCustomMicros ?? "",
    tcSnapshot: doc.tcSnapshot,
    tcFrozen: doc.tcFrozen,
    cantidad: doc.cantidad ?? "",
    potencia: doc.potencia ?? "",
    precioPorWatt: doc.precioPorWatt ?? "",
    fletePaneles: doc.fletePaneles ?? "",
    garantiaPaneles: doc.garantiaPaneles ?? "",
    precioMicroinversor: doc.precioMicroinversor ?? "",
    precioCable: doc.precioCable ?? "",
    precioECU: doc.precioECU ?? "",
    incluyeECU: doc.incluyeECU ?? true,
    precioHerramienta: doc.precioHerramienta ?? "",
    incluyeHerramienta: doc.incluyeHerramienta ?? false,
    precioEndCap: doc.precioEndCap,
    incluyeEndCap: doc.incluyeEndCap,
    fleteMicros: doc.fleteMicros ?? "",
    aluminio: (doc.aluminio as LineItem[]) ?? [],
    fleteAluminio: doc.fleteAluminio ?? "",
    tornilleria: (doc.tornilleria as LineItem[]) ?? [],
    generales: (doc.generales as LineItem[]) ?? [],
    panelCatalogoId: doc.panelCatalogoId,
    microCatalogoId: doc.microCatalogoId,
    reciboCFE: doc.reciboCFE ?? null,
    reciboPDFBase64: doc.reciboPDFBase64 ?? null,
    minisplits: doc.minisplits,
    minisplitTemporada: doc.minisplitTemporada as CotizacionData["minisplitTemporada"],
    utilidad: doc.utilidad as UtilidadConfig | undefined,
    clienteTelefono: doc.clienteTelefono,
    clienteEmail: doc.clienteEmail,
    clienteUbicacion: doc.clienteUbicacion,
    clienteNotas: doc.clienteNotas,
    etapa: doc.etapa,
    etapaNotas: doc.etapaNotas,
    fechaCierre: doc.fechaCierre,
    fechaInstalacion: doc.fechaInstalacion,
    probabilidadCierre: doc.probabilidadCierre,
    origen: doc.origen,
    origenDetalle: doc.origenDetalle,
    creadoEn: doc.creadoEn,
    actualizadoEn: doc.actualizadoEn,
    tags: doc.tags,
  };
}

// ── Build a fully-populated state for testing ───────────────────────────────

function buildFullState(): CotizacionState {
  return {
    ...INITIAL_STATE,
    cantidad: "20",
    potencia: "545",
    precioPorWatt: "0.22",
    fletePaneles: "150",
    garantiaPaneles: "25",
    precioMicroinversor: "180",
    precioCable: "25",
    precioECU: "145",
    incluyeECU: true,
    precioHerramienta: "35",
    incluyeHerramienta: true,
    precioEndCap: "5.50",
    incluyeEndCap: false,
    fleteMicros: "35",
    aluminio: [
      { id: "a1", nombre: "Angulo", cantidad: "6", precioUnitario: "700", unidad: "Pza" },
    ],
    fleteAluminio: "500",
    tornilleria: [
      { id: "t1", nombre: "Tornillo inox", cantidad: "80", precioUnitario: "3", unidad: "Pza" },
    ],
    generales: [
      { id: "g1", nombre: "Centro de carga", cantidad: "1", precioUnitario: "229", unidad: "Pza" },
      { id: "g2", nombre: "Instalacion - Precio base", cantidad: "1", precioUnitario: "3000", unidad: "Lote" },
    ],
    tcCustomPaneles: "17.50",
    tcCustomMicros: "17.80",
    tcFrozen: true,
    tcSnapshotLocal: "17.25",
    cotizacionId: "test-cot-id-12345",
    nombreCotizacion: "Juan Perez - 20 paneles",
    reciboCFE: {
      nombre: "Juan Perez",
      direccion: "Calle Falsa 123",
      noServicio: "123456789",
      tarifa: "1C",
      periodoInicio: "2026-01-01",
      periodoFin: "2026-02-28",
      diasPeriodo: 59,
      consumoKwh: 850,
      consumoMensualPromedio: 425,
      totalFacturado: 2100,
      historico: [
        { periodo: "Nov-Dic 2025", kwh: 780, importe: 1900 },
        { periodo: "Sep-Oct 2025", kwh: 920, importe: 2300 },
      ],
    },
    reciboPDFBase64: "data:application/pdf;base64,AAAA",
    minisplits: [
      { id: "ms1", cantidad: 2, toneladas: "1.5", horasDia: 8, tipo: "inverter" },
    ],
    minisplitTemporada: "temporada",
    mostrarPrecioCliente: true,
    utilidad: {
      tipo: "por_partida",
      globalPct: 80,
      panelesPct: 60,
      inversoresPct: 70,
      estructuraPct: 50,
      tornilleriaPct: 50,
      generalesPct: 40,
      montoFijo: 5000,
    },
    // CRITICAL FIELDS (previously lost on save)
    clienteTelefono: "6621234567",
    clienteEmail: "juan@example.com",
    clienteUbicacion: "Hermosillo, Sonora",
    clienteNotas: "Cliente referido por Maria",
    etapa: "negociacion",
    etapaNotas: "Pidio descuento 10%",
    fechaCierre: "2026-04-15",
    fechaInstalacion: "2026-05-01",
    probabilidadCierre: 75,
    origen: "referido",
    origenDetalle: "Maria Lopez, vecina",
    tags: ["residencial", "hermosillo", "urgente"],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Cotizacion roundtrip: state -> save -> load -> state", () => {
  const fullState = buildFullState();
  const formData = stateToFormData(fullState);
  const args = cotizacionDataToArgs(fullState.nombreCotizacion, formData);

  // Simulate Convex doc (what the DB would return after save)
  const simulatedDoc = {
    ...args,
    _id: "fake_convex_id",
    _creationTime: Date.now(),
    creadoEn: "2026-04-01T00:00:00.000Z",
    actualizadoEn: "2026-04-06T12:00:00.000Z",
  };

  const loadedData = docToCotizacionData(simulatedDoc);
  const restoredState = cotizacionReducer(INITIAL_STATE, {
    type: "LOAD_COTIZACION",
    data: loadedData,
  });

  // ── 17 Critical fields that were previously lost ──

  it("preserves cotizacionId", () => {
    expect(args.cotizacionId).toBe("test-cot-id-12345");
    expect(loadedData.cotizacionId).toBe("test-cot-id-12345");
    expect(restoredState.cotizacionId).toBe("test-cot-id-12345");
  });

  it("preserves precioEndCap", () => {
    expect(args.precioEndCap).toBe("5.50");
    expect(loadedData.precioEndCap).toBe("5.50");
    expect(restoredState.precioEndCap).toBe("5.50");
  });

  it("preserves incluyeEndCap (boolean false)", () => {
    expect(args.incluyeEndCap).toBe(false);
    expect(loadedData.incluyeEndCap).toBe(false);
    expect(restoredState.incluyeEndCap).toBe(false);
  });

  it("preserves clienteTelefono", () => {
    expect(args.clienteTelefono).toBe("6621234567");
    expect(loadedData.clienteTelefono).toBe("6621234567");
    expect(restoredState.clienteTelefono).toBe("6621234567");
  });

  it("preserves clienteEmail", () => {
    expect(args.clienteEmail).toBe("juan@example.com");
    expect(loadedData.clienteEmail).toBe("juan@example.com");
    expect(restoredState.clienteEmail).toBe("juan@example.com");
  });

  it("preserves clienteUbicacion", () => {
    expect(args.clienteUbicacion).toBe("Hermosillo, Sonora");
    expect(loadedData.clienteUbicacion).toBe("Hermosillo, Sonora");
    expect(restoredState.clienteUbicacion).toBe("Hermosillo, Sonora");
  });

  it("preserves clienteNotas", () => {
    expect(args.clienteNotas).toBe("Cliente referido por Maria");
    expect(loadedData.clienteNotas).toBe("Cliente referido por Maria");
    expect(restoredState.clienteNotas).toBe("Cliente referido por Maria");
  });

  it("preserves etapa", () => {
    expect(args.etapa).toBe("negociacion");
    expect(loadedData.etapa).toBe("negociacion");
    expect(restoredState.etapa).toBe("negociacion");
  });

  it("preserves etapaNotas", () => {
    expect(args.etapaNotas).toBe("Pidio descuento 10%");
    expect(loadedData.etapaNotas).toBe("Pidio descuento 10%");
    expect(restoredState.etapaNotas).toBe("Pidio descuento 10%");
  });

  it("preserves fechaCierre", () => {
    expect(args.fechaCierre).toBe("2026-04-15");
    expect(loadedData.fechaCierre).toBe("2026-04-15");
    expect(restoredState.fechaCierre).toBe("2026-04-15");
  });

  it("preserves fechaInstalacion", () => {
    expect(args.fechaInstalacion).toBe("2026-05-01");
    expect(loadedData.fechaInstalacion).toBe("2026-05-01");
    expect(restoredState.fechaInstalacion).toBe("2026-05-01");
  });

  it("preserves probabilidadCierre", () => {
    expect(args.probabilidadCierre).toBe(75);
    expect(loadedData.probabilidadCierre).toBe(75);
    expect(restoredState.probabilidadCierre).toBe(75);
  });

  it("preserves origen", () => {
    expect(args.origen).toBe("referido");
    expect(loadedData.origen).toBe("referido");
    expect(restoredState.origen).toBe("referido");
  });

  it("preserves origenDetalle", () => {
    expect(args.origenDetalle).toBe("Maria Lopez, vecina");
    expect(loadedData.origenDetalle).toBe("Maria Lopez, vecina");
    expect(restoredState.origenDetalle).toBe("Maria Lopez, vecina");
  });

  it("preserves tags", () => {
    expect(args.tags).toEqual(["residencial", "hermosillo", "urgente"]);
    expect(loadedData.tags).toEqual(["residencial", "hermosillo", "urgente"]);
    expect(restoredState.tags).toEqual(["residencial", "hermosillo", "urgente"]);
  });

  // ── Pre-existing fields (should still work) ──

  it("preserves paneles data", () => {
    expect(restoredState.cantidad).toBe("20");
    expect(restoredState.potencia).toBe("545");
    expect(restoredState.precioPorWatt).toBe("0.22");
  });

  it("preserves microinversor data", () => {
    expect(restoredState.precioMicroinversor).toBe("180");
    expect(restoredState.precioCable).toBe("25");
    expect(restoredState.incluyeECU).toBe(true);
    expect(restoredState.incluyeHerramienta).toBe(true);
  });

  it("preserves recibo CFE", () => {
    expect(restoredState.reciboCFE).not.toBeNull();
    expect(restoredState.reciboCFE!.nombre).toBe("Juan Perez");
    expect(restoredState.reciboCFE!.consumoKwh).toBe(850);
    expect(restoredState.reciboCFE!.historico).toHaveLength(2);
  });

  it("preserves utilidad config", () => {
    expect(restoredState.utilidad.tipo).toBe("por_partida");
    expect(restoredState.utilidad.panelesPct).toBe(60);
    expect(restoredState.utilidad.montoFijo).toBe(5000);
  });

  it("preserves minisplits", () => {
    expect(restoredState.minisplits).toHaveLength(1);
    expect(restoredState.minisplits[0].toneladas).toBe("1.5");
  });

  it("preserves line items", () => {
    expect(restoredState.aluminio).toHaveLength(1);
    expect(restoredState.tornilleria).toHaveLength(1);
    expect(restoredState.generales).toHaveLength(2);
  });

  it("preserves tipo de cambio", () => {
    expect(restoredState.tcCustomPaneles).toBe("17.50");
    expect(restoredState.tcCustomMicros).toBe("17.80");
    expect(restoredState.tcFrozen).toBe(true);
  });

  it("reads server timestamps from doc", () => {
    expect(loadedData.creadoEn).toBe("2026-04-01T00:00:00.000Z");
    expect(loadedData.actualizadoEn).toBe("2026-04-06T12:00:00.000Z");
  });

  // ── Structural: detect any field dropped silently ──

  it("cotizacionDataToArgs includes ALL non-empty formData fields", () => {
    // Fields intentionally excluded (server-managed or derived)
    const EXCLUDED = new Set([
      "nombre", "fecha", "creadoEn", "actualizadoEn", "vistoPorUltimaVez",
    ]);

    const formKeys = Object.keys(formData).filter((k) => {
      const val = formData[k as keyof CotizacionData];
      return val !== undefined && val !== null && val !== "" && !EXCLUDED.has(k);
    });

    const argKeys = new Set(Object.keys(args));
    const missing = formKeys.filter((k) => !argKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("docToCotizacionData reads back ALL args fields", () => {
    const EXCLUDED = new Set(["nombre", "fecha"]);
    const argKeys = Object.keys(args).filter((k) => !EXCLUDED.has(k));

    const loadedKeys = new Set(
      Object.keys(loadedData).filter(
        (k) => loadedData[k as keyof CotizacionData] !== undefined,
      ),
    );

    const missing = argKeys.filter((k) => !loadedKeys.has(k));
    expect(missing).toEqual([]);
  });
});
