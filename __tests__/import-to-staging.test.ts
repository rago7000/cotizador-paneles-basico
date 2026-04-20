import { describe, it, expect } from "vitest";
import {
  transformToStagingRows,
  type ExtractedItem,
} from "@/lib/import-to-staging";
import { buildProductIndex, type CanonicalProduct } from "@/lib/import-utils";
import type { Id } from "../../convex/_generated/dataModel";

const MOCK_RUN_ID = "abc123" as Id<"importRuns">;

const PANEL_PRODUCT: CanonicalProduct = {
  id: "panel_1",
  table: "productosPaneles",
  modelo: "RSM144-10-545BHDG",
  marca: "Risen",
  aliases: [],
  normalizedNames: ["rsm14410545bhdg"],
};

const MICRO_PRODUCT: CanonicalProduct = {
  id: "micro_1",
  table: "productosMicros",
  modelo: "DS3D-2000",
  marca: "APSystems",
  aliases: [],
  normalizedNames: ["ds3d2000"],
};

const productIndex = buildProductIndex([PANEL_PRODUCT, MICRO_PRODUCT]);

function makeItem(overrides: Partial<ExtractedItem> = {}): ExtractedItem {
  return {
    tipo: "panel",
    marca: "Risen",
    modelo: "RSM144-10-545BHDG",
    descripcion: "Panel bifacial 545W",
    potencia: 545,
    panelesPorUnidad: 0,
    precio: 0.185,
    precioTiers: [],
    moneda: "USD",
    unidad: "por_watt",
    notas: "",
    ...overrides,
  };
}

describe("transformToStagingRows", () => {
  it("transforms a single panel item with auto-match", () => {
    const items = [makeItem()];
    const rows = transformToStagingRows(items, MOCK_RUN_ID, productIndex);

    expect(rows).toHaveLength(1);
    const row = rows[0];

    // Should auto-match to PANEL_PRODUCT
    expect(row.matchedProductId).toBe("panel_1");
    expect(row.matchedProductTable).toBe("productosPaneles");
    expect(row.matchConfidence).toBe("auto");
    expect(row.resolution).toBe("pending"); // auto-matched but still pending

    // Type should be panel
    expect(row.tipo).toBe("panel");

    // Raw data preserved
    expect(row.rawData.modelo).toBe("RSM144-10-545BHDG");
    expect(row.rawData.marca).toBe("Risen");
    expect(row.rawData.potencia).toBe("545W");
    expect(row.rawData.precio).toBe("$0.185/W");

    // Hash should be a valid hex string
    expect(row.hashFila).toMatch(/^[0-9a-f]{8}$/);

    // Price should be normalized
    expect(row.precioNormalizado).toBeDefined();
    expect(row.precioNormalizado!.valor).toBeCloseTo(0.185);
    expect(row.precioNormalizado!.moneda).toBe("USD");
    expect(row.precioNormalizado!.unidad).toBe("por_watt");
  });

  it("transforms a micro item with auto-match", () => {
    const items = [makeItem({
      tipo: "micro",
      marca: "APSystems",
      modelo: "DS3D-2000",
      potencia: 0,
      precio: 125,
      unidad: "por_unidad",
    })];
    const rows = transformToStagingRows(items, MOCK_RUN_ID, productIndex);

    expect(rows[0].matchedProductId).toBe("micro_1");
    expect(rows[0].tipo).toBe("micro");
  });

  it("unknown model gets no match", () => {
    const items = [makeItem({ modelo: "UNKNOWN-999", marca: "Unknown" })];
    const rows = transformToStagingRows(items, MOCK_RUN_ID, productIndex);

    expect(rows[0].matchedProductId).toBeUndefined();
    expect(rows[0].matchConfidence).toBeUndefined();
    expect(rows[0].resolution).toBeUndefined(); // defaults to pending in Convex
  });

  it("maps Claude tipos to staging tipos", () => {
    const cables = [makeItem({ tipo: "cable", modelo: "Cable AC" })];
    const rows = transformToStagingRows(cables, MOCK_RUN_ID, productIndex);
    expect(rows[0].tipo).toBe("general");

    const herramienta = [makeItem({ tipo: "herramienta", modelo: "Desconectora" })];
    const rows2 = transformToStagingRows(herramienta, MOCK_RUN_ID, productIndex);
    expect(rows2[0].tipo).toBe("general");
  });

  it("converts precioTiers", () => {
    const items = [makeItem({
      precioTiers: [
        { etiqueta: "1 panel", precio: 0.185 },
        { etiqueta: "1 pallet (36 pzas)", precio: 0.180 },
        { etiqueta: "+5 pallets", precio: 0.175 },
      ],
    })];
    const rows = transformToStagingRows(items, MOCK_RUN_ID, productIndex);

    expect(rows[0].precioTiers).toHaveLength(3);
    expect(rows[0].precioTiers![0].precio).toBeCloseTo(0.185);
    expect(rows[0].precioTiers![0].minQty).toBe(1);
    expect(rows[0].precioTiers![1].minQty).toBe(1);
    expect(rows[0].precioTiers![1].maxQty).toBe(36);
  });

  it("preserves page number in rawData", () => {
    const items = [makeItem()];
    const rows = transformToStagingRows(items, MOCK_RUN_ID, productIndex, 3);
    expect(rows[0].rawData.paginaOrigen).toBe(3);
  });

  it("builds textoOriginal from all fields", () => {
    const items = [makeItem()];
    const rows = transformToStagingRows(items, MOCK_RUN_ID, productIndex);
    expect(rows[0].rawData.textoOriginal).toContain("Risen");
    expect(rows[0].rawData.textoOriginal).toContain("RSM144-10-545BHDG");
    expect(rows[0].rawData.textoOriginal).toContain("545W");
  });

  it("handles multiple items in one batch", () => {
    const items = [
      makeItem(),
      makeItem({ modelo: "DS3D-2000", tipo: "micro", marca: "APSystems", potencia: 0 }),
      makeItem({ modelo: "UNKNOWN-X", tipo: "otro" }),
    ];
    const rows = transformToStagingRows(items, MOCK_RUN_ID, productIndex);
    expect(rows).toHaveLength(3);
  });
});
