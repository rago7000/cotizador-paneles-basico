import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ordenCompraEstadoV, lineaOCV } from "./validators";

// ── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ordenesCompra")
      .order("desc")
      .take(100);
  },
});

export const get = query({
  args: { id: v.id("ordenesCompra") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const crear = mutation({
  args: {
    proveedorNombre: v.string(),
    lineas: v.array(lineaOCV),
    moneda: v.string(),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const anio = new Date().getFullYear();

    // Get or create counter for this year
    const counter = await ctx.db
      .query("ordenesCompraContador")
      .withIndex("by_anio", (q) => q.eq("anio", anio))
      .first();

    let siguiente: number;
    if (counter) {
      siguiente = counter.siguiente;
      await ctx.db.patch(counter._id, { siguiente: siguiente + 1 });
    } else {
      siguiente = 1;
      await ctx.db.insert("ordenesCompraContador", { anio, siguiente: 2 });
    }

    const folio = `OC-${anio}-${String(siguiente).padStart(3, "0")}`;

    // Calculate estimated subtotal
    const subtotalEst = args.lineas.reduce((acc, l) => {
      return acc + (l.precioUnitarioEst ?? 0) * l.cantidad;
    }, 0);

    return await ctx.db.insert("ordenesCompra", {
      folio,
      proveedorNombre: args.proveedorNombre,
      lineas: args.lineas,
      estado: "borrador",
      moneda: args.moneda,
      subtotalEst: subtotalEst > 0 ? subtotalEst : undefined,
      fechaCreacion: new Date().toISOString(),
      notas: args.notas,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("ordenesCompra"),
    proveedorNombre: v.optional(v.string()),
    lineas: v.optional(v.array(lineaOCV)),
    moneda: v.optional(v.string()),
    notas: v.optional(v.string()),
    tcCompra: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("OC not found");

    const patch: Record<string, unknown> = {};
    if (fields.proveedorNombre !== undefined) patch.proveedorNombre = fields.proveedorNombre;
    if (fields.lineas !== undefined) patch.lineas = fields.lineas;
    if (fields.moneda !== undefined) patch.moneda = fields.moneda;
    if (fields.notas !== undefined) patch.notas = fields.notas;
    if (fields.tcCompra !== undefined) patch.tcCompra = fields.tcCompra;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch);
    }
  },
});

export const marcarEnviada = mutation({
  args: { id: v.id("ordenesCompra") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      estado: "enviada",
      fechaEnvio: new Date().toISOString(),
    });
  },
});

export const marcarConfirmada = mutation({
  args: { id: v.id("ordenesCompra") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { estado: "confirmada" });
  },
});

export const marcarRecibida = mutation({
  args: {
    id: v.id("ordenesCompra"),
    tcCompra: v.optional(v.number()),
    costosPorLinea: v.array(
      v.object({
        lineaId: v.string(),
        costoReal: v.number(),
      }),
    ),
  },
  handler: async (ctx, { id, tcCompra, costosPorLinea }) => {
    const oc = await ctx.db.get(id);
    if (!oc) throw new Error("OC not found");

    const now = new Date().toISOString();
    const costosMap = new Map(costosPorLinea.map((c) => [c.lineaId, c.costoReal]));

    // Check if all lines have costs (full) or partial
    const allReceived = oc.lineas.every((l) => costosMap.has(l.id));

    // Distribute costs to seguimientoItems
    for (const linea of oc.lineas) {
      const costoReal = costosMap.get(linea.id);
      if (costoReal === undefined) continue;

      const totalQtyInLine = linea.origenes.reduce((acc, o) => acc + o.cantidad, 0);

      for (const origen of linea.origenes) {
        const proporcion = totalQtyInLine > 0 ? origen.cantidad / totalQtyInLine : 0;
        const costoAsignado = costoReal * proporcion;

        // Find and patch the seguimientoItem
        const item = await ctx.db
          .query("seguimientoItems")
          .withIndex("by_cotizacionNombre_and_key", (q) =>
            q
              .eq("cotizacionNombre", origen.cotizacionNombre)
              .eq("key", origen.seguimientoKey),
          )
          .first();

        if (item) {
          await ctx.db.patch(item._id, {
            realMXN: costoAsignado,
            tcCompra: tcCompra ?? oc.tcCompra,
            estado: "recibido",
            fechaRecibido: now,
            ordenCompraId: id,
            actualizadoEn: now,
          });
        }
      }
    }

    // Update OC status
    await ctx.db.patch(id, {
      estado: allReceived ? "recibida" : "parcial",
      tcCompra: tcCompra ?? oc.tcCompra,
      fechaRecepcion: now,
    });
  },
});

export const eliminar = mutation({
  args: { id: v.id("ordenesCompra") },
  handler: async (ctx, { id }) => {
    const oc = await ctx.db.get(id);
    if (!oc) throw new Error("OC not found");
    if (oc.estado !== "borrador" && oc.estado !== "cancelada") {
      throw new Error("Solo se pueden eliminar OCs en borrador o canceladas");
    }
    await ctx.db.delete(id);
  },
});

export const cancelar = mutation({
  args: { id: v.id("ordenesCompra") },
  handler: async (ctx, { id }) => {
    const oc = await ctx.db.get(id);
    if (!oc) throw new Error("OC not found");

    // Clear ordenCompraId from linked seguimientoItems
    for (const linea of oc.lineas) {
      for (const origen of linea.origenes) {
        const item = await ctx.db
          .query("seguimientoItems")
          .withIndex("by_cotizacionNombre_and_key", (q) =>
            q
              .eq("cotizacionNombre", origen.cotizacionNombre)
              .eq("key", origen.seguimientoKey),
          )
          .first();

        if (item && item.ordenCompraId === id) {
          await ctx.db.patch(item._id, {
            ordenCompraId: undefined,
            actualizadoEn: new Date().toISOString(),
          });
        }
      }
    }

    await ctx.db.patch(id, { estado: "cancelada" });
  },
});
