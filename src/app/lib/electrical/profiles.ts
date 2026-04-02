import type { EquipmentProfile } from "./types";

// ── Microinverter Profiles ──────────────────────────────────────────────────

export const DS3D: EquipmentProfile = {
  id: "apsystems-ds3d",
  nombre: "APsystems DS3D",
  tipo: "microinversor",
  marca: "APsystems",
  modelo: "DS3D",

  potenciaW: 880,              // 2 × 440W max per channel
  voltajeACSalida: 240,
  amperajeACPorUnidad: 8.3,    // 8.3 A per micro
  fasesSalida: 1,

  maxUnidadesPorCircuito: 3,
  toleranciaBreaker: 1.25,     // NEC 125%
  breakersDisponibles: [15, 20, 30, 40],

  cableRulesAC: [
    { maxUnidades: 2, calibreAWG: 12, conductores: 3, tipoUsoRudo: "Uso rudo 3x12" },
    { maxUnidades: 3, calibreAWG: 10, conductores: 3, tipoUsoRudo: "Uso rudo 3x10" },
  ],

  panelesPorUnidad: 2,
  maxCadena: 4,                // max micros per trunk cable (APsystems spec)

  requiereTierraFisica: true,
  calibreTierra: 10,           // 10 AWG tierra física
  notas: "Microinversor dual. Cada DS3D maneja 2 paneles. Cable troncal APsystems separado.",
};

export const QS1: EquipmentProfile = {
  id: "apsystems-qs1",
  nombre: "APsystems QS1",
  tipo: "microinversor",
  marca: "APsystems",
  modelo: "QS1",

  potenciaW: 1200,             // 4 × 300W max per channel
  voltajeACSalida: 240,
  amperajeACPorUnidad: 5.0,    // ~5 A per micro
  fasesSalida: 1,

  maxUnidadesPorCircuito: 4,
  toleranciaBreaker: 1.25,
  breakersDisponibles: [15, 20, 30, 40],

  cableRulesAC: [
    { maxUnidades: 2, calibreAWG: 12, conductores: 3, tipoUsoRudo: "Uso rudo 3x12" },
    { maxUnidades: 4, calibreAWG: 10, conductores: 3, tipoUsoRudo: "Uso rudo 3x10" },
  ],

  panelesPorUnidad: 4,
  maxCadena: 3,

  requiereTierraFisica: true,
  calibreTierra: 10,
  notas: "Microinversor cuádruple. Cada QS1 maneja 4 paneles.",
};

// ── String Inverter Profiles ────────────────────────────────────────────────

export const SOLIS_5K: EquipmentProfile = {
  id: "solis-s6-5k",
  nombre: "Solis S6-GR1P5K-S",
  tipo: "inversor_string",
  marca: "Solis",
  modelo: "S6-GR1P5K-S",

  potenciaW: 5000,
  voltajeACSalida: 240,
  amperajeACPorUnidad: 20.8,   // 5000W / 240V
  fasesSalida: 1,

  maxUnidadesPorCircuito: 1,   // one inverter per circuit
  toleranciaBreaker: 1.25,
  breakersDisponibles: [15, 20, 30, 40, 50, 60],

  cableRulesAC: [
    { maxUnidades: 1, calibreAWG: 10, conductores: 3, tipoUsoRudo: "Uso rudo 3x10" },
  ],

  mpptInputs: 2,
  maxStringsPorMPPT: 1,
  maxPanelesString: 13,        // depends on Voc of panel
  voltajeDCMax: 600,
  amperajeDCMax: 16,
  cableRulesDC: [
    { maxUnidades: 1, calibreAWG: 10, conductores: 2, tipoUsoRudo: "Cable fotovoltaico 10 AWG" },
  ],
  requiereDesconectorDC: true,
  amperajeDesconectorDC: 25,

  requiereTierraFisica: true,
  calibreTierra: 8,
  notas: "Inversor string monofásico 5kW. 2 MPPT, max 600V DC.",
};

export const SOLIS_10K_3P: EquipmentProfile = {
  id: "solis-s5-10k-3p",
  nombre: "Solis S5-GR3P10K-LV",
  tipo: "inversor_string",
  marca: "Solis",
  modelo: "S5-GR3P10K-LV",

  potenciaW: 10000,
  voltajeACSalida: 220,        // 220V trifásico
  amperajeACPorUnidad: 26.2,   // 10000W / (220V × √3) ≈ 26.2A
  fasesSalida: 3,

  maxUnidadesPorCircuito: 1,
  toleranciaBreaker: 1.25,
  breakersDisponibles: [20, 30, 40, 50, 60, 70, 80, 100],

  cableRulesAC: [
    { maxUnidades: 1, calibreAWG: 8, conductores: 4, tipoUsoRudo: "Cable THHN 4x8 AWG" },
  ],

  mpptInputs: 2,
  maxStringsPorMPPT: 2,
  maxPanelesString: 15,
  voltajeDCMax: 600,
  amperajeDCMax: 16,
  cableRulesDC: [
    { maxUnidades: 1, calibreAWG: 10, conductores: 2, tipoUsoRudo: "Cable fotovoltaico 10 AWG" },
  ],
  requiereDesconectorDC: true,
  amperajeDesconectorDC: 32,

  requiereTierraFisica: true,
  calibreTierra: 6,
  notas: "Inversor string trifásico 10kW 220V. 2 MPPT con 4 entradas.",
};

// ── Hybrid Inverter Profile ─────────────────────────────────────────────────

export const HUAWEI_5KTL: EquipmentProfile = {
  id: "huawei-sun2000-5ktl",
  nombre: "Huawei SUN2000-5KTL-L1",
  tipo: "inversor_hibrido",
  marca: "Huawei",
  modelo: "SUN2000-5KTL-L1",

  potenciaW: 5000,
  voltajeACSalida: 240,
  amperajeACPorUnidad: 20.8,
  fasesSalida: 1,

  maxUnidadesPorCircuito: 1,
  toleranciaBreaker: 1.25,
  breakersDisponibles: [15, 20, 30, 40, 50, 60],

  cableRulesAC: [
    { maxUnidades: 1, calibreAWG: 10, conductores: 3, tipoUsoRudo: "Uso rudo 3x10" },
  ],

  mpptInputs: 2,
  maxStringsPorMPPT: 2,
  maxPanelesString: 16,
  voltajeDCMax: 600,
  amperajeDCMax: 22,
  cableRulesDC: [
    { maxUnidades: 1, calibreAWG: 10, conductores: 2, tipoUsoRudo: "Cable fotovoltaico 10 AWG" },
  ],
  requiereDesconectorDC: true,
  amperajeDesconectorDC: 32,

  requiereTierraFisica: true,
  calibreTierra: 8,
  notas: "Inversor híbrido con almacenamiento DC. Compatible con batería LUNA2000.",
};

// ── Profile Registry ────────────────────────────────────────────────────────

export const EQUIPMENT_PROFILES: Record<string, EquipmentProfile> = {
  "apsystems-ds3d": DS3D,
  "apsystems-qs1": QS1,
  "solis-s6-5k": SOLIS_5K,
  "solis-s5-10k-3p": SOLIS_10K_3P,
  "huawei-sun2000-5ktl": HUAWEI_5KTL,
};

/** Get a profile by ID. Returns undefined if not found. */
export function getProfile(id: string): EquipmentProfile | undefined {
  return EQUIPMENT_PROFILES[id];
}

/** List all profiles */
export function listProfiles(): EquipmentProfile[] {
  return Object.values(EQUIPMENT_PROFILES);
}

/** List profiles by type */
export function listProfilesByType(tipo: EquipmentProfile["tipo"]): EquipmentProfile[] {
  return Object.values(EQUIPMENT_PROFILES).filter((p) => p.tipo === tipo);
}
