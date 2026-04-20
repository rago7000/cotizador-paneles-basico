import { query, mutation, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { cotizacionFieldsV } from "./validators";
import { Doc, Id } from "./_generated/dataModel";

// ── Cotizaciones principales ──

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cotizaciones").collect();
  },
});

export const listByEtapa = query({
  args: {
    etapa: v.union(
      v.literal("prospecto"),
      v.literal("cotizado"),
      v.literal("negociacion"),
      v.literal("cerrado_ganado"),
      v.literal("cerrado_perdido"),
      v.literal("instalado"),
    ),
  },
  handler: async (ctx, { etapa }) => {
    return await ctx.db
      .query("cotizaciones")
      .withIndex("by_etapa", (q) => q.eq("etapa", etapa))
      .take(100);
  },
});

export const getByNombre = query({
  args: { nombre: v.string() },
  handler: async (ctx, { nombre }) => {
    return await ctx.db
      .query("cotizaciones")
      .withIndex("by_nombre", (q) => q.eq("nombre", nombre))
      .first();
  },
});

/**
 * Sincroniza lazy el cliente+proyecto para una cotización.
 *
 * Si `clienteNombre` trae un nombre real (no vacío), hace upsert por nombre
 * en `clientes`, asegura un proyecto por defecto, y devuelve ambos ids
 * (y el recibo CFE espejado al proyecto, si existe).
 *
 * Si el nombre está vacío o no se proveyó, no crea nada y devuelve los ids
 * existentes en la cotización (si los hay). Esto permite que "Cliente sin nombre"
 * no ensucie la tabla de clientes con prospectos anónimos.
 */
async function syncClienteProyecto(
  ctx: MutationCtx,
  opts: {
    clienteNombre?: string;
    clienteTelefono?: string;
    clienteEmail?: string;
    clienteUbicacion?: string;
    clienteNotas?: string;
    reciboCFE?: Doc<"cotizaciones">["reciboCFE"];
    existingClienteId?: Id<"clientes">;
    existingProyectoId?: Id<"proyectos">;
  },
): Promise<{ clienteId?: Id<"clientes">; proyectoId?: Id<"proyectos">; clienteNombre?: string }> {
  const nombre = opts.clienteNombre?.trim();
  if (!nombre) {
    // Sin nombre, no tocamos clientes/proyectos
    return {
      clienteId: opts.existingClienteId,
      proyectoId: opts.existingProyectoId,
    };
  }

  const now = new Date().toISOString();

  // 1. Upsert cliente por nombre
  const existingCliente = await ctx.db
    .query("clientes")
    .withIndex("by_nombre", (q) => q.eq("nombre", nombre))
    .first();
  let clienteId: Id<"clientes">;
  if (existingCliente) {
    clienteId = existingCliente._id;
    await ctx.db.patch(existingCliente._id, {
      telefono: opts.clienteTelefono ?? existingCliente.telefono,
      email: opts.clienteEmail ?? existingCliente.email,
      ubicacion: opts.clienteUbicacion ?? existingCliente.ubicacion,
      notas: opts.clienteNotas ?? existingCliente.notas,
      actualizadoEn: now,
    });
  } else {
    clienteId = await ctx.db.insert("clientes", {
      nombre,
      telefono: opts.clienteTelefono,
      email: opts.clienteEmail,
      ubicacion: opts.clienteUbicacion,
      notas: opts.clienteNotas,
      creadoEn: now,
      actualizadoEn: now,
    });
  }

  // 2. Ensure proyecto: usa el existente si la cotización ya apuntaba a uno,
  //    si no, busca o crea el proyecto por defecto del cliente.
  let proyectoId: Id<"proyectos">;
  if (opts.existingProyectoId) {
    proyectoId = opts.existingProyectoId;
  } else {
    const existingProyecto = await ctx.db
      .query("proyectos")
      .withIndex("by_clienteId", (q) => q.eq("clienteId", clienteId))
      .first();
    if (existingProyecto) {
      proyectoId = existingProyecto._id;
    } else {
      proyectoId = await ctx.db.insert("proyectos", {
        clienteId,
        nombre: "Proyecto principal",
        ubicacion: opts.clienteUbicacion,
        reciboCFE: opts.reciboCFE,
        creadoEn: now,
        actualizadoEn: now,
      });
    }
  }

  // 3. Si el proyecto ya existía y nos llegó un recibo CFE, espejarlo
  //    (el recibo es propiedad del sitio, no de la cotización individual).
  if (opts.reciboCFE) {
    const proyecto = await ctx.db.get(proyectoId);
    if (proyecto && !proyecto.reciboCFE) {
      await ctx.db.patch(proyectoId, {
        reciboCFE: opts.reciboCFE,
        actualizadoEn: now,
      });
    }
  }

  return { clienteId, proyectoId, clienteNombre: nombre };
}

/**
 * Save a cotización with structured fields.
 * Upserts by nombre — patches existing or inserts new.
 * Además sincroniza lazy el cliente + proyecto asociados.
 */
export const save = mutation({
  args: cotizacionFieldsV,
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("cotizaciones")
      .withIndex("by_nombre", (q) => q.eq("nombre", args.nombre))
      .first();

    // Sincronización lazy cliente+proyecto (solo si hay nombre real).
    const { clienteId, proyectoId, clienteNombre } = await syncClienteProyecto(ctx, {
      clienteNombre: args.clienteNombre,
      clienteTelefono: args.clienteTelefono,
      clienteEmail: args.clienteEmail,
      clienteUbicacion: args.clienteUbicacion,
      clienteNotas: args.clienteNotas,
      reciboCFE: args.reciboCFE,
      existingClienteId: args.clienteId ?? existing?.clienteId,
      existingProyectoId: args.proyectoId ?? existing?.proyectoId,
    });

    const linkedFields = {
      clienteId: clienteId ?? args.clienteId,
      proyectoId: proyectoId ?? args.proyectoId,
      clienteNombre: clienteNombre ?? args.clienteNombre,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        ...linkedFields,
        creadoEn: existing.creadoEn ?? args.creadoEn ?? now,
        actualizadoEn: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("cotizaciones", {
      ...args,
      ...linkedFields,
      creadoEn: args.creadoEn ?? now,
      actualizadoEn: now,
      etapa: args.etapa ?? "prospecto",
    });
  },
});

export const remove = mutation({
  args: { nombre: v.string() },
  handler: async (ctx, { nombre }) => {
    const doc = await ctx.db
      .query("cotizaciones")
      .withIndex("by_nombre", (q) => q.eq("nombre", nombre))
      .first();
    if (doc) await ctx.db.delete(doc._id);
  },
});

/**
 * Soft-archive/unarchive: marca la cotización como archivada sin tocar `actualizadoEn`,
 * para que al desarchivar conserve su fecha real de última modificación.
 */
export const setArchived = mutation({
  args: { nombre: v.string(), archived: v.boolean() },
  handler: async (ctx, { nombre, archived }) => {
    const doc = await ctx.db
      .query("cotizaciones")
      .withIndex("by_nombre", (q) => q.eq("nombre", nombre))
      .first();
    if (!doc) return;
    await ctx.db.patch(doc._id, {
      archived,
      archivadoEn: archived ? new Date().toISOString() : undefined,
    });
  },
});

// ── Migration: JSON blob → structured fields ──

/**
 * One-time migration: parse legacy `data` JSON blobs and write structured fields.
 * Run from the Convex dashboard after deploying the schema change.
 * Safe to run multiple times — skips already-migrated documents.
 */
export const migrateToStructured = internalMutation({
  args: {},
  handler: async (ctx) => {
    const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

    /** Ensure every line item has an id */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ensureIds = (items: any[]) =>
      items.map((it) => it.id ? it : { ...it, id: uid() });

    const all = await ctx.db.query("cotizaciones").collect();
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const doc of all) {
      // Skip if no legacy blob
      if (!doc.data) { skipped++; continue; }
      // Skip if already migrated (has structured fields)
      if (doc.cantidad !== undefined) { skipped++; continue; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let d: any;
      try {
        d = JSON.parse(doc.data);
      } catch {
        errors.push(`Failed to parse JSON for "${doc.nombre}"`);
        continue;
      }

      // Build structured document, filtering out null/undefined values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const structured: Record<string, any> = {
        nombre: doc.nombre,
        fecha: doc.fecha,
      };

      // Scalar string fields
      const stringFields = [
        "tcCustomPaneles", "tcCustomMicros", "tcSnapshot",
        "cantidad", "potencia", "precioPorWatt", "fletePaneles", "garantiaPaneles",
        "precioMicroinversor", "precioCable", "precioECU",
        "precioHerramienta", "fleteMicros",
        "fleteAluminio",
        "panelCatalogoId", "microCatalogoId",
        "reciboPDFBase64",
        "minisplitTemporada",
      ] as const;

      for (const key of stringFields) {
        if (d[key] != null && d[key] !== "") {
          structured[key] = String(d[key]);
        }
      }

      // Boolean fields (preserve false)
      const boolFields = ["tcFrozen", "incluyeECU", "incluyeHerramienta"] as const;
      for (const key of boolFields) {
        if (d[key] != null) {
          structured[key] = Boolean(d[key]);
        }
      }

      // Array/object fields (ensure every line item has an id)
      if (Array.isArray(d.aluminio) && d.aluminio.length > 0) structured.aluminio = ensureIds(d.aluminio);
      if (Array.isArray(d.tornilleria) && d.tornilleria.length > 0) structured.tornilleria = ensureIds(d.tornilleria);
      if (Array.isArray(d.generales) && d.generales.length > 0) structured.generales = ensureIds(d.generales);
      if (d.reciboCFE != null) structured.reciboCFE = d.reciboCFE;
      if (Array.isArray(d.minisplits) && d.minisplits.length > 0) structured.minisplits = d.minisplits;
      if (d.utilidad != null) structured.utilidad = d.utilidad;

      try {
        // Replace clears the old `data` field (not included in structured)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.db.replace(doc._id, structured as any);
        migrated++;
      } catch (e) {
        errors.push(`Failed to migrate "${doc.nombre}": ${e}`);
      }
    }

    return { migrated, skipped, errors, total: all.length };
  },
});

/**
 * One-time backfill: recorre todas las cotizaciones existentes y, usando
 * `clienteNombre` (o como fallback `reciboCFE.nombre`), crea/enlaza
 * cliente + proyecto. Es idempotente — se puede correr varias veces.
 *
 * Run desde el Convex dashboard después de desplegar el esquema:
 *   internal.cotizaciones.backfillClientesProyectos()
 */
export const backfillClientesProyectos = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("cotizaciones").collect();
    let linked = 0;
    let skippedAnonymous = 0;
    let skippedAlreadyLinked = 0;
    const errors: string[] = [];

    for (const c of all) {
      // Si ya está enlazado, skip
      if (c.clienteId && c.proyectoId) {
        skippedAlreadyLinked++;
        continue;
      }

      // Resolver nombre del cliente
      const nombre = (c.clienteNombre ?? c.reciboCFE?.nombre ?? "").trim();
      if (!nombre) {
        skippedAnonymous++;
        continue;
      }

      try {
        const { clienteId, proyectoId } = await syncClienteProyecto(ctx, {
          clienteNombre: nombre,
          clienteTelefono: c.clienteTelefono,
          clienteEmail: c.clienteEmail,
          clienteUbicacion: c.clienteUbicacion,
          clienteNotas: c.clienteNotas,
          reciboCFE: c.reciboCFE,
          existingClienteId: c.clienteId,
          existingProyectoId: c.proyectoId,
        });
        await ctx.db.patch(c._id, {
          clienteId,
          proyectoId,
          clienteNombre: nombre,
        });
        linked++;
      } catch (e) {
        errors.push(`"${c.nombre}": ${e}`);
      }
    }

    return {
      total: all.length,
      linked,
      skippedAnonymous,
      skippedAlreadyLinked,
      errors,
    };
  },
});

// ── Cotizaciones Cliente ──

export const listCliente = query({
  args: { cotizacionBase: v.optional(v.string()) },
  handler: async (ctx, { cotizacionBase }) => {
    if (cotizacionBase) {
      return await ctx.db
        .query("cotizacionesCliente")
        .withIndex("by_cotizacionBase", (q) => q.eq("cotizacionBase", cotizacionBase))
        .collect();
    }
    return await ctx.db.query("cotizacionesCliente").collect();
  },
});

export const saveCliente = mutation({
  args: {
    id: v.optional(v.id("cotizacionesCliente")),
    cotizacionBase: v.string(),
    nombre: v.string(),
    fecha: v.string(),
    data: v.string(), // JSON serialized
  },
  handler: async (ctx, args) => {
    if (args.id) {
      const { id, ...data } = args;
      await ctx.db.patch(id, data);
      return id;
    }
    const { id: _id, ...data } = args;
    return await ctx.db.insert("cotizacionesCliente", data);
  },
});

export const removeCliente = mutation({
  args: { id: v.id("cotizacionesCliente") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// ── Seguimiento ──

export const getSeguimiento = query({
  args: { cotizacionNombre: v.string() },
  handler: async (ctx, { cotizacionNombre }) => {
    return await ctx.db
      .query("seguimiento")
      .withIndex("by_cotizacionNombre", (q) => q.eq("cotizacionNombre", cotizacionNombre))
      .first();
  },
});

export const saveSeguimiento = mutation({
  args: {
    cotizacionNombre: v.string(),
    items: v.string(), // JSON serialized
    fechaActualizacion: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("seguimiento")
      .withIndex("by_cotizacionNombre", (q) => q.eq("cotizacionNombre", args.cotizacionNombre))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        items: args.items,
        fechaActualizacion: args.fechaActualizacion,
      });
      return existing._id;
    }
    return await ctx.db.insert("seguimiento", args);
  },
});
