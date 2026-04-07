import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

type Seccion = "PANELES" | "INVERSORES" | "ESTRUCTURA" | "TORNILLERIA" | "GENERALES";

interface OrigenDemanda {
  cotizacionNombre: string;
  seguimientoKey: string;
  cantidad: number;
}

interface ItemDemanda {
  id: string;
  seccion: Seccion;
  descripcion: string;
  marca?: string;
  modelo?: string;
  potencia?: number;
  productoId?: string;
  productoTabla?: string;
  unidad: string;
  moneda: string;
  precioUnitario?: number;
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
      const precioPorWatt = Number(doc.precioPorWatt) || 0;
      const precioMicro = Number(doc.precioMicroinversor) || 0;
      const precioCable = Number(doc.precioCable) || 0;
      const precioECU = Number(doc.precioECU) || 0;
      const precioHerramienta = Number(doc.precioHerramienta) || 0;

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
        // Precio por panel = potencia × precioPorWatt
        const precioPorPanel = potenciaNum * precioPorWatt;

        if (existing) {
          existing.cantidadTotal += cantidadNum;
          existing.origenes.push(origen);
        } else {
          let marca: string | undefined;
          let modelo: string | undefined;
          if (doc.panelCatalogoId) {
            try {
              const panel = await ctx.db.get(doc.panelCatalogoId as Id<"productosPaneles">);
              if (panel) { marca = panel.marca; modelo = panel.modelo; }
            } catch { /* ID format incompatible, skip lookup */ }
          }
          const desc = [
            marca ?? "Panel",
            modelo ?? "",
            `${potenciaNum}W`,
            precioPorWatt > 0 ? `($${precioPorWatt}/W)` : "",
          ].filter(Boolean).join(" ");

          demandaMap.set(panelKey, {
            id: panelKey,
            seccion: "PANELES",
            descripcion: desc,
            marca,
            modelo,
            potencia: potenciaNum,
            productoId: doc.panelCatalogoId ?? undefined,
            productoTabla: doc.panelCatalogoId ? "productosPaneles" : undefined,
            unidad: "Pza",
            moneda: "USD",
            precioUnitario: precioPorPanel > 0 ? precioPorPanel : undefined,
            cantidadTotal: cantidadNum,
            origenes: [origen],
          });
        }
      }

      // ── FLETE PANELES ──
      const fletePaneles = Number(doc.fletePaneles) || 0;
      if (fletePaneles > 0) {
        addLineItem(demandaMap, "pan-flete", "PANELES", "Flete paneles", "Envío", "USD", 1, nombre, "pan-flete", fletePaneles);
      }

      // ── GARANTÍA PANELES ──
      const garantiaPaneles = Number(doc.garantiaPaneles) || 0;
      if (garantiaPaneles > 0) {
        addLineItem(demandaMap, "pan-garantia", "PANELES", "Garantía contra daños", "Seguro", "USD", 1, nombre, "pan-garantia", garantiaPaneles);
      }

      // ── MICROINVERSORES ──
      const cantidadMicros = cantidadNum > 0 ? Math.ceil(cantidadNum / 4) : 0;
      if (cantidadMicros > 0 && precioMicro > 0) {
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
          let marca: string | undefined;
          let modelo: string | undefined;
          if (doc.microCatalogoId) {
            try {
              const micro = await ctx.db.get(doc.microCatalogoId as Id<"productosMicros">);
              if (micro) { marca = micro.marca; modelo = micro.modelo; }
            } catch { /* ID format incompatible, skip lookup */ }
          }
          const desc = [
            marca ?? "Microinversor",
            modelo ?? "",
            `($${precioMicro}/ud)`,
          ].filter(Boolean).join(" ");

          demandaMap.set(microKey, {
            id: microKey,
            seccion: "INVERSORES",
            descripcion: desc,
            marca,
            modelo,
            productoId: doc.microCatalogoId ?? undefined,
            productoTabla: doc.microCatalogoId ? "productosMicros" : undefined,
            unidad: "Pza",
            moneda: "USD",
            precioUnitario: precioMicro,
            cantidadTotal: cantidadMicros,
            origenes: [origen],
          });
        }

        // Cables troncales (1:1 with micros)
        if (precioCable > 0) {
          addLineItem(demandaMap, "inv-cables", "INVERSORES", `Cable troncal ($${precioCable}/ud)`, "Pza", "USD", cantidadMicros, nombre, "inv-cables", precioCable);
        }
      }

      // ── ECU ──
      if (doc.incluyeECU && precioECU > 0) {
        addLineItem(demandaMap, "inv-ecu", "INVERSORES", `ECU-R Monitoreo ($${precioECU})`, "Pza", "USD", 1, nombre, "inv-ecu", precioECU);
      }

      // ── HERRAMIENTA ──
      if (doc.incluyeHerramienta && precioHerramienta > 0) {
        addLineItem(demandaMap, "inv-herramienta", "INVERSORES", `Herramienta desconectora ($${precioHerramienta})`, "Pza", "USD", 1, nombre, "inv-herramienta", precioHerramienta);
      }

      // ── FLETE MICROS ──
      const fleteMicros = Number(doc.fleteMicros) || 0;
      if (fleteMicros > 0) {
        addLineItem(demandaMap, "inv-flete", "INVERSORES", "Flete microinversores", "Envío", "USD", 1, nombre, "inv-flete", fleteMicros);
      }

      // ── ESTRUCTURA ──
      for (const item of doc.aluminio ?? []) {
        const qty = Number(item.cantidad) || 0;
        const precio = Number(item.precioUnitario) || 0;
        if (qty > 0) {
          const key = `est-${item.nombre.toLowerCase().replace(/\s+/g, "-")}`;
          addLineItem(demandaMap, key, "ESTRUCTURA", item.nombre, item.unidad, "MXN", qty, nombre, `est-${item.id}`, precio);
        }
      }

      // ── FLETE ESTRUCTURA ──
      const fleteAluminio = Number(doc.fleteAluminio) || 0;
      if (fleteAluminio > 0) {
        addLineItem(demandaMap, "est-flete", "ESTRUCTURA", "Flete estructura", "Envío", "MXN", 1, nombre, "est-flete", fleteAluminio / 1.16);
      }

      // ── TORNILLERÍA ──
      for (const item of doc.tornilleria ?? []) {
        const qty = Number(item.cantidad) || 0;
        const precio = Number(item.precioUnitario) || 0;
        if (qty > 0) {
          const key = `tor-${item.nombre.toLowerCase().replace(/\s+/g, "-")}`;
          addLineItem(demandaMap, key, "TORNILLERIA", item.nombre, item.unidad, "MXN", qty, nombre, `tor-${item.id}`, precio);
        }
      }

      // ── GENERALES ──
      for (const item of doc.generales ?? []) {
        const qty = Number(item.cantidad) || 0;
        const precio = Number(item.precioUnitario) || 0;
        if (qty > 0) {
          const key = `gen-${item.nombre.toLowerCase().replace(/\s+/g, "-")}`;
          addLineItem(demandaMap, key, "GENERALES", item.nombre, item.unidad, "MXN", qty, nombre, `gen-${item.id}`, precio);
        }
      }
    }

    const sectionOrder: Record<Seccion, number> = {
      PANELES: 0, INVERSORES: 1, ESTRUCTURA: 2, TORNILLERIA: 3, GENERALES: 4,
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
  precioUnitario?: number,
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
      precioUnitario,
      cantidadTotal: cantidad,
      origenes: [origen],
    });
  }
}
