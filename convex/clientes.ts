import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { origenV } from "./validators";

// ── Clientes (persona / empresa reutilizable entre proyectos y cotizaciones) ──

export const list = query({
  args: { incluirArchivados: v.optional(v.boolean()) },
  handler: async (ctx, { incluirArchivados }) => {
    const all = await ctx.db
      .query("clientes")
      .withIndex("by_actualizadoEn")
      .order("desc")
      .take(500);
    return incluirArchivados ? all : all.filter((c) => !c.archived);
  },
});

export const get = query({
  args: { id: v.id("clientes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Returns clients grouped with their proyectos and cotizaciones.
 * Shape:
 *   [{ ...cliente, proyectos: [{ ...proyecto, cotizaciones: [{ _id, nombre, fecha, etapa, actualizadoEn, archived }] }] }]
 *
 * Limit: 200 clientes máximo. Pensado para la vista /clientes.
 */
export const listWithProyectos = query({
  args: { incluirArchivados: v.optional(v.boolean()) },
  handler: async (ctx, { incluirArchivados }) => {
    const clientes = await ctx.db
      .query("clientes")
      .withIndex("by_actualizadoEn")
      .order("desc")
      .take(200);
    const visibles = incluirArchivados ? clientes : clientes.filter((c) => !c.archived);

    // Leemos cotizaciones una sola vez y las agrupamos por proyectoId en memoria.
    // Aceptable mientras el volumen total sea moderado (<500 cotizaciones).
    const todasCot = await ctx.db.query("cotizaciones").take(500);
    const cotPorProyecto = new Map<string, typeof todasCot>();
    for (const c of todasCot) {
      if (!c.proyectoId) continue;
      const arr = cotPorProyecto.get(c.proyectoId) ?? [];
      arr.push(c);
      cotPorProyecto.set(c.proyectoId, arr);
    }

    return await Promise.all(
      visibles.map(async (cliente) => {
        const proyectos = await ctx.db
          .query("proyectos")
          .withIndex("by_clienteId", (q) => q.eq("clienteId", cliente._id))
          .take(50);

        const proyectosConCotizaciones = proyectos.map((p) => ({
          ...p,
          cotizaciones: (cotPorProyecto.get(p._id) ?? []).map((c) => ({
            _id: c._id,
            nombre: c.nombre,
            fecha: c.fecha,
            etapa: c.etapa,
            actualizadoEn: c.actualizadoEn,
            archived: c.archived,
          })),
        }));

        return { ...cliente, proyectos: proyectosConCotizaciones };
      }),
    );
  },
});

export const getByNombre = query({
  args: { nombre: v.string() },
  handler: async (ctx, { nombre }) => {
    return await ctx.db
      .query("clientes")
      .withIndex("by_nombre", (q) => q.eq("nombre", nombre))
      .first();
  },
});

const clienteFieldsV = {
  nombre: v.string(),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  ubicacion: v.optional(v.string()),
  notas: v.optional(v.string()),
  origen: v.optional(origenV),
  origenDetalle: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
};

/**
 * Upsert por nombre: si existe un cliente con el mismo nombre lo actualiza,
 * si no, lo crea. Devuelve el id. Pensado para sincronización lazy desde
 * el cotizador (un nombre repetido = el mismo cliente).
 */
export const upsertByNombre = mutation({
  args: clienteFieldsV,
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("clientes")
      .withIndex("by_nombre", (q) => q.eq("nombre", args.nombre))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, actualizadoEn: now });
      return existing._id;
    }
    return await ctx.db.insert("clientes", {
      ...args,
      creadoEn: now,
      actualizadoEn: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clientes"),
    ...clienteFieldsV,
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

export const setArchived = mutation({
  args: { id: v.id("clientes"), archived: v.boolean() },
  handler: async (ctx, { id, archived }) => {
    await ctx.db.patch(id, {
      archived,
      archivadoEn: archived ? new Date().toISOString() : undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("clientes") },
  handler: async (ctx, { id }) => {
    // Safety: no borrar si tiene proyectos activos
    const proyectos = await ctx.db
      .query("proyectos")
      .withIndex("by_clienteId", (q) => q.eq("clienteId", id))
      .take(1);
    if (proyectos.length > 0) {
      throw new Error("No se puede borrar: el cliente tiene proyectos asociados. Archívalo en su lugar.");
    }
    await ctx.db.delete(id);
  },
});
