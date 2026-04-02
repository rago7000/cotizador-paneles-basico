import { describe, it, expect } from "vitest";
import { calculateStructure } from "./calculate-structure";
import { calculateRow } from "./calculate-row";
import {
  getEspacios,
  getArmaduras,
  getTipoArmadura,
  getMetrosArmadura,
  getAngulosFila,
  getContraflambeoMetros,
  getContraflambeoPiezas,
  getAngulosContraflambeo,
  getBaseUnicanal,
  getUnicanalBasePiezas,
  getUnicanalesFila,
  getRestanteMetros,
  getRestanteCapacidad,
  getClipsBase,
  getClipsConDesperdicio,
} from "./rules";
import { validateRow, validateInput } from "./validators";

// ── Unit tests: individual rules ──────────────────────────────────────────

describe("rules", () => {
  describe("getEspacios", () => {
    it("returns horizontal × vertical", () => {
      expect(getEspacios(4, 1)).toBe(4);
      expect(getEspacios(4, 2)).toBe(8);
      expect(getEspacios(3, 1)).toBe(3);
      expect(getEspacios(0, 0)).toBe(0);
    });
  });

  describe("getArmaduras", () => {
    it("returns 2 for horizontal 1–3", () => {
      expect(getArmaduras(1)).toBe(2);
      expect(getArmaduras(2)).toBe(2);
      expect(getArmaduras(3)).toBe(2);
    });
    it("returns 3 for horizontal 4–6", () => {
      expect(getArmaduras(4)).toBe(3);
      expect(getArmaduras(5)).toBe(3);
      expect(getArmaduras(6)).toBe(3);
    });
    it("returns 0 for horizontal ≤ 0", () => {
      expect(getArmaduras(0)).toBe(0);
      expect(getArmaduras(-1)).toBe(0);
    });
    it("returns -1 for horizontal > 6", () => {
      expect(getArmaduras(7)).toBe(-1);
      expect(getArmaduras(10)).toBe(-1);
    });
  });

  describe("getTipoArmadura", () => {
    it("returns sencilla for vertical=1", () => {
      expect(getTipoArmadura(1)).toBe("sencilla");
    });
    it("returns doble for vertical=2", () => {
      expect(getTipoArmadura(2)).toBe("doble");
    });
    it("returns ninguna for other values", () => {
      expect(getTipoArmadura(0)).toBe("ninguna");
      expect(getTipoArmadura(3)).toBe("ninguna");
    });
  });

  describe("getMetrosArmadura", () => {
    it("returns vertical × 3", () => {
      expect(getMetrosArmadura(1)).toBe(3);
      expect(getMetrosArmadura(2)).toBe(6);
    });
  });

  describe("getAngulosFila", () => {
    it("calculates (metrosArmadura / 6) × armaduras", () => {
      expect(getAngulosFila(3, 3)).toBe(1.5); // 3m arm, 3 armaduras
      expect(getAngulosFila(6, 3)).toBe(3);   // 6m arm, 3 armaduras
      expect(getAngulosFila(3, 2)).toBe(1);   // 3m arm, 2 armaduras
      expect(getAngulosFila(6, 2)).toBe(2);   // 6m arm, 2 armaduras
    });
  });

  describe("contraflambeo", () => {
    it("returns 0 for vertical=1 (sencilla)", () => {
      expect(getContraflambeoMetros(1, 3)).toBe(0);
    });
    it("calculates armaduras × 1.4 for vertical=2", () => {
      expect(getContraflambeoMetros(2, 3)).toBeCloseTo(4.2);
    });
    it("calculates piezas from metros", () => {
      expect(getContraflambeoPiezas(4.2)).toBeCloseTo(3);
    });
    it("calculates ángulos equivalentes", () => {
      expect(getAngulosContraflambeo(3)).toBe(0.75);
    });
  });

  describe("unicanal", () => {
    it("getBaseUnicanal returns correct values", () => {
      expect(getBaseUnicanal(0)).toBe(0);
      expect(getBaseUnicanal(1)).toBe(2);
      expect(getBaseUnicanal(2)).toBe(2);
      expect(getBaseUnicanal(3)).toBe(3);
      expect(getBaseUnicanal(4)).toBe(6);
      expect(getBaseUnicanal(5)).toBe(6);
      expect(getBaseUnicanal(6)).toBe(6);
    });
    it("getUnicanalBasePiezas divides by 6", () => {
      expect(getUnicanalBasePiezas(6)).toBe(1);
      expect(getUnicanalBasePiezas(3)).toBeCloseTo(0.5);
      expect(getUnicanalBasePiezas(2)).toBeCloseTo(1 / 3);
    });
    it("getUnicanalesFila = basePiezas × 2 × vertical", () => {
      expect(getUnicanalesFila(1, 1)).toBe(2);
      expect(getUnicanalesFila(1, 2)).toBe(4);
      expect(getUnicanalesFila(0.5, 1)).toBe(1);
    });
  });

  describe("restantes", () => {
    it("getRestanteMetros = baseUnicanal - horizontal", () => {
      expect(getRestanteMetros(6, 4)).toBe(2);
      expect(getRestanteMetros(3, 3)).toBe(0);
      expect(getRestanteMetros(2, 2)).toBe(0);
    });
    it("getRestanteCapacidad = vertical × 2 if restante > 0", () => {
      expect(getRestanteCapacidad(2, 1)).toBe(2);
      expect(getRestanteCapacidad(2, 2)).toBe(4);
      expect(getRestanteCapacidad(0, 1)).toBe(0);
    });
  });

  describe("clips", () => {
    it("getClipsBase = totalPaneles × 4", () => {
      expect(getClipsBase(24)).toBe(96);
    });
    it("getClipsConDesperdicio = ceil(base × 1.05)", () => {
      expect(getClipsConDesperdicio(96)).toBe(101);
    });
  });
});

// ── Validators ────────────────────────────────────────────────────────────

describe("validators", () => {
  it("rejects empty array", () => {
    const r = validateInput([]);
    expect(r.valid).toBe(false);
  });

  it("rejects negative values", () => {
    const r = validateRow({ horizontal: -1, vertical: 1 }, 0);
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("negativos");
  });

  it("warns on horizontal > 6", () => {
    const r = validateRow({ horizontal: 7, vertical: 1 }, 0);
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("excede");
  });

  it("warns on vertical > 2", () => {
    const r = validateRow({ horizontal: 4, vertical: 3 }, 0);
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("excede");
  });

  it("passes valid input", () => {
    const r = validateRow({ horizontal: 4, vertical: 1 }, 0);
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });
});

// ── Integration: Caso 1 ──────────────────────────────────────────────────

describe("Caso 1: { horizontal: 4, vertical: 1 }", () => {
  const row = calculateRow({ horizontal: 4, vertical: 1 });

  it("espacios = 4", () => expect(row.espacios).toBe(4));
  it("armaduras = 3", () => expect(row.armaduras).toBe(3));
  it("tipo = sencilla", () => expect(row.tipoArmadura).toBe("sencilla"));
  it("metrosArmadura = 3", () => expect(row.metrosArmadura).toBe(3));
  it("angulosFila = 1.5", () => expect(row.angulosFila).toBe(1.5));
  it("contraflambeoMetros = 0", () => expect(row.contraflambeoMetros).toBe(0));
  it("baseUnicanal = 6", () => expect(row.baseUnicanal).toBe(6));
  it("unicanalBasePiezas = 1", () => expect(row.unicanalBasePiezas).toBe(1));
  it("unicanalesFila = 2", () => expect(row.unicanalesFila).toBe(2));
  it("restanteMetros = 2", () => expect(row.restanteMetros).toBe(2));
  it("restanteCapacidad = 2", () => expect(row.restanteCapacidad).toBe(2));
});

// ── Integration: Caso 2 ──────────────────────────────────────────────────

describe("Caso 2: { horizontal: 4, vertical: 2 }", () => {
  const row = calculateRow({ horizontal: 4, vertical: 2 });

  it("espacios = 8", () => expect(row.espacios).toBe(8));
  it("armaduras = 3", () => expect(row.armaduras).toBe(3));
  it("tipo = doble", () => expect(row.tipoArmadura).toBe("doble"));
  it("metrosArmadura = 6", () => expect(row.metrosArmadura).toBe(6));
  it("angulosFila = 3", () => expect(row.angulosFila).toBe(3));
  it("contraflambeoMetros = 4.2", () => expect(row.contraflambeoMetros).toBeCloseTo(4.2));
  it("angulosContraflambeo = 0.75", () => expect(row.angulosContraflambeo).toBeCloseTo(0.75));
  it("baseUnicanal = 6", () => expect(row.baseUnicanal).toBe(6));
  it("unicanalBasePiezas = 1", () => expect(row.unicanalBasePiezas).toBe(1));
  it("unicanalesFila = 4", () => expect(row.unicanalesFila).toBe(4));
  it("restanteMetros = 2", () => expect(row.restanteMetros).toBe(2));
  it("restanteCapacidad = 4", () => expect(row.restanteCapacidad).toBe(4));
});

// ── Integration: Caso 3 — multi-row totals ───────────────────────────────

describe("Caso 3: 4 filas mixtas", () => {
  const result = calculateStructure([
    { horizontal: 4, vertical: 1 },
    { horizontal: 4, vertical: 1 },
    { horizontal: 4, vertical: 2 },
    { horizontal: 4, vertical: 2 },
  ]);
  const t = result.totals;

  it("totalPaneles = 24", () => expect(t.totalPaneles).toBe(24));
  it("totalAngulos = 9", () => expect(t.totalAngulos).toBe(9));
  it("totalAngulosCompra = 9", () => expect(t.totalAngulosCompra).toBe(9));
  it("totalContraflambeoMetros = 8.4", () => expect(t.totalContraflambeoMetros).toBeCloseTo(8.4));
  it("totalAngulosContraflambeo = 1.5", () => expect(t.totalAngulosContraflambeo).toBeCloseTo(1.5));
  it("totalAngulosContraflambeoCompra = 2", () => expect(t.totalAngulosContraflambeoCompra).toBe(2));
  it("totalUnicanales = 12", () => expect(t.totalUnicanales).toBe(12));
  it("totalUnicanalesCompra = 12", () => expect(t.totalUnicanalesCompra).toBe(12));
  it("totalRestanteMetros = 8", () => expect(t.totalRestanteMetros).toBe(8));
  it("totalRestanteCapacidad = 12", () => expect(t.totalRestanteCapacidad).toBe(12));
  it("clipsBase = 96", () => expect(t.clipsBase).toBe(96));
  it("clipsConDesperdicio = 101", () => expect(t.clipsConDesperdicio).toBe(101));
  it("4 rows computed", () => expect(result.rows).toHaveLength(4));
  it("no warnings", () => expect(t.warnings).toHaveLength(0));
});

// ── Integration: Caso 4 — invalid inputs ─────────────────────────────────

describe("Caso 4: invalid inputs", () => {
  it("horizontal=0, vertical=0 — empty row skipped", () => {
    const result = calculateStructure([{ horizontal: 0, vertical: 0 }]);
    expect(result.rows).toHaveLength(0);
    expect(result.totals.totalPaneles).toBe(0);
    expect(result.totals.warnings.length).toBeGreaterThan(0);
  });

  it("horizontal=7 — warning about exceeding max", () => {
    const result = calculateStructure([{ horizontal: 7, vertical: 1 }]);
    // Row is still calculated but with warnings
    expect(result.totals.warnings.some((w) => w.includes("excede"))).toBe(true);
  });

  it("vertical=3 — warning about exceeding max", () => {
    const result = calculateStructure([{ horizontal: 4, vertical: 3 }]);
    expect(result.totals.warnings.some((w) => w.includes("excede"))).toBe(true);
  });

  it("negative values — row skipped", () => {
    const result = calculateStructure([{ horizontal: -1, vertical: 1 }]);
    expect(result.rows).toHaveLength(0);
    expect(result.totals.warnings.some((w) => w.includes("negativos"))).toBe(true);
  });

  it("mixed valid and invalid rows", () => {
    const result = calculateStructure([
      { horizontal: 4, vertical: 1 },  // valid
      { horizontal: 0, vertical: 0 },  // skipped
      { horizontal: 4, vertical: 2 },  // valid
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.totals.totalPaneles).toBe(12); // 4 + 8
    expect(result.totals.warnings.length).toBeGreaterThan(0);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("single panel: horizontal=1, vertical=1", () => {
    const row = calculateRow({ horizontal: 1, vertical: 1 });
    expect(row.espacios).toBe(1);
    expect(row.armaduras).toBe(2);
    expect(row.tipoArmadura).toBe("sencilla");
    expect(row.baseUnicanal).toBe(2);
    expect(row.restanteMetros).toBe(1);
  });

  it("horizontal=3, vertical=1", () => {
    const row = calculateRow({ horizontal: 3, vertical: 1 });
    expect(row.armaduras).toBe(2);
    expect(row.baseUnicanal).toBe(3);
    expect(row.restanteMetros).toBe(0);
    expect(row.restanteCapacidad).toBe(0);
  });

  it("horizontal=6, vertical=2 — max supported", () => {
    const row = calculateRow({ horizontal: 6, vertical: 2 });
    expect(row.armaduras).toBe(3);
    expect(row.tipoArmadura).toBe("doble");
    expect(row.baseUnicanal).toBe(6);
    expect(row.restanteMetros).toBe(0);
  });

  it("empty array returns zero totals", () => {
    const result = calculateStructure([]);
    expect(result.totals.totalPaneles).toBe(0);
    expect(result.totals.warnings.length).toBeGreaterThan(0);
  });
});
