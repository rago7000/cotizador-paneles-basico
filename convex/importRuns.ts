// ── Import Runs: CRUD for catalog import tracking ─────────────────────────
//
// Phase 4: Trazabilidad de catálogo y precios
//
// Each import run tracks a single PDF → extraction → staging → approval → publish cycle.
// Mutations are internal where possible — the API route drives the flow.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ───────────────────────────────────────────────────────────────

export const list = query({
  args: { proveedorId: v.optional(v.id("proveedores")) },
  handler: async (ctx, args) => {
    if (args.proveedorId) {
      return await ctx.db
        .query("importRuns")
        .withIndex("by_proveedor_and_creadoEn", (q) =>
          q.eq("proveedorId", args.proveedorId!),
        )
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("importRuns").order("desc").take(50);
  },
});

export const get = query({
  args: { id: v.id("importRuns") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────

/** Create a new import run when PDF upload starts. */
export const create = mutation({
  args: {
    proveedorId: v.id("proveedores"),
    archivoProveedorId: v.id("archivosProveedor"),
    nombreArchivo: v.string(),
    paginasTotal: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("importRuns", {
      proveedorId: args.proveedorId,
      archivoProveedorId: args.archivoProveedorId,
      nombreArchivo: args.nombreArchivo,
      status: "extracting",
      paginasTotal: args.paginasTotal,
      paginasProcesadas: 0,
      filasExtraidas: 0,
      filasAsociadas: 0,
      filasDescartadas: 0,
      filasNuevas: 0,
      creadoEn: Date.now(),
    });
  },
});

/** Update progress during extraction (page count, row count). */
export const updateProgress = mutation({
  args: {
    id: v.id("importRuns"),
    paginasProcesadas: v.number(),
    filasExtraidas: v.number(),
  },
  handler: async (ctx, { id, ...data }) => {
    await ctx.db.patch(id, data);
  },
});

/** Mark extraction as complete → status "staging". */
export const markStaging = mutation({
  args: {
    id: v.id("importRuns"),
    filasExtraidas: v.number(),
  },
  handler: async (ctx, { id, filasExtraidas }) => {
    await ctx.db.patch(id, {
      status: "staging",
      filasExtraidas,
    });
  },
});

/** Mark extraction as failed. */
export const markFailed = mutation({
  args: {
    id: v.id("importRuns"),
    errorExtraccion: v.string(),
  },
  handler: async (ctx, { id, errorExtraccion }) => {
    await ctx.db.patch(id, {
      status: "failed",
      errorExtraccion,
    });
  },
});

/** Transition to "reviewing" when user opens staging view. */
export const markReviewing = mutation({
  args: { id: v.id("importRuns") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "reviewing" });
  },
});

/** Approve import run after all rows are resolved. */
export const approve = mutation({
  args: { id: v.id("importRuns") },
  handler: async (ctx, { id }) => {
    const run = await ctx.db.get(id);
    if (!run) throw new Error("Import run not found");

    // Count unresolved rows
    const pendingRows = await ctx.db
      .query("importRowStaging")
      .withIndex("by_importRunId_and_resolution", (q) =>
        q.eq("importRunId", id).eq("resolution", "pending"),
      )
      .take(1);

    if (pendingRows.length > 0) {
      throw new Error("Cannot approve: there are still pending rows");
    }

    // Count resolution types
    const allRows = await ctx.db
      .query("importRowStaging")
      .withIndex("by_importRunId", (q) => q.eq("importRunId", id))
      .collect();

    let matched = 0;
    let discarded = 0;
    let newProducts = 0;
    for (const row of allRows) {
      if (row.resolution === "matched") matched++;
      else if (row.resolution === "discarded") discarded++;
      else if (row.resolution === "new") newProducts++;
    }

    if (matched + newProducts === 0) {
      throw new Error("Cannot approve: no matched or new rows");
    }

    await ctx.db.patch(id, {
      status: "approved",
      filasAsociadas: matched,
      filasDescartadas: discarded,
      filasNuevas: newProducts,
      revisadoEn: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("importRuns") },
  handler: async (ctx, { id }) => {
    // Cascade: delete all staging rows
    const rows = await ctx.db
      .query("importRowStaging")
      .withIndex("by_importRunId", (q) => q.eq("importRunId", id))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(id);
  },
});
