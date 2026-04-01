import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

export const save = mutation({
  args: {
    nombre: v.string(),
    fecha: v.string(),
    data: v.string(), // JSON serialized
  },
  handler: async (ctx, args) => {
    // Upsert by nombre
    const existing = await ctx.db
      .query("cotizaciones")
      .withIndex("by_nombre", (q) => q.eq("nombre", args.nombre))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { data: args.data, fecha: args.fecha });
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
