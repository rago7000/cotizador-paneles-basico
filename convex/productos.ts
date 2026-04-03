import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Paneles ──

export const listPaneles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("productosPaneles").collect();
  },
});

export const savePanel = mutation({
  args: {
    id: v.optional(v.id("productosPaneles")),
    marca: v.string(),
    modelo: v.string(),
    potencia: v.number(),
    aliases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.id) {
      const { id, ...data } = args;
      await ctx.db.patch(id, data);
      return id;
    }
    return await ctx.db.insert("productosPaneles", {
      marca: args.marca,
      modelo: args.modelo,
      potencia: args.potencia,
      aliases: args.aliases,
    });
  },
});

export const setDefaultPanel = mutation({
  args: { id: v.id("productosPaneles") },
  handler: async (ctx, { id }) => {
    // Clear previous default
    const all = await ctx.db.query("productosPaneles").collect();
    for (const p of all) {
      if (p.esDefault) await ctx.db.patch(p._id, { esDefault: undefined });
    }
    // Set new default
    await ctx.db.patch(id, { esDefault: true });
  },
});

export const removePanel = mutation({
  args: { id: v.id("productosPaneles") },
  handler: async (ctx, { id }) => {
    const ofertas = await ctx.db
      .query("ofertas")
      .withIndex("by_productoId", (q) => q.eq("productoId", id))
      .collect();
    for (const o of ofertas) await ctx.db.delete(o._id);
    await ctx.db.delete(id);
  },
});

// ── Microinversores ──

export const listMicros = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("productosMicros").collect();
  },
});

export const saveMicro = mutation({
  args: {
    id: v.optional(v.id("productosMicros")),
    marca: v.string(),
    modelo: v.string(),
    panelesPorUnidad: v.number(),
    aliases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.id) {
      const { id, ...data } = args;
      await ctx.db.patch(id, data);
      return id;
    }
    return await ctx.db.insert("productosMicros", {
      marca: args.marca,
      modelo: args.modelo,
      panelesPorUnidad: args.panelesPorUnidad,
      aliases: args.aliases,
    });
  },
});

export const removeMicro = mutation({
  args: { id: v.id("productosMicros") },
  handler: async (ctx, { id }) => {
    const ofertas = await ctx.db
      .query("ofertas")
      .withIndex("by_productoId", (q) => q.eq("productoId", id))
      .collect();
    for (const o of ofertas) await ctx.db.delete(o._id);
    await ctx.db.delete(id);
  },
});

// ── Generales (monitoreo, cable, herramienta, etc.) ──

export const listGenerales = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("productosGenerales").collect();
  },
});

export const saveGeneral = mutation({
  args: {
    id: v.optional(v.id("productosGenerales")),
    categoria: v.string(),
    marca: v.string(),
    modelo: v.string(),
    descripcion: v.string(),
    aliases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.id) {
      const { id, ...data } = args;
      await ctx.db.patch(id, data);
      return id;
    }
    return await ctx.db.insert("productosGenerales", {
      categoria: args.categoria,
      marca: args.marca,
      modelo: args.modelo,
      descripcion: args.descripcion,
      aliases: args.aliases,
    });
  },
});

export const removeGeneral = mutation({
  args: { id: v.id("productosGenerales") },
  handler: async (ctx, { id }) => {
    const ofertas = await ctx.db
      .query("ofertas")
      .withIndex("by_productoId", (q) => q.eq("productoId", id))
      .collect();
    for (const o of ofertas) await ctx.db.delete(o._id);
    await ctx.db.delete(id);
  },
});
