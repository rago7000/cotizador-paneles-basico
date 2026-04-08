import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("configEmpresa").first();
  },
});

export const save = mutation({
  args: {
    nombre: v.string(),
    calle: v.optional(v.string()),
    numeroExterior: v.optional(v.string()),
    colonia: v.optional(v.string()),
    codigoPostal: v.optional(v.string()),
    municipio: v.optional(v.string()),
    estado: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    puesto: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("configEmpresa").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("configEmpresa", args);
  },
});
