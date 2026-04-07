import { v } from "convex/values";
import { query } from "./_generated/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type Seccion = "PANELES" | "INVERSORES" | "ESTRUCTURA" | "TORNILLERIA" | "GENERALES";

interface OrigenDemanda {
  cotizacionNombre: string;
  seguimientoKey: string;
  cantidad: number;
}

interface ItemDemanda {
  id: string; // unique key for grouping
  seccion: Seccion;
  descripcion: string;
  productoId?: string;
  productoTabla?: string;
  unidad: string;
  moneda: string;
  cantidadTotal: number;
  origenes: OrigenDemanda[];
}

// ─── Query ────────────────────────────────────────────────────────────────────

export const agregadoDemanda = query({
  args: {
    cotizacionNombres: v.array(v.string()),
  },
  handler: async (ctx, { cotizacionNombres }) => {
    const demandaMap = new Map<string, ItemDemanda>();

    for (const nombre of cotizacionNombres) {
      const doc = await ctx.db
        .query("cotizaciones")
        .withIndex("by_nombre", (q) => q.eq("nombre", nombre))
        .first();

      if (!doc) continue;

      const cantidadNum = Number(doc.cantidad) || 0;
      const potenciaNum = Number(doc.potencia) || 0;

      // ── PANELES ──
      if (cantidadNum > 0 && potenciaNum > 0) {
        const panelKey = doc.panelCatalogoId
          ? `panel-${doc.panelCatalogoId}`
          : `panel-${potenciaNum}W`;

        const existing = demandaMap.get(panelKey);
        const origen: OrigenDemanda = {
          cotizacionNombre: nombre,
          seguimientoKey: "pan-main",
          cantidad: cantidadNum,
        };

        if (existing) {
          existing.cantidadTotal += cantidadNum;
          existing.origenes.push(origen);
        } else {
          demandaMap.set(panelKey, {
            id: panelKey,
            seccion: "PANELES",
            descripcion: `Panel ${potenciaNum}W`,
            productoId: doc.panelCatalogoId ?? undefined,
            productoTabla: doc.panelCatalogoId ? "productosPaneles" : undefined,
            unidad: "Pza",
            moneda: "USD",
            cantidadTotal: cantidadNum,
            origenes: [origen],
          });
        }
      }

      // ── MICROINVERSORES ──
      const cantidadMicros = cantidadNum > 0 ? Math.ceil(cantidadNum / 4) : 0;
      if (cantidadMicros > 0) {
        const microKey = doc.microCatalogoId
          ? `micro-${doc.microCatalogoId}`
          : `micro-default`;

        const existing = demandaMap.get(microKey);
        const origen: OrigenDemanda = {
          cotizacionNombre: nombre,
          seguimientoKey: "inv-micros",
          cantidad: cantidadMicros,
        };

        if (existing) {
          existing.cantidadTotal += cantidadMicros;
          existing.origenes.push(origen);
        } else {
          demandaMap.set(microKey, {
            id: microKey,
            seccion: "INVERSORES",
            descripcion: "Microinversor",
            productoId: doc.microCatalogoId ?? undefined,
            productoTabla: doc.microCatalogoId ? "productosMicros" : undefined,
            unidad: "Pza",
            moneda: "USD",
            cantidadTotal: cantidadMicros,
            origenes: [origen],
          });
        }

        // Cables troncales (1:1 with micros)
        if (Number(doc.precioCable) > 0) {
          addLineItem(demandaMap, "cable-troncal", "INVERSORES", "Cable troncal", "Pza", "USD", cantidadMicros, nombre, "inv-cables");
        }
      }

      // ── ECU ──
      if (doc.incluyeECU && Number(doc.precioECU) > 0) {
        addLineItem(demandaMap, "ecu-r", "INVERSORES", "ECU-R Monitoreo", "Pza", "USD", 1, nombre, "inv-ecu");
      }

      // ── ESTRUCTURA ──
      for (const item of doc.aluminio ?? []) {
        const qty = Number(item.cantidad) || 0;
        if (qty > 0) {
          const key = `est-${item.nombre.toLowerCase().replace(/\s+/g, "-")}`;
          addLineItem(demandaMap, key, "ESTRUCTURA", item.nombre, item.unidad, "MXN", qty, nombre, `est-${item.id}`);
        }
      }

      // ── TORNILLERÍA ──
      for (const item of doc.tornilleria ?? []) {
        const qty = Number(item.cantidad) || 0;
        if (qty > 0) {
          const key = `tor-${item.nombre.toLowerCase().replace(/\s+/g, "-")}`;
          addLineItem(demandaMap, key, "TORNILLERIA", item.nombre, item.unidad, "MXN", qty, nombre, `tor-${item.id}`);
        }
      }

      // ── GENERALES ──
      for (const item of doc.generales ?? []) {
        const qty = Number(item.cantidad) || 0;
        if (qty > 0) {
          const key = `gen-${item.nombre.toLowerCase().replace(/\s+/g, "-")}`;
          addLineItem(demandaMap, key, "GENERALES", item.nombre, item.unidad, "MXN", qty, nombre, `gen-${item.id}`);
        }
      }
    }

    // Sort by section order, then by description
    const sectionOrder: Record<Seccion, number> = {
      PANELES: 0,
      INVERSORES: 1,
      ESTRUCTURA: 2,
      TORNILLERIA: 3,
      GENERALES: 4,
    };

    const items = Array.from(demandaMap.values()).sort((a, b) => {
      const secDiff = sectionOrder[a.seccion] - sectionOrder[b.seccion];
      if (secDiff !== 0) return secDiff;
      return a.descripcion.localeCompare(b.descripcion);
    });

    return { items, totalItems: items.length };
  },
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function addLineItem(
  map: Map<string, ItemDemanda>,
  key: string,
  seccion: Seccion,
  descripcion: string,
  unidad: string,
  moneda: string,
  cantidad: number,
  cotizacionNombre: string,
  seguimientoKey: string,
) {
  const origen: OrigenDemanda = { cotizacionNombre, seguimientoKey, cantidad };
  const existing = map.get(key);

  if (existing) {
    existing.cantidadTotal += cantidad;
    existing.origenes.push(origen);
  } else {
    map.set(key, {
      id: key,
      seccion,
      descripcion,
      unidad,
      moneda,
      cantidadTotal: cantidad,
      origenes: [origen],
    });
  }
}
