/**
 * Regresión: la sincronización de generales pisaba el orden manual del
 * usuario en cada recálculo eléctrico. Estos tests fijan el merge por
 * posición (los ítems manejados se reemplazan en sitio; los manuales
 * quedan intactos donde el usuario los puso).
 */

import { describe, it, expect } from "vitest";
import { syncGeneralesFromElectrical } from "../src/app/lib/sync-generales";
import type { ElectricalResult } from "../src/app/lib/electrical/types";

function makeElectrical(overrides?: Partial<ElectricalResult>): ElectricalResult {
  // Solo poblamos los campos que la función bajo prueba consume.
  return {
    totalCircuitos: 2,
    totalBreakers: 4,
    breakerResumen: [{ amperaje: 30, cantidad: 2 }],
    cableACResumen: [],
    metrosCableACEstimado: 25,
    diagrama: [],
    ...(overrides as object),
  } as unknown as ElectricalResult;
}

const current = [
  { id: "a", nombre: "Centro de carga (p/1 pastilla doble)", cantidad: "1", precioUnitario: "229.00", unidad: "Pza" },
  { id: "b", nombre: "Pastilla 2 polos (15 amp)", cantidad: "1", precioUnitario: "589.00", unidad: "Pza" },
  { id: "c", nombre: "Cemento plastico", cantidad: "1", precioUnitario: "79.80", unidad: "Lote" },
  { id: "d", nombre: "Cable de uso rudo", cantidad: "20", precioUnitario: "37.97", unidad: "mL" },
  { id: "e", nombre: "Mi item manual personalizado", cantidad: "2", precioUnitario: "500.00", unidad: "Pza" },
  { id: "f", nombre: "Instalacion - Precio base", cantidad: "1", precioUnitario: "3000.00", unidad: "Lote" },
  { id: "g", nombre: "Instalacion - Paneles adicionales", cantidad: "0", precioUnitario: "150.00", unidad: "Pza" },
  { id: "h", nombre: "Instalacion - Vueltas gasolina", cantidad: "1", precioUnitario: "800.00", unidad: "Pza" },
];

describe("syncGeneralesFromElectrical — orden manual preservado", () => {
  it("mantiene la posición original de items manuales tras un recálculo", () => {
    const out = syncGeneralesFromElectrical(makeElectrical(), current, 6);
    const nombres = out.map((x) => x.nombre);
    const idxCemento = nombres.indexOf("Cemento plastico");
    const idxMiItem = nombres.indexOf("Mi item manual personalizado");
    const idxCable = nombres.indexOf("Cable de uso rudo");
    const idxBase = nombres.indexOf("Instalacion - Precio base");
    expect(idxCemento).toBeGreaterThan(0);
    expect(idxCemento).toBeLessThan(idxCable);
    expect(idxMiItem).toBeGreaterThan(idxCable);
    expect(idxMiItem).toBeLessThan(idxBase);
  });

  it("actualiza cantidad/nombre del centro de carga conservando id y precio editado", () => {
    const customPriced = [...current];
    customPriced[0] = { ...customPriced[0], precioUnitario: "350.00" };
    const out = syncGeneralesFromElectrical(makeElectrical({ totalBreakers: 8 }), customPriced, 6);
    const centro = out.find((x) => /centro de carga/i.test(x.nombre))!;
    expect(centro.id).toBe("a");
    expect(centro.cantidad).toBe("4"); // 8 breakers / 2 = 4 slots
    expect(centro.precioUnitario).toBe("350.00");
  });

  it("inserta una nueva pastilla al final si aparece un amperaje nuevo", () => {
    const out = syncGeneralesFromElectrical(
      makeElectrical({ breakerResumen: [
        { amperaje: 15, cantidad: 1 },
        { amperaje: 30, cantidad: 2 },
      ] }),
      current,
      6,
    );
    const pastillas = out.filter((x) => /^Pastilla/i.test(x.nombre));
    expect(pastillas).toHaveLength(2);
    expect(pastillas.map((p) => p.cantidad)).toEqual(expect.arrayContaining(["1", "2"]));
  });

  it("descarta pastillas cuyo amperaje desaparece del cálculo eléctrico", () => {
    const out = syncGeneralesFromElectrical(
      makeElectrical({ breakerResumen: [{ amperaje: 30, cantidad: 2 }] }),
      current,
      6,
    );
    const pastillas = out.filter((x) => /^Pastilla/i.test(x.nombre));
    expect(pastillas).toHaveLength(1);
    expect(pastillas[0].nombre).toContain("30 amp");
  });
});
