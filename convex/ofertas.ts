import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("ofertas").collect();
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("ofertas")),
    proveedorId: v.id("proveedores"),
    productoId: v.string(),
    productoTabla: v.string(),
    tipo: v.string(),
    precio: v.number(),
    precioTiers: v.optional(
      v.array(v.object({ etiqueta: v.string(), precio: v.number() }))
    ),
    precioCable: v.optional(v.number()),
    fecha: v.string(),
    notas: v.string(),
    archivoOrigenId: v.optional(v.id("archivosProveedor")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    if (args.id) {
      const { id, ...data } = args;
      await ctx.db.patch(id, data);
      return id;
    }
    const { id: _id, ...data } = args;
    return await ctx.db.insert("ofertas", { ...data, creadoEn: now });
  },
});

export const remove = mutation({
  args: { id: v.id("ofertas") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// ── Dedup: eliminar ofertas duplicadas (mismo producto+proveedor+precio+fecha) ──
export const dedup = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("ofertas").collect();
    const seen = new Map<string, string>(); // key → first _id
    let removed = 0;

    // Sort by _creationTime ascending so we keep the FIRST one
    all.sort((a, b) => a._creationTime - b._creationTime);

    for (const o of all) {
      const key = `${o.productoId}|${o.proveedorId}|${o.precio}|${o.fecha}`;
      if (seen.has(key)) {
        await ctx.db.delete(o._id);
        removed++;
      } else {
        seen.set(key, o._id);
      }
    }
    return { total: all.length, removed, remaining: all.length - removed };
  },
});

// ── Dedup productos huérfanos (sin ninguna oferta) ──
export const cleanOrphanProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const ofertas = await ctx.db.query("ofertas").collect();
    const usedProductIds = new Set(ofertas.map((o) => o.productoId));

    let removed = 0;
    for (const table of ["productosPaneles", "productosMicros", "productosGenerales"] as const) {
      const products = await ctx.db.query(table).collect();
      for (const p of products) {
        if (!usedProductIds.has(p._id)) {
          await ctx.db.delete(p._id);
          removed++;
        }
      }
    }
    return { removed };
  },
});
