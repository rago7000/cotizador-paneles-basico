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

    guardarCotizacion: async (nombre: string, data: unknown) => {
      await saveMut({
        nombre,
        fecha: new Date().toISOString(),
        data: JSON.stringify(data),
      });
    },

    cargarCotizacion: (nombre: string) => {
      const found = list.find((c) => c.nombre === nombre);
      if (!found) return null;
      try { return JSON.parse(found.data); } catch { return null; }
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
