import { describe, it, expect } from "vitest";
import { calculateElectrical } from "./calculate-electrical";
import { DS3D, QS1, SOLIS_5K, SOLIS_10K_3P } from "./profiles";
import {
  getAmperajeTotal,
  getAmperajeConTolerancia,
  getCantidadCircuitos,
  distribuirUnidadesPorCircuito,
  seleccionarBreaker,
  seleccionarCable,
} from "./rules";

// ── Unit tests: individual rules ──────────────────────────────────────────

describe("rules", () => {
  describe("getAmperajeTotal", () => {
    it("8.3A × 1 micro = 8.3A", () => expect(getAmperajeTotal(8.3, 1)).toBeCloseTo(8.3));
    it("8.3A × 3 micros = 24.9A", () => expect(getAmperajeTotal(8.3, 3)).toBeCloseTo(24.9));
    it("8.3A × 6 micros = 49.8A", () => expect(getAmperajeTotal(8.3, 6)).toBeCloseTo(49.8));
  });

  describe("getAmperajeConTolerancia", () => {
    it("24.9A × 1.25 = 31.125A", () => expect(getAmperajeConTolerancia(24.9, 1.25)).toBeCloseTo(31.125));
    it("8.3A × 1.25 = 10.375A", () => expect(getAmperajeConTolerancia(8.3, 1.25)).toBeCloseTo(10.375));
  });

  describe("getCantidadCircuitos", () => {
    it("3 micros, max 3 → 1 circuit", () => expect(getCantidadCircuitos(3, 3)).toBe(1));
    it("4 micros, max 3 → 2 circuits", () => expect(getCantidadCircuitos(4, 3)).toBe(2));
    it("6 micros, max 3 → 2 circuits", () => expect(getCantidadCircuitos(6, 3)).toBe(2));
    it("7 micros, max 3 → 3 circuits", () => expect(getCantidadCircuitos(7, 3)).toBe(3));
    it("1 inverter, max 1 → 1 circuit", () => expect(getCantidadCircuitos(1, 1)).toBe(1));
  });

  describe("distribuirUnidadesPorCircuito", () => {
    it("6 micros, max 3 → [3, 3]", () => {
      expect(distribuirUnidadesPorCircuito(6, 3)).toEqual([3, 3]);
    });
    it("7 micros, max 3 → [3, 2, 2] (balanced)", () => {
      expect(distribuirUnidadesPorCircuito(7, 3)).toEqual([3, 2, 2]);
    });
    it("5 micros, max 3 → [3, 2]", () => {
      expect(distribuirUnidadesPorCircuito(5, 3)).toEqual([3, 2]);
    });
    it("1 micro, max 3 → [1]", () => {
      expect(distribuirUnidadesPorCircuito(1, 3)).toEqual([1]);
    });
    it("4 micros, max 3 → [2, 2] (balanced)", () => {
      expect(distribuirUnidadesPorCircuito(4, 3)).toEqual([2, 2]);
    });
    it("3 micros, max 3 → [3]", () => {
      expect(distribuirUnidadesPorCircuito(3, 3)).toEqual([3]);
    });
    it("0 units → empty", () => {
      expect(distribuirUnidadesPorCircuito(0, 3)).toEqual([]);
    });
  });

  describe("seleccionarBreaker", () => {
    const breakers = [15, 20, 30, 40];

    it("10.375A → 15A breaker (within 5% tolerance)", () => {
      expect(seleccionarBreaker(10.375, breakers)).toBe(15);
    });
    it("31.125A → 40A breaker", () => {
      // 31.125 > 30 * 1.05 = 31.5 → barely fits 30A? 31.125 <= 31.5 → YES, 30A
      expect(seleccionarBreaker(31.125, breakers)).toBe(30);
    });
    it("20.75A → 20A breaker (20 × 1.05 = 21)", () => {
      expect(seleccionarBreaker(20.75, breakers)).toBe(20);
    });
    it("21.1A → 30A breaker (exceeds 20 × 1.05)", () => {
      expect(seleccionarBreaker(21.1, breakers)).toBe(30);
    });
    it("45A → -1 (no breaker covers)", () => {
      expect(seleccionarBreaker(45, breakers)).toBe(-1);
    });
  });

  describe("seleccionarCable", () => {
    it("DS3D: 1–2 micros → 12 AWG", () => {
      const cable = seleccionarCable(1, DS3D.cableRulesAC);
      expect(cable?.calibreAWG).toBe(12);
      expect(cable?.tipoUsoRudo).toBe("Uso rudo 3x12");
    });
    it("DS3D: 2 micros → 12 AWG", () => {
      expect(seleccionarCable(2, DS3D.cableRulesAC)?.calibreAWG).toBe(12);
    });
    it("DS3D: 3 micros → 10 AWG", () => {
      const cable = seleccionarCable(3, DS3D.cableRulesAC);
      expect(cable?.calibreAWG).toBe(10);
      expect(cable?.tipoUsoRudo).toBe("Uso rudo 3x10");
    });
  });
});

// ── DS3D Integration Tests ───────────────────────────────────────────────

describe("DS3D: 6 microinversores", () => {
  const result = calculateElectrical({
    equipmentProfileId: "apsystems-ds3d",
    cantidadEquipos: 6,
  });

  it("profile resolved correctly", () => {
    expect(result.perfil.modelo).toBe("DS3D");
  });

  it("total amperage = 49.8A", () => {
    expect(result.amperajeTotalAC).toBeCloseTo(49.8);
  });

  it("total amperage with tolerance = 62.25A", () => {
    expect(result.amperajeTotalConTolerancia).toBeCloseTo(62.25);
  });

  it("2 circuits (6 ÷ 3 = 2)", () => {
    expect(result.totalCircuitos).toBe(2);
    expect(result.circuitos).toHaveLength(2);
  });

  it("each circuit has 3 micros", () => {
    expect(result.circuitos[0].unidadesEnCircuito).toBe(3);
    expect(result.circuitos[1].unidadesEnCircuito).toBe(3);
  });

  it("each circuit: 24.9A raw, 31.125A with tolerance", () => {
    expect(result.circuitos[0].amperajeCircuito).toBeCloseTo(24.9);
    expect(result.circuitos[0].amperajeConTolerancia).toBeCloseTo(31.125);
  });

  it("breaker: 30A (31.125 ≤ 30 × 1.05 = 31.5)", () => {
    expect(result.circuitos[0].breakerSeleccionado).toBe(30);
    expect(result.circuitos[1].breakerSeleccionado).toBe(30);
  });

  it("cable: 10 AWG (3 micros per circuit)", () => {
    expect(result.circuitos[0].calibreCableAWG).toBe(10);
    expect(result.circuitos[0].tipoCable).toBe("Uso rudo 3x10");
  });

  it("breaker summary: 2 × 30A", () => {
    expect(result.breakerResumen).toEqual([{ amperaje: 30, cantidad: 2 }]);
  });

  it("ground wire: 10 AWG", () => {
    expect(result.tierraFisica?.requerida).toBe(true);
    expect(result.tierraFisica?.calibreAWG).toBe(10);
  });

  it("no warnings", () => {
    expect(result.warnings).toHaveLength(0);
  });
});

describe("DS3D: 4 microinversores", () => {
  const result = calculateElectrical({
    equipmentProfileId: "apsystems-ds3d",
    cantidadEquipos: 4,
  });

  it("2 circuits (balanced: [2, 2])", () => {
    expect(result.totalCircuitos).toBe(2);
    expect(result.circuitos[0].unidadesEnCircuito).toBe(2);
    expect(result.circuitos[1].unidadesEnCircuito).toBe(2);
  });

  it("each circuit: 16.6A raw, 20.75A with tolerance", () => {
    expect(result.circuitos[0].amperajeCircuito).toBeCloseTo(16.6);
    expect(result.circuitos[0].amperajeConTolerancia).toBeCloseTo(20.75);
  });

  it("breaker: 20A (20.75 ≤ 20 × 1.05 = 21)", () => {
    expect(result.circuitos[0].breakerSeleccionado).toBe(20);
  });

  it("cable: 12 AWG (2 micros per circuit)", () => {
    expect(result.circuitos[0].calibreCableAWG).toBe(12);
    expect(result.circuitos[0].tipoCable).toBe("Uso rudo 3x12");
  });
});

describe("DS3D: 1 microinversor", () => {
  const result = calculateElectrical({
    equipmentProfileId: "apsystems-ds3d",
    cantidadEquipos: 1,
  });

  it("1 circuit with 1 micro", () => {
    expect(result.totalCircuitos).toBe(1);
    expect(result.circuitos[0].unidadesEnCircuito).toBe(1);
  });

  it("amperage: 8.3A raw, 10.375A with tolerance", () => {
    expect(result.circuitos[0].amperajeConTolerancia).toBeCloseTo(10.375);
  });

  it("breaker: 15A", () => {
    expect(result.circuitos[0].breakerSeleccionado).toBe(15);
  });

  it("cable: 12 AWG", () => {
    expect(result.circuitos[0].calibreCableAWG).toBe(12);
  });
});

describe("DS3D: 7 microinversores (odd distribution)", () => {
  const result = calculateElectrical({
    equipmentProfileId: "apsystems-ds3d",
    cantidadEquipos: 7,
  });

  it("3 circuits (balanced: [3, 2, 2])", () => {
    expect(result.totalCircuitos).toBe(3);
    expect(result.circuitos.map((c) => c.unidadesEnCircuito)).toEqual([3, 2, 2]);
  });

  it("circuit 1: 3 micros, 30A breaker, 10 AWG", () => {
    expect(result.circuitos[0].breakerSeleccionado).toBe(30);
    expect(result.circuitos[0].calibreCableAWG).toBe(10);
  });

  it("circuit 2–3: 2 micros, 20A breaker, 12 AWG", () => {
    expect(result.circuitos[1].breakerSeleccionado).toBe(20);
    expect(result.circuitos[1].calibreCableAWG).toBe(12);
    expect(result.circuitos[2].breakerSeleccionado).toBe(20);
  });

  it("breaker summary: 1×30A + 2×20A", () => {
    expect(result.breakerResumen).toEqual([
      { amperaje: 20, cantidad: 2 },
      { amperaje: 30, cantidad: 1 },
    ]);
  });
});

// ── String Inverter Tests ────────────────────────────────────────────────

describe("Solis 5K: string inverter", () => {
  const result = calculateElectrical({
    equipmentProfileId: "solis-s6-5k",
    cantidadEquipos: 1,
    cantidadPaneles: 12,
  });

  it("1 circuit, 1 inverter", () => {
    expect(result.totalCircuitos).toBe(1);
  });

  it("amperage: 20.8A, with tolerance: 26A", () => {
    expect(result.amperajeTotalAC).toBeCloseTo(20.8);
    expect(result.amperajeTotalConTolerancia).toBeCloseTo(26);
  });

  it("breaker: 30A", () => {
    expect(result.circuitos[0].breakerSeleccionado).toBe(30);
  });

  it("cable AC: 10 AWG", () => {
    expect(result.circuitos[0].calibreCableAWG).toBe(10);
  });

  it("string config: 2 MPPTs", () => {
    expect(result.stringConfig).toBeDefined();
    expect(result.stringConfig!.length).toBeGreaterThan(0);
  });

  it("DC disconnect required: 25A", () => {
    expect(result.desconectorDC?.requerido).toBe(true);
    expect(result.desconectorDC?.amperaje).toBe(25);
  });

  it("ground: 8 AWG", () => {
    expect(result.tierraFisica?.calibreAWG).toBe(8);
  });
});

describe("Solis 10K trifásico", () => {
  const result = calculateElectrical({
    equipmentProfileId: "solis-s5-10k-3p",
    cantidadEquipos: 1,
    cantidadPaneles: 24,
  });

  it("3-phase output", () => {
    expect(result.perfil.fasesSalida).toBe(3);
  });

  it("amperage: 26.2A, tolerance: 32.75A", () => {
    expect(result.amperajeTotalAC).toBeCloseTo(26.2);
    expect(result.amperajeTotalConTolerancia).toBeCloseTo(32.75);
  });

  it("breaker: 40A", () => {
    // 32.75 > 30 × 1.05 = 31.5 → 40A
    expect(result.circuitos[0].breakerSeleccionado).toBe(40);
  });

  it("cable: 8 AWG 4-conductor", () => {
    expect(result.circuitos[0].calibreCableAWG).toBe(8);
  });

  it("DC disconnect: 32A", () => {
    expect(result.desconectorDC?.amperaje).toBe(32);
  });

  it("ground: 6 AWG", () => {
    expect(result.tierraFisica?.calibreAWG).toBe(6);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("unknown profile ID → warning", () => {
    const result = calculateElectrical({
      equipmentProfileId: "unknown-model",
      cantidadEquipos: 1,
    });
    expect(result.warnings.some((w) => w.includes("no encontrado"))).toBe(true);
    expect(result.totalCircuitos).toBe(0);
  });

  it("0 units → warning", () => {
    const result = calculateElectrical({
      equipmentProfileId: "apsystems-ds3d",
      cantidadEquipos: 0,
    });
    expect(result.warnings.some((w) => w.includes("mayor a 0"))).toBe(true);
  });

  it("custom profile works", () => {
    const customProfile = { ...DS3D, id: "custom", amperajeACPorUnidad: 10 };
    const result = calculateElectrical(
      { equipmentProfileId: "custom", cantidadEquipos: 3 },
      customProfile,
    );
    expect(result.amperajeTotalAC).toBeCloseTo(30);
  });

  it("cable distance estimate", () => {
    const result = calculateElectrical({
      equipmentProfileId: "apsystems-ds3d",
      cantidadEquipos: 6,
      distanciaMetros: 15,
    });
    // 2 circuits × 15m = 30m
    expect(result.metrosCableACEstimado).toBe(30);
  });
});
