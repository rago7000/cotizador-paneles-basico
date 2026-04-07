"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { TipoOferta } from "./types";

// Re-export Convex Id type for convenience
export type { Id };

// ── Mapped types (Convex docs → app types) ──────────────────────────────────

// These interfaces match the old localStorage types but use Convex _id
export interface Proveedor {
  _id: Id<"proveedores">;
  id: string; // alias for _id
  nombre: string;
  contacto: string;
  telefono: string;
  notas: string;
}

export interface ProductoPanel {
  _id: Id<"productosPaneles">;
  id: string;
  marca: string;
  modelo: string;
  potencia: number;
  aliases?: string[];
  esDefault?: boolean;
}

export interface ProductoMicro {
  _id: Id<"productosMicros">;
  id: string;
  marca: string;
  modelo: string;
  panelesPorUnidad: number;
  aliases?: string[];
}

export interface ProductoGeneral {
  _id: Id<"productosGenerales">;
  id: string;
  categoria: string;
  marca: string;
  modelo: string;
  descripcion: string;
  aliases?: string[];
}

export interface Oferta {
  _id: Id<"ofertas">;
  id: string;
  proveedorId: string;
  productoId: string;
  productoTabla: string;
  tipo: TipoOferta;
  precio: number;
  precioTiers?: { etiqueta: string; precio: number }[];
  precioCable?: number;
  fecha: string;
  creadoEn?: string;
  notas: string;
  archivoOrigenId?: string;
}

export interface ArchivoProveedor {
  _id: Id<"archivosProveedor">;
  id: string;
  nombre: string;
  proveedorId: string;
  fechaImportacion: string;
  fechaDocumento: string;
  condiciones: string;
  resumenCondiciones: string;
  storageId?: string;
}

// ── Helper: add `id` alias for `_id` ────────────────────────────────────────

function addId<T extends { _id: string }>(doc: T): T & { id: string } {
  return { ...doc, id: doc._id };
}

// ── Main hook ────────────────────────────────────────────────────────────────

export function useConvexCatalogo() {
  // Queries (reactive, auto-update)
  const rawProveedores = useQuery(api.proveedores.list) ?? [];
  const rawPaneles = useQuery(api.productos.listPaneles) ?? [];
  const rawMicros = useQuery(api.productos.listMicros) ?? [];
  const rawGenerales = useQuery(api.productos.listGenerales) ?? [];
  const rawOfertas = useQuery(api.ofertas.list) ?? [];
  const rawArchivos = useQuery(api.archivos.list) ?? [];

  // Map to add `id` alias
  const proveedores = rawProveedores.map(addId) as Proveedor[];
  const paneles = rawPaneles.map(addId) as ProductoPanel[];
  const micros = rawMicros.map(addId) as ProductoMicro[];
  const generales = rawGenerales.map(addId) as ProductoGeneral[];
  const ofertas = rawOfertas.map((o) => ({
    ...addId(o),
    proveedorId: o.proveedorId as string,
    archivoOrigenId: o.archivoOrigenId as string | undefined,
    creadoEn: o.creadoEn || new Date(o._creationTime).toISOString(),
  })) as Oferta[];
  const archivos = rawArchivos.map((a) => ({
    ...addId(a),
    proveedorId: a.proveedorId as string,
  })) as ArchivoProveedor[];

  // Mutations
  const saveProveedorMut = useMutation(api.proveedores.save);
  const removeProveedorMut = useMutation(api.proveedores.remove);
  const savePanelMut = useMutation(api.productos.savePanel);
  const removePanelMut = useMutation(api.productos.removePanel);
  const setDefaultPanelMut = useMutation(api.productos.setDefaultPanel);
  const saveMicroMut = useMutation(api.productos.saveMicro);
  const removeMicroMut = useMutation(api.productos.removeMicro);
  const saveGeneralMut = useMutation(api.productos.saveGeneral);
  const removeGeneralMut = useMutation(api.productos.removeGeneral);
  const saveOfertaMut = useMutation(api.ofertas.save);
  const removeOfertaMut = useMutation(api.ofertas.remove);
  const saveArchivoMut = useMutation(api.archivos.save);
  const removeArchivoMut = useMutation(api.archivos.remove);
  const generateUploadUrlMut = useMutation(api.archivos.generateUploadUrl);

  // Loading state
  const isLoading =
    rawProveedores === undefined ||
    rawPaneles === undefined ||
    rawMicros === undefined ||
    rawGenerales === undefined ||
    rawOfertas === undefined;

  return {
    // Data (reactive)
    proveedores,
    paneles,
    micros,
    generales,
    ofertas,
    archivos,
    isLoading,

    // Mutations (async)
    guardarProveedor: async (p: { id?: string; nombre: string; contacto: string; telefono: string; notas: string }) => {
      return await saveProveedorMut({
        id: p.id as Id<"proveedores"> | undefined,
        nombre: p.nombre,
        contacto: p.contacto,
        telefono: p.telefono,
        notas: p.notas,
      });
    },
    eliminarProveedor: async (id: string) => {
      await removeProveedorMut({ id: id as Id<"proveedores"> });
    },

    guardarProductoPanel: async (p: { id?: string; marca: string; modelo: string; potencia: number; aliases?: string[] }) => {
      return await savePanelMut({
        id: p.id as Id<"productosPaneles"> | undefined,
        marca: p.marca,
        modelo: p.modelo,
        potencia: p.potencia,
        aliases: p.aliases,
      });
    },
    eliminarProductoPanel: async (id: string) => {
      await removePanelMut({ id: id as Id<"productosPaneles"> });
    },
    setDefaultPanel: async (id: string) => {
      await setDefaultPanelMut({ id: id as Id<"productosPaneles"> });
    },

    guardarProductoMicro: async (p: { id?: string; marca: string; modelo: string; panelesPorUnidad: number; aliases?: string[] }) => {
      return await saveMicroMut({
        id: p.id as Id<"productosMicros"> | undefined,
        marca: p.marca,
        modelo: p.modelo,
        panelesPorUnidad: p.panelesPorUnidad,
        aliases: p.aliases,
      });
    },
    eliminarProductoMicro: async (id: string) => {
      await removeMicroMut({ id: id as Id<"productosMicros"> });
    },

    guardarProductoGeneral: async (p: { id?: string; categoria: string; marca: string; modelo: string; descripcion: string; aliases?: string[] }) => {
      return await saveGeneralMut({
        id: p.id as Id<"productosGenerales"> | undefined,
        categoria: p.categoria,
        marca: p.marca,
        modelo: p.modelo,
        descripcion: p.descripcion,
        aliases: p.aliases,
      });
    },
    eliminarProductoGeneral: async (id: string) => {
      await removeGeneralMut({ id: id as Id<"productosGenerales"> });
    },

    guardarOferta: async (o: {
      id?: string;
      proveedorId: string;
      productoId: string;
      productoTabla?: string;
      tipo: string;
      precio: number;
      precioTiers?: { etiqueta: string; precio: number }[];
      precioCable?: number;
      fecha: string;
      notas: string;
      archivoOrigenId?: string;
    }) => {
      return await saveOfertaMut({
        id: o.id as Id<"ofertas"> | undefined,
        proveedorId: o.proveedorId as Id<"proveedores">,
        productoId: o.productoId,
        productoTabla: o.productoTabla || (o.tipo === "panel" ? "productosPaneles" : o.tipo === "micro" ? "productosMicros" : "productosGenerales"),
        tipo: o.tipo,
        precio: o.precio,
        precioTiers: o.precioTiers,
        precioCable: o.precioCable,
        fecha: o.fecha,
        notas: o.notas,
        archivoOrigenId: o.archivoOrigenId as Id<"archivosProveedor"> | undefined,
      });
    },
    eliminarOferta: async (id: string) => {
      await removeOfertaMut({ id: id as Id<"ofertas"> });
    },

    guardarArchivoProveedor: async (a: {
      id?: string;
      nombre: string;
      proveedorId: string;
      fechaImportacion: string;
      fechaDocumento: string;
      condiciones: string;
      resumenCondiciones: string;
      storageId?: string;
    }) => {
      return await saveArchivoMut({
        id: a.id as Id<"archivosProveedor"> | undefined,
        nombre: a.nombre,
        proveedorId: a.proveedorId as Id<"proveedores">,
        fechaImportacion: a.fechaImportacion,
        fechaDocumento: a.fechaDocumento,
        condiciones: a.condiciones,
        resumenCondiciones: a.resumenCondiciones,
        storageId: a.storageId as Id<"_storage"> | undefined,
      });
    },
    subirArchivo: async (file: File): Promise<string> => {
      const uploadUrl = await generateUploadUrlMut();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      return storageId as string;
    },
    eliminarArchivoProveedor: async (id: string) => {
      await removeArchivoMut({ id: id as Id<"archivosProveedor"> });
    },
  };
}

// ── Cotizaciones hook (separate, used by cotizador page) ─────────────────────

import type {
  CotizacionData,
  LineItem,
  UtilidadConfig,
} from "./types";

/**
 * Strip null/undefined values from an object.
 * Convex doesn't accept `undefined` as a value — omit the key instead.
 */
function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined),
  ) as Partial<T>;
}

/**
 * Convert app-side CotizacionData → Convex structured mutation args.
 * Filters out null/undefined so Convex receives only defined fields.
 */
function cotizacionDataToArgs(nombre: string, data: CotizacionData) {
  return pickDefined({
    nombre,
    fecha: data.fecha,
    cotizacionId: data.cotizacionId || undefined,
    // Tipo de cambio
    tcCustomPaneles: data.tcCustomPaneles || undefined,
    tcCustomMicros: data.tcCustomMicros || undefined,
    tcSnapshot: data.tcSnapshot || undefined,
    tcFrozen: data.tcFrozen || undefined,
    // Paneles
    cantidad: data.cantidad || undefined,
    potencia: data.potencia || undefined,
    precioPorWatt: data.precioPorWatt || undefined,
    fletePaneles: data.fletePaneles || undefined,
    garantiaPaneles: data.garantiaPaneles || undefined,
    // Microinversores
    precioMicroinversor: data.precioMicroinversor || undefined,
    precioCable: data.precioCable || undefined,
    precioECU: data.precioECU || undefined,
    incluyeECU: data.incluyeECU,   // preserve boolean false
    precioHerramienta: data.precioHerramienta || undefined,
    incluyeHerramienta: data.incluyeHerramienta, // preserve boolean false
    precioEndCap: data.precioEndCap || undefined,
    incluyeEndCap: data.incluyeEndCap,  // preserve boolean false
    fleteMicros: data.fleteMicros || undefined,
    // Estructura
    aluminio: data.aluminio?.length ? data.aluminio : undefined,
    fleteAluminio: data.fleteAluminio || undefined,
    // Tornillería
    tornilleria: data.tornilleria?.length ? data.tornilleria : undefined,
    // Generales
    generales: data.generales?.length ? data.generales : undefined,
    // Catálogo refs
    panelCatalogoId: data.panelCatalogoId || undefined,
    microCatalogoId: data.microCatalogoId || undefined,
    // Recibo CFE
    reciboCFE: data.reciboCFE ?? undefined,
    reciboPDFBase64: data.reciboPDFBase64 ?? undefined,
    // Minisplits
    minisplits: data.minisplits?.length ? data.minisplits : undefined,
    minisplitTemporada: data.minisplitTemporada || undefined,
    // Utilidad
    utilidad: data.utilidad ?? undefined,
    // Cliente / Contacto
    clienteTelefono: data.clienteTelefono || undefined,
    clienteEmail: data.clienteEmail || undefined,
    clienteUbicacion: data.clienteUbicacion || undefined,
    clienteNotas: data.clienteNotas || undefined,
    // Pipeline
    etapa: data.etapa,  // always include — even "prospecto" default
    etapaNotas: data.etapaNotas || undefined,
    fechaCierre: data.fechaCierre || undefined,
    fechaInstalacion: data.fechaInstalacion || undefined,
    probabilidadCierre: data.probabilidadCierre != null && data.probabilidadCierre > 0 ? data.probabilidadCierre : undefined,
    // Origen
    origen: data.origen || undefined,
    origenDetalle: data.origenDetalle || undefined,
    // Tags
    tags: data.tags?.length ? data.tags : undefined,
  });
}

/**
 * Convert Convex document → app-side CotizacionData.
 * Handles both structured documents and legacy JSON blobs (for migration).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToCotizacionData(doc: any): CotizacionData | null {
  // Legacy format: has `data` JSON blob but no structured fields
  if (doc.data && doc.cantidad === undefined) {
    try { return JSON.parse(doc.data); } catch { return null; }
  }

  // Structured format
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
    // Cliente / Contacto
    clienteTelefono: doc.clienteTelefono,
    clienteEmail: doc.clienteEmail,
    clienteUbicacion: doc.clienteUbicacion,
    clienteNotas: doc.clienteNotas,
    // Pipeline
    etapa: doc.etapa,
    etapaNotas: doc.etapaNotas,
    fechaCierre: doc.fechaCierre,
    fechaInstalacion: doc.fechaInstalacion,
    probabilidadCierre: doc.probabilidadCierre,
    // Origen
    origen: doc.origen,
    origenDetalle: doc.origenDetalle,
    // Timestamps (read-only from server)
    creadoEn: doc.creadoEn,
    actualizadoEn: doc.actualizadoEn,
    // Tags
    tags: doc.tags,
  };
}

export function useConvexCotizaciones() {
  const rawList = useQuery(api.cotizaciones.list) ?? [];
  const list = rawList.map(addId);

  const saveMut = useMutation(api.cotizaciones.save);
  const removeMut = useMutation(api.cotizaciones.remove);
  const saveClienteMut = useMutation(api.cotizaciones.saveCliente);
  const removeClienteMut = useMutation(api.cotizaciones.removeCliente);
  const saveSeguimientoMut = useMutation(api.cotizaciones.saveSeguimiento);

  return {
    cotizaciones: list,

    guardarCotizacion: async (nombre: string, data: CotizacionData) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveMut(cotizacionDataToArgs(nombre, data) as any);
    },

    cargarCotizacion: (nombre: string): CotizacionData | null => {
      const found = list.find((c) => c.nombre === nombre);
      if (!found) return null;
      return docToCotizacionData(found);
    },

    eliminarCotizacion: async (nombre: string) => {
      await removeMut({ nombre });
    },

    guardarSeguimiento: async (cotizacionNombre: string, items: unknown) => {
      await saveSeguimientoMut({
        cotizacionNombre,
        items: JSON.stringify(items),
        fechaActualizacion: new Date().toISOString(),
      });
    },

    guardarCotizacionCliente: async (c: { id?: string; cotizacionBase: string; nombre: string; fecha: string; data: unknown }) => {
      return await saveClienteMut({
        id: c.id as Id<"cotizacionesCliente"> | undefined,
        cotizacionBase: c.cotizacionBase,
        nombre: c.nombre,
        fecha: c.fecha,
        data: typeof c.data === "string" ? c.data : JSON.stringify(c.data),
      });
    },

    eliminarCotizacionCliente: async (id: string) => {
      await removeClienteMut({ id: id as Id<"cotizacionesCliente"> });
    },
  };
}

// ── Pure helper functions (no DB needed) ─────────────────────────────────────

export function ofertasPorProducto(productoId: string, ofertas: Oferta[]): Oferta[] {
  return ofertas
    .filter((o) => o.productoId === productoId)
    .sort((a, b) => a.precio - b.precio);
}

export function mejorOferta(productoId: string, ofertas: Oferta[]): Oferta | null {
  const list = ofertasPorProducto(productoId, ofertas);
  return list.length > 0 ? list[0] : null;
}

export function tendenciaOferta(productoId: string, proveedorId: string, ofertas: Oferta[]): "up" | "down" | "stable" | "new" {
  const list = ofertas
    .filter((o) => o.productoId === productoId && o.proveedorId === proveedorId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (list.length < 2) return "new";
  const last = list[list.length - 1].precio;
  const prev = list[list.length - 2].precio;
  if (last > prev) return "up";
  if (last < prev) return "down";
  return "stable";
}

export function historialPrecios(productoId: string, proveedorId: string, ofertas: Oferta[]): Oferta[] {
  return ofertas
    .filter((o) => o.productoId === productoId && o.proveedorId === proveedorId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
