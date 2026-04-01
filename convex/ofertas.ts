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
    if (args.id) {
      const { id, ...data } = args;
      await ctx.db.patch(id, data);
      return id;
    }
    const { id: _id, ...data } = args;
    return await ctx.db.insert("ofertas", data);
  },
});

export const remove = mutation({
  args: { id: v.id("ofertas") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
