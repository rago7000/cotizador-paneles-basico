// ── Import Row Staging: CRUD for extracted catalog rows ───────────────────
//
// Phase 4: Each row represents a single product/price extracted from a PDF.
// Rows go through: pending → matched/new/discarded
//
// The hashFila field enables duplicate detection across imports.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ───────────────────────────────────────────────────────────────

/** List all staging rows for an import run. */
export const listByImportRun = query({
  args: { importRunId: v.id("importRuns") },
  handler: async (ctx, { importRunId }) => {
    return await ctx.db
      .query("importRowStaging")
      .withIndex("by_importRunId", (q) => q.eq("importRunId", importRunId))
      .collect();
  },
});

/** List only pending (unresolved) rows for an import run. */
export const listPending = query({
  args: { importRunId: v.id("importRuns") },
  handler: async (ctx, { importRunId }) => {
    return await ctx.db
      .query("importRowStaging")
      .withIndex("by_importRunId_and_resolution", (q) =>
        q.eq("importRunId", importRunId).eq("resolution", "pending"),
      )
      .collect();
  },
});

/** Check if a hash already exists (duplicate detection across imports). */
export const findByHash = query({
  args: { hashFila: v.string() },
  handler: async (ctx, { hashFila }) => {
    return await ctx.db
      .query("importRowStaging")
      .withIndex("by_hashFila", (q) => q.eq("hashFila", hashFila))
      .take(5);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────

/** Create a single staging row (called per extracted row during import). */
export const create = mutation({
  args: {
    importRunId: v.id("importRuns"),
    rawData: v.object({
      modelo: v.string(),
      potencia: v.optional(v.string()),
      precio: v.optional(v.string()),
      moneda: v.optional(v.string()),
      unidad: v.optional(v.string()),
      marca: v.optional(v.string()),
      notas: v.optional(v.string()),
      paginaOrigen: v.optional(v.number()),
      textoOriginal: v.optional(v.string()),
    }),
    hashFila: v.string(),
    tipo: v.union(
      v.literal("panel"),
      v.literal("micro"),
      v.literal("general"),
      v.literal("desconocido"),
    ),
    // Auto-matching results (if available at creation time)
    resolution: v.optional(v.union(
      v.literal("pending"),
      v.literal("matched"),
    )),
    matchedProductId: v.optional(v.string()),
    matchedProductTable: v.optional(v.union(
      v.literal("productosPaneles"),
      v.literal("productosMicros"),
      v.literal("productosGenerales"),
    )),
    matchConfidence: v.optional(v.union(
      v.literal("auto"),
      v.literal("suggested"),
    )),
    precioNormalizado: v.optional(v.object({
      valor: v.number(),
      moneda: v.string(),
      unidad: v.string(),
      valorPorWatt: v.optional(v.number()),
    })),
    precioTiers: v.optional(v.array(v.object({
      minQty: v.number(),
      maxQty: v.optional(v.number()),
      precio: v.number(),
      moneda: v.string(),
      unidad: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("importRowStaging", {
      importRunId: args.importRunId,
      rawData: args.rawData,
      hashFila: args.hashFila,
      tipo: args.tipo,
      resolution: args.resolution ?? "pending",
      matchedProductId: args.matchedProductId,
      matchedProductTable: args.matchedProductTable,
      matchConfidence: args.matchConfidence,
      precioNormalizado: args.precioNormalizado,
      precioTiers: args.precioTiers,
    });
  },
});

/** Create multiple staging rows in a single transaction. */
export const createBatch = mutation({
  args: {
    rows: v.array(v.object({
      importRunId: v.id("importRuns"),
      rawData: v.object({
        modelo: v.string(),
        potencia: v.optional(v.string()),
        precio: v.optional(v.string()),
        moneda: v.optional(v.string()),
        unidad: v.optional(v.string()),
        marca: v.optional(v.string()),
        notas: v.optional(v.string()),
        paginaOrigen: v.optional(v.number()),
        textoOriginal: v.optional(v.string()),
      }),
      hashFila: v.string(),
      tipo: v.union(
        v.literal("panel"),
        v.literal("micro"),
        v.literal("general"),
        v.literal("desconocido"),
      ),
      resolution: v.optional(v.union(
        v.literal("pending"),
        v.literal("matched"),
      )),
      matchedProductId: v.optional(v.string()),
      matchedProductTable: v.optional(v.union(
        v.literal("productosPaneles"),
        v.literal("productosMicros"),
        v.literal("productosGenerales"),
      )),
      matchConfidence: v.optional(v.union(
        v.literal("auto"),
        v.literal("suggested"),
      )),
      precioNormalizado: v.optional(v.object({
        valor: v.number(),
        moneda: v.string(),
        unidad: v.string(),
        valorPorWatt: v.optional(v.number()),
      })),
      precioTiers: v.optional(v.array(v.object({
        minQty: v.number(),
        maxQty: v.optional(v.number()),
        precio: v.number(),
        moneda: v.string(),
        unidad: v.string(),
      }))),
    })),
  },
  handler: async (ctx, { rows }) => {
    // Dedup within the batch: skip rows with duplicate hashFila
    const seenHashes = new Set<string>();
    const ids = [];
    let skipped = 0;

    for (const row of rows) {
      if (seenHashes.has(row.hashFila)) {
        skipped++;
        continue;
      }
      seenHashes.add(row.hashFila);

      const id = await ctx.db.insert("importRowStaging", {
        importRunId: row.importRunId,
        rawData: row.rawData,
        hashFila: row.hashFila,
        tipo: row.tipo,
        resolution: row.resolution ?? "pending",
        matchedProductId: row.matchedProductId,
        matchedProductTable: row.matchedProductTable,
        matchConfidence: row.matchConfidence,
        precioNormalizado: row.precioNormalizado,
        precioTiers: row.precioTiers,
      });
      ids.push(id);
    }
    return { ids, skipped };
  },
});

/** Update a staging row (user resolves: match, create new, or discard). */
export const update = mutation({
  args: {
    id: v.id("importRowStaging"),
    resolution: v.union(
      v.literal("pending"),
      v.literal("matched"),
      v.literal("new"),
      v.literal("discarded"),
    ),
    matchedProductId: v.optional(v.string()),
    matchedProductTable: v.optional(v.union(
      v.literal("productosPaneles"),
      v.literal("productosMicros"),
      v.literal("productosGenerales"),
    )),
    matchConfidence: v.optional(v.union(
      v.literal("auto"),
      v.literal("suggested"),
      v.literal("manual"),
    )),
    precioNormalizado: v.optional(v.object({
      valor: v.number(),
      moneda: v.string(),
      unidad: v.string(),
      valorPorWatt: v.optional(v.number()),
    })),
    tipo: v.optional(v.union(
      v.literal("panel"),
      v.literal("micro"),
      v.literal("general"),
      v.literal("desconocido"),
    )),
    // When true, explicitly clears match fields (undefined doesn't clear in Convex patch)
    clearMatch: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, clearMatch, ...data }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Staging row not found");

    // Validate: matched/new must have a product association
    if (data.resolution === "matched" && !data.matchedProductId && !existing.matchedProductId) {
      throw new Error("Cannot mark as matched without a product association");
    }
    if (data.resolution === "new" && !data.matchedProductId && !existing.matchedProductId) {
      throw new Error("Cannot mark as new without a created product ID");
    }

    if (clearMatch) {
      // ctx.db.patch ignores undefined values, so we must use replace to remove fields.
      // Build the full document without match fields.
      const { matchedProductId: _mid, matchedProductTable: _mt, matchConfidence: _mc, _creationTime, ...rest } = existing;
      await ctx.db.replace(id, { ...rest, ...data });
    } else {
      await ctx.db.patch(id, data);
    }
  },
});

/** Batch accept all auto-matched rows in a run. */
export const acceptAllAuto = mutation({
  args: { importRunId: v.id("importRuns") },
  handler: async (ctx, { importRunId }) => {
    const rows = await ctx.db
      .query("importRowStaging")
      .withIndex("by_importRunId", (q) => q.eq("importRunId", importRunId))
      .collect();

    let accepted = 0;
    for (const row of rows) {
      if (
        row.resolution === "pending" &&
        row.matchConfidence === "auto" &&
        row.matchedProductId
      ) {
        await ctx.db.patch(row._id, { resolution: "matched" });
        accepted++;
      }
    }
    return { accepted };
  },
});

/** Batch discard all remaining pending rows in a run. */
export const discardAllPending = mutation({
  args: { importRunId: v.id("importRuns") },
  handler: async (ctx, { importRunId }) => {
    const rows = await ctx.db
      .query("importRowStaging")
      .withIndex("by_importRunId_and_resolution", (q) =>
        q.eq("importRunId", importRunId).eq("resolution", "pending"),
      )
      .collect();

    for (const row of rows) {
      await ctx.db.patch(row._id, { resolution: "discarded" });
    }
    return { discarded: rows.length };
  },
});
