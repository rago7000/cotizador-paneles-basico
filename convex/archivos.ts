import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("archivosProveedor").collect();
  },
});

export const get = query({
  args: { id: v.id("archivosProveedor") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("archivosProveedor")),
    nombre: v.string(),
    proveedorId: v.id("proveedores"),
    fechaImportacion: v.string(),
    fechaDocumento: v.string(),
    condiciones: v.string(),
    resumenCondiciones: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (args.id) {
      const { id, ...data } = args;
      await ctx.db.patch(id, data);
      return id;
    }
    const { id: _id, ...data } = args;
    return await ctx.db.insert("archivosProveedor", data);
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const remove = mutation({
  args: { id: v.id("archivosProveedor") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
