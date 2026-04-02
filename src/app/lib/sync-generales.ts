import type { ElectricalResult } from "./electrical/types";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

interface LineItem {
  id: string;
  nombre: string;
  cantidad: string;
  precioUnitario: string;
  unidad: string;
}

// Patterns for auto-managed items
const CENTRO_RE = /centro de carga/i;
const PASTILLA_RE = /pastilla/i;
const CABLE_RUDO_RE = /cable de uso rudo/i;
function isAutoManaged(nombre: string): boolean {
  return (
    CENTRO_RE.test(nombre) ||
    PASTILLA_RE.test(nombre) ||
    CABLE_RUDO_RE.test(nombre)
  );
}

/** Extract amperaje from an existing pastilla item name, e.g. "Pastilla 2 polos (15 amp)" → 15 */
function extractAmperaje(nombre: string): number | null {
  const m = nombre.match(/\((\d+)\s*amp\)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Find an existing item matching a pattern and optionally a secondary check,
 * returning its precioUnitario if found.
 */
function findExistingPrecio(
  items: LineItem[],
  pattern: RegExp,
  secondaryCheck?: (item: LineItem) => boolean,
): string | null {
  const match = items.find(
    (it) => pattern.test(it.nombre) && (!secondaryCheck || secondaryCheck(it)),
  );
  return match?.precioUnitario ?? null;
}

/** Find an existing item matching a pattern and return its id if found. */
function findExistingId(
  items: LineItem[],
  pattern: RegExp,
  secondaryCheck?: (item: LineItem) => boolean,
): string | null {
  const match = items.find(
    (it) => pattern.test(it.nombre) && (!secondaryCheck || secondaryCheck(it)),
  );
  return match?.id ?? null;
}

export function syncGeneralesFromElectrical(
  electrical: ElectricalResult,
  currentGenerales: LineItem[],
  cantidadPaneles: number,
): LineItem[] {
  // Separate auto-managed from manual items
  const manualItems = currentGenerales.filter((it) => !isAutoManaged(it.nombre));
  const existingAuto = currentGenerales.filter((it) => isAutoManaged(it.nombre));

  // --- Centro de carga ---
  const slots = Math.ceil(electrical.totalBreakers / 2);
  const centroNombre = `Centro de carga (p/${slots} pastilla${slots > 1 ? "s" : ""} doble${slots > 1 ? "s" : ""})`;
  const centroItem: LineItem = {
    id: findExistingId(existingAuto, CENTRO_RE) ?? uid(),
    nombre: centroNombre,
    cantidad: String(slots),
    precioUnitario: findExistingPrecio(existingAuto, CENTRO_RE) ?? "229.00",
    unidad: "Pza",
  };

  // --- Pastillas ---
  const pastillaItems: LineItem[] = electrical.breakerResumen.map((br) => {
    const existingId = findExistingId(existingAuto, PASTILLA_RE, (it) => extractAmperaje(it.nombre) === br.amperaje);
    const existingPrecio = findExistingPrecio(existingAuto, PASTILLA_RE, (it) => extractAmperaje(it.nombre) === br.amperaje);
    return {
      id: existingId ?? uid(),
      nombre: `Pastilla 2 polos (${br.amperaje} amp)`,
      cantidad: String(br.cantidad),
      precioUnitario: existingPrecio ?? "589.00",
      unidad: "Pza",
    };
  });

  // --- Cable de uso rudo ---
  const cableItem: LineItem = {
    id: findExistingId(existingAuto, CABLE_RUDO_RE) ?? uid(),
    nombre: "Cable de uso rudo",
    cantidad: String(electrical.metrosCableACEstimado ?? 20),
    precioUnitario: findExistingPrecio(existingAuto, CABLE_RUDO_RE) ?? "37.97",
    unidad: "mL",
  };

  // Reassemble: auto-managed in order, then manual items preserved as-is
  return [centroItem, ...pastillaItems, cableItem, ...manualItems];
}
