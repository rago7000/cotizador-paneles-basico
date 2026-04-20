import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { reciboCFEV } from "./validators";

// ── Proyectos (sitio físico / instalación; un cliente puede tener varios) ──

export const list = query({
  args: { clienteId: v.optional(v.id("clientes")), incluirArchivados: v.optional(v.boolean()) },
  handler: async (ctx, { clienteId, incluirArchivados }) => {
    const base = clienteId
      ? await ctx.db
          .query("proyectos")
          .withIndex("by_clienteId_and_actualizadoEn", (q) => q.eq("clienteId", clienteId))
          .order("desc")
          .take(500)
      : await ctx.db.query("proyectos").order("desc").take(500);
    return incluirArchivados ? base : base.filter((p) => !p.archived);
  },
});

export const get = query({
  args: { id: v.id("proyectos") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

const proyectoFieldsV = {
  clienteId: v.id("clientes"),
  nombre: v.string(),
  ubicacion: v.optional(v.string()),
  reciboCFE: v.optional(reciboCFEV),
  notas: v.optional(v.string()),
};

export const create = mutation({
  args: proyectoFieldsV,
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("proyectos", {
      ...args,
      creadoEn: now,
      actualizadoEn: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("proyectos"),
    nombre: v.optional(v.string()),
    ubicacion: v.optional(v.string()),
    reciboCFE: v.optional(reciboCFEV),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      actualizadoEn: new Date().toISOString(),
    });
    return id;
  },
});

/**
 * Busca o crea el proyecto "por defecto" de un cliente.
 * Usado por el cotizador para asociar una cotización a un proyecto sin
 * obligar al usuario a crearlo explícitamente (el 80% de los casos es 1 cliente = 1 proyecto).
 */
export const ensureDefaultForCliente = mutation({
  args: { clienteId: v.id("clientes"), nombreSugerido: v.optional(v.string()) },
  handler: async (ctx, { clienteId, nombreSugerido }) => {
    const existente = await ctx.db
      .query("proyectos")
      .withIndex("by_clienteId", (q) => q.eq("clienteId", clienteId))
      .first();
    if (existente) return existente._id;
    const now = new Date().toISOString();
    return await ctx.db.insert("proyectos", {
      clienteId,
      nombre: nombreSugerido || "Proyecto principal",
      creadoEn: now,
      actualizadoEn: now,
    });
  },
});

export const setArchived = mutation({
  args: { id: v.id("proyectos"), archived: v.boolean() },
  handler: async (ctx, { id, archived }) => {
    await ctx.db.patch(id, {
      archived,
      archivadoEn: archived ? new Date().toISOString() : undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("proyectos") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
