// ── Price Lists: Published price lists + publish workflow ─────────────────
//
// Phase 4: A priceList is the final, immutable artifact of an import run.
// Publishing creates priceListItems + ofertas in a single transaction.
//
// Relationship: importRun (1) → priceList (1) → priceListItems (N) → ofertas (N)

import { query, mutation } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ───────────────────────────────────────────────────────────────

/** List price lists for a proveedor, most recent first. */
export const listByProveedor = query({
  args: { proveedorId: v.id("proveedores") },
  handler: async (ctx, { proveedorId }) => {
    return await ctx.db
      .query("priceLists")
      .withIndex("by_proveedorId_and_fechaPublicacion", (q) =>
        q.eq("proveedorId", proveedorId),
      )
      .order("desc")
      .take(20);
  },
});

/** Get the active price list for a proveedor. */
export const getActive = query({
  args: { proveedorId: v.id("proveedores") },
  handler: async (ctx, { proveedorId }) => {
    const results = await ctx.db
      .query("priceLists")
      .withIndex("by_proveedorId_and_activa", (q) =>
        q.eq("proveedorId", proveedorId).eq("activa", true),
      )
      .take(1);
    return results[0] ?? null;
  },
});

export const get = query({
  args: { id: v.id("priceLists") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/** List all items in a price list. */
export const listItems = query({
  args: { priceListId: v.id("priceLists") },
  handler: async (ctx, { priceListId }) => {
    return await ctx.db
      .query("priceListItems")
      .withIndex("by_priceListId", (q) => q.eq("priceListId", priceListId))
      .collect();
  },
});

// ── Publish: staging → priceList + items + ofertas ────────────────────────

/**
 * Publish an approved import run as a new price list.
 *
 * This is the critical transaction that:
 * 1. Creates the priceList
 * 2. Creates priceListItems from resolved staging rows
 * 3. Creates/updates ofertas for each item (backward compatibility)
 * 4. Deactivates previous active list for the same proveedor
 * 5. Marks the importRun as published
 */
export const publish = mutation({
  args: {
    importRunId: v.id("importRuns"),
    nombre: v.string(),
    monedaPrincipal: v.string(),
    fechaVigencia: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ── 1. Validate import run ────────────────────────────────────────
    const run = await ctx.db.get(args.importRunId);
    if (!run) throw new Error("Import run not found");
    if (run.status === "published") {
      throw new Error("This import run has already been published");
    }
    if (run.status !== "approved") {
      throw new Error(`Cannot publish: run status is "${run.status}", expected "approved"`);
    }

    // ── 2. Get all resolved staging rows (matched + new) ─────────────
    const allRows = await ctx.db
      .query("importRowStaging")
      .withIndex("by_importRunId", (q) => q.eq("importRunId", args.importRunId))
      .collect();

    const publishableRows = allRows.filter(
      (r) => (r.resolution === "matched" || r.resolution === "new") &&
             r.matchedProductId &&
             r.matchedProductTable &&
             r.precioNormalizado,
    );

    if (publishableRows.length === 0) {
      throw new Error("No publishable rows found");
    }

    // ── 3. Calculate version number ──────────────────────────────────
    const existingLists = await ctx.db
      .query("priceLists")
      .withIndex("by_proveedorId_and_fechaPublicacion", (q) =>
        q.eq("proveedorId", run.proveedorId),
      )
      .collect();
    const version = existingLists.length + 1;

    // ── 4. Deactivate previous active list ───────────────────────────
    const activeLists = await ctx.db
      .query("priceLists")
      .withIndex("by_proveedorId_and_activa", (q) =>
        q.eq("proveedorId", run.proveedorId).eq("activa", true),
      )
      .collect();

    for (const prev of activeLists) {
      await ctx.db.patch(prev._id, { activa: false });
    }

    // ── 5. Create price list ─────────────────────────────────────────
    const now = Date.now();
    const priceListId = await ctx.db.insert("priceLists", {
      proveedorId: run.proveedorId,
      importRunId: args.importRunId,
      archivoProveedorId: run.archivoProveedorId,
      nombre: args.nombre,
      version,
      fechaPublicacion: now,
      fechaVigencia: args.fechaVigencia,
      activa: true,
      totalItems: publishableRows.length,
      monedaPrincipal: args.monedaPrincipal,
      notas: args.notas,
    });

    // ── 6. Create items + ofertas for each row ───────────────────────
    const fechaISO = new Date().toISOString();

    for (const row of publishableRows) {
      const productoTable = row.matchedProductTable!;
      const productoId = row.matchedProductId!;
      const precio = row.precioNormalizado!;

      // Build product snapshot from canonical product
      const productoSnapshot = await buildProductSnapshot(
        ctx, productoTable, productoId, row.rawData.modelo,
      );

      // Build precioOriginalTexto from raw data
      const precioOriginalTexto = row.rawData.precio
        ? `${row.rawData.modelo} ${row.rawData.precio} ${row.rawData.moneda ?? ""} ${row.rawData.unidad ?? ""}`.trim()
        : row.rawData.textoOriginal ?? row.rawData.modelo;

      // Create priceListItem
      await ctx.db.insert("priceListItems", {
        priceListId,
        productoId,
        productoTable: productoTable,
        precio: precio.valor,
        moneda: precio.moneda,
        unidad: precio.unidad,
        precioTiers: row.precioTiers?.map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          precio: t.precio,
        })),
        importRowStagingId: row._id,
        precioOriginalTexto,
        productoSnapshot,
      });

      // Create oferta (backward compatibility with existing system)
      // Determine tipo from productoTable
      const tipo =
        productoTable === "productosPaneles" ? "panel" :
        productoTable === "productosMicros" ? "microinversor" :
        "general";

      await ctx.db.insert("ofertas", {
        proveedorId: run.proveedorId,
        productoId,
        productoTabla: productoTable,
        tipo,
        precio: precio.valor,
        precioTiers: row.precioTiers?.map((t) => ({
          etiqueta: t.maxQty
            ? `${t.minQty}-${t.maxQty} pcs`
            : `${t.minQty}+ pcs`,
          precio: t.precio,
        })),
        fecha: fechaISO,
        creadoEn: fechaISO,
        notas: "",
        archivoOrigenId: run.archivoProveedorId,
        priceListId,
        importRunId: args.importRunId,
      });
    }

    // ── 7. Mark import run as published ──────────────────────────────
    await ctx.db.patch(args.importRunId, {
      status: "published" as const,
      publicadoEn: Date.now(),
    });

    return { priceListId, itemsCreated: publishableRows.length, version };
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────

type ProductSnapshot = { modelo: string; marca?: string; potencia?: number };

/** Lookup a product from any product table and build a snapshot. */
async function buildProductSnapshot(
  ctx: MutationCtx,
  table: "productosPaneles" | "productosMicros" | "productosGenerales",
  productoId: string,
  fallbackModelo: string,
): Promise<ProductSnapshot> {
  const fallback: ProductSnapshot = { modelo: fallbackModelo };

  if (table === "productosPaneles") {
    const doc: Doc<"productosPaneles"> | null = await ctx.db.get(
      productoId as Id<"productosPaneles">,
    );
    if (!doc) return fallback;
    return { modelo: doc.modelo, marca: doc.marca, potencia: doc.potencia };
  }

  if (table === "productosMicros") {
    const doc: Doc<"productosMicros"> | null = await ctx.db.get(
      productoId as Id<"productosMicros">,
    );
    if (!doc) return fallback;
    return { modelo: doc.modelo, marca: doc.marca };
  }

  if (table === "productosGenerales") {
    const doc: Doc<"productosGenerales"> | null = await ctx.db.get(
      productoId as Id<"productosGenerales">,
    );
    if (!doc) return fallback;
    return { modelo: doc.modelo, marca: doc.marca };
  }

  return fallback;
}
