import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("proveedores").collect();
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("proveedores")),
    nombre: v.string(),
    contacto: v.string(),
    telefono: v.string(),
    notas: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.id) {
      const { id, ...data } = args;
      await ctx.db.patch(id, data);
      return id;
    }
    return await ctx.db.insert("proveedores", {
      nombre: args.nombre,
      contacto: args.contacto,
      telefono: args.telefono,
      notas: args.notas,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("proveedores") },
  handler: async (ctx, { id }) => {
    // Cascade: delete linked ofertas and archivos
    const ofertas = await ctx.db
      .query("ofertas")
      .withIndex("by_proveedorId", (q) => q.eq("proveedorId", id))
      .collect();
    for (const o of ofertas) await ctx.db.delete(o._id);

    const archivos = await ctx.db.query("archivosProveedor").collect();
    for (const a of archivos) {
      if (a.proveedorId === id) await ctx.db.delete(a._id);
    }

    await ctx.db.delete(id);
  },
});
