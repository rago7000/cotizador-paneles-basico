import { describe, it, expect } from "vitest";
import {
  computeHashFila,
  normalizeModelString,
  autoMatch,
  buildProductIndex,
  inferProductType,
  normalizePrice,
  type CanonicalProduct,
} from "@/lib/import-utils";

// ── computeHashFila ──────────────────────────────────────────────────────

describe("computeHashFila", () => {
  it("produces consistent hash for same inputs", () => {
    const a = computeHashFila({ modelo: "RSM144-10-545BHDG", precio: "$0.185/W" });
    const b = computeHashFila({ modelo: "RSM144-10-545BHDG", precio: "$0.185/W" });
    expect(a).toBe(b);
  });

  it("produces different hash for different precio", () => {
    const a = computeHashFila({ modelo: "RSM144-10-545BHDG", precio: "$0.185/W" });
    const b = computeHashFila({ modelo: "RSM144-10-545BHDG", precio: "$0.190/W" });
    expect(a).not.toBe(b);
  });

  it("produces 8-char hex string", () => {
    const h = computeHashFila({ modelo: "Test-Panel" });
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles empty modelo gracefully", () => {
    const h = computeHashFila({ modelo: "" });
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });
});

// ── normalizeModelString ─────────────────────────────────────────────────

describe("normalizeModelString", () => {
  it("removes spaces, dashes, underscores and lowercases", () => {
    expect(normalizeModelString("RSM144-10-545BHDG")).toBe("rsm14410545bhdg");
  });

  it("handles already normalized input", () => {
    expect(normalizeModelString("abc123")).toBe("abc123");
  });

  it("handles spaces and mixed case", () => {
    expect(normalizeModelString("DS3D  2000")).toBe("ds3d2000");
  });
});

// ── autoMatch ────────────────────────────────────────────────────────────

describe("autoMatch", () => {
  const products: CanonicalProduct[] = [
    {
      id: "panel1",
      table: "productosPaneles",
      modelo: "RSM144-10-545BHDG",
      marca: "Risen",
      aliases: ["RSM545"],
      normalizedNames: ["rsm14410545bhdg", "rsm545"],
    },
    {
      id: "micro1",
      table: "productosMicros",
      modelo: "DS3D-2000",
      marca: "APSystems",
      aliases: [],
      normalizedNames: ["ds3d2000"],
    },
  ];

  const index = buildProductIndex(products);

  it("exact match returns auto confidence", () => {
    const result = autoMatch("RSM144-10-545BHDG", index);
    expect(result).not.toBeNull();
    expect(result!.product.id).toBe("panel1");
    expect(result!.confidence).toBe("auto");
  });

  it("alias match returns auto confidence", () => {
    const result = autoMatch("RSM545", index);
    expect(result).not.toBeNull();
    expect(result!.product.id).toBe("panel1");
    expect(result!.confidence).toBe("auto");
  });

  it("case insensitive matching", () => {
    const result = autoMatch("ds3d-2000", index);
    expect(result).not.toBeNull();
    expect(result!.product.id).toBe("micro1");
  });

  it("returns null for unknown model", () => {
    const result = autoMatch("UNKNOWN-999", index);
    expect(result).toBeNull();
  });

  it("does not match short strings (< 6 chars normalized)", () => {
    // "DS3D" normalizes to "ds3d" (4 chars) — should NOT match "ds3d2000"
    const result = autoMatch("DS3D", index);
    expect(result).toBeNull();
  });

  it("does not match very different length strings", () => {
    // "RSM" is too short and too different from "rsm14410545bhdg"
    const result = autoMatch("RSM", index);
    expect(result).toBeNull();
  });
});

// ── inferProductType ─────────────────────────────────────────────────────

describe("inferProductType", () => {
  it("detects panel by brand", () => {
    expect(inferProductType({ modelo: "RSM144", marca: "Risen" })).toBe("panel");
  });

  it("detects panel by wattage in potencia", () => {
    expect(inferProductType({ modelo: "ABC", potencia: "545W" })).toBe("panel");
  });

  it("detects micro by keyword", () => {
    expect(inferProductType({ modelo: "DS3D-2000", marca: "APSystems" })).toBe("micro");
  });

  it("detects micro by enphase brand", () => {
    expect(inferProductType({ modelo: "IQ8", marca: "Enphase" })).toBe("micro");
  });

  it("detects general by cable keyword", () => {
    expect(inferProductType({ modelo: "Cable troncal 2m" })).toBe("general");
  });

  it("returns desconocido for unrecognized", () => {
    expect(inferProductType({ modelo: "XYZ-123" })).toBe("desconocido");
  });
});

// ── normalizePrice ───────────────────────────────────────────────────────

describe("normalizePrice", () => {
  it("parses per-watt USD price", () => {
    const result = normalizePrice("$0.185/W", "USD", "por_watt", 545);
    expect(result).not.toBeNull();
    expect(result!.valor).toBeCloseTo(0.185);
    expect(result!.moneda).toBe("USD");
    expect(result!.unidad).toBe("por_watt");
    expect(result!.valorPorWatt).toBeCloseTo(0.185);
  });

  it("parses per-piece price and computes per-watt", () => {
    const result = normalizePrice("$125.00", "USD", "por_unidad", 545);
    expect(result).not.toBeNull();
    expect(result!.valor).toBeCloseTo(125);
    expect(result!.unidad).toBe("por_pieza");
    expect(result!.valorPorWatt).toBeCloseTo(125 / 545);
  });

  it("parses MXN price with commas", () => {
    const result = normalizePrice("$3,250", "MXN", "por_unidad");
    expect(result).not.toBeNull();
    expect(result!.valor).toBeCloseTo(3250);
    expect(result!.moneda).toBe("MXN");
  });

  it("returns null for empty price", () => {
    expect(normalizePrice(undefined, "USD", "por_watt")).toBeNull();
    expect(normalizePrice("", "USD", "por_watt")).toBeNull();
  });

  it("returns null for non-numeric price", () => {
    expect(normalizePrice("N/A", "USD", "por_watt")).toBeNull();
  });

  it("defaults to USD for unknown currency", () => {
    const result = normalizePrice("$100", "EUR", "por_unidad");
    expect(result!.moneda).toBe("USD");
  });
});
