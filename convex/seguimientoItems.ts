import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { seguimientoItemEstadoV } from "./validators";

// ── Queries ──────────────────────────────────────────────────────────────────

export const listByCotizacion = query({
  args: { cotizacionNombre: v.string() },
  handler: async (ctx, { cotizacionNombre }) => {
    return await ctx.db
      .query("seguimientoItems")
      .withIndex("by_cotizacionNombre", (q) =>
        q.eq("cotizacionNombre", cotizacionNombre),
      )
      .take(200);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const upsert = mutation({
  args: {
    cotizacionNombre: v.string(),
    key: v.string(),
    realMXN: v.optional(v.number()),
    incluyeIVA: v.optional(v.boolean()),
    tcCompra: v.optional(v.number()),
    montoOriginal: v.optional(v.number()),
    monedaOriginal: v.optional(v.string()),
    proveedorNombre: v.optional(v.string()),
    estado: v.optional(seguimientoItemEstadoV),
    fechaPedido: v.optional(v.string()),
    fechaPago: v.optional(v.string()),
    fechaRecibido: v.optional(v.string()),
    notas: v.optional(v.string()),
    facturaRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { cotizacionNombre, key, ...fields } = args;
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query("seguimientoItems")
      .withIndex("by_cotizacionNombre_and_key", (q) =>
        q.eq("cotizacionNombre", cotizacionNombre).eq("key", key),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, actualizadoEn: now });
      return existing._id;
    }

    return await ctx.db.insert("seguimientoItems", {
      cotizacionNombre,
      key,
      ...fields,
      actualizadoEn: now,
    });
  },
});

export const bulkUpsert = mutation({
  args: {
    cotizacionNombre: v.string(),
    items: v.array(
      v.object({
        key: v.string(),
        realMXN: v.optional(v.number()),
        incluyeIVA: v.optional(v.boolean()),
        tcCompra: v.optional(v.number()),
        montoOriginal: v.optional(v.number()),
        monedaOriginal: v.optional(v.string()),
        proveedorNombre: v.optional(v.string()),
        estado: v.optional(seguimientoItemEstadoV),
        fechaPedido: v.optional(v.string()),
        fechaPago: v.optional(v.string()),
        fechaRecibido: v.optional(v.string()),
        notas: v.optional(v.string()),
        facturaRef: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { cotizacionNombre, items }) => {
    const now = new Date().toISOString();

    // Load all existing items for this cotizacion in one go
    const existingDocs = await ctx.db
      .query("seguimientoItems")
      .withIndex("by_cotizacionNombre", (q) =>
        q.eq("cotizacionNombre", cotizacionNombre),
      )
      .take(200);

    const existingByKey = new Map(existingDocs.map((d) => [d.key, d]));

    for (const item of items) {
      const { key, ...fields } = item;
      const existing = existingByKey.get(key);

      if (existing) {
        await ctx.db.patch(existing._id, { ...fields, actualizadoEn: now });
      } else {
        await ctx.db.insert("seguimientoItems", {
          cotizacionNombre,
          key,
          ...fields,
          actualizadoEn: now,
        });
      }
    }
  },
});

// ── Migration from legacy JSON blob ──────────────────────────────────────────

export const migrateFromLegacy = internalMutation({
  args: {},
  handler: async (ctx) => {
    const legacyDocs = await ctx.db.query("seguimiento").take(500);
    let migrated = 0;

    for (const doc of legacyDocs) {
      let items: Array<{
        key: string;
        realMXN: string;
        proveedor: string;
        notas: string;
      }>;
      try {
        items = JSON.parse(doc.items) ?? [];
      } catch {
        continue;
      }

      for (const item of items) {
        // Check if already migrated
        const exists = await ctx.db
          .query("seguimientoItems")
          .withIndex("by_cotizacionNombre_and_key", (q) =>
            q
              .eq("cotizacionNombre", doc.cotizacionNombre)
              .eq("key", item.key),
          )
          .first();

        if (exists) continue;

        const realVal = Number(item.realMXN) || undefined;
        await ctx.db.insert("seguimientoItems", {
          cotizacionNombre: doc.cotizacionNombre,
          key: item.key,
          realMXN: realVal,
          proveedorNombre: item.proveedor || undefined,
          notas: item.notas || undefined,
          estado: realVal && realVal > 0 ? "pagado" : "pendiente",
          actualizadoEn: doc.fechaActualizacion,
        });
        migrated++;
      }
    }

    return { migrated };
  },
});

// Trigger migration (callable from dashboard or action)
export const runMigration = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.seguimientoItems.migrateFromLegacy, {});
    return { scheduled: true };
  },
});
