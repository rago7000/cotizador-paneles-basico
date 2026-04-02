import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { cotizacionFieldsV } from "./validators";

// ── Cotizaciones principales ──

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cotizaciones").collect();
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
 * Save a cotización with structured fields.
 * Upserts by nombre — patches existing or inserts new.
 */
export const save = mutation({
  args: cotizacionFieldsV,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cotizaciones")
      .withIndex("by_nombre", (q) => q.eq("nombre", args.nombre))
      .first();
    if (existing) {
      await ctx.db.replace(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("cotizaciones", args);
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
