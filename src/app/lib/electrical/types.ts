// ── Electrical Calculation Types ─────────────────────────────────────────────

/** Equipment type classification */
export type TipoEquipo = "microinversor" | "inversor_string" | "inversor_hibrido";

/** Cable gauge rule: for up to N units in a circuit, use this AWG */
export type CableRule = {
  maxUnidades: number;
  calibreAWG: number;
  conductores: number;   // e.g. 3 for 3-conductor cable
  tipoUsoRudo: string;   // e.g. "3x12", "3x10"
};

/** Equipment profile — defines electrical specs for a specific inverter model */
export type EquipmentProfile = {
  id: string;
  nombre: string;
  tipo: TipoEquipo;
  marca: string;
  modelo: string;

  // ── Common electrical specs ──
  potenciaW: number;              // nominal output power (W)
  voltajeACSalida: number;        // AC output voltage (V) — 120, 240, 480, etc.
  amperajeACPorUnidad: number;    // AC amps per unit (for micros: per microinverter)
  fasesSalida: 1 | 2 | 3;        // single-phase, split-phase, three-phase

  // ── Breaker/circuit rules ──
  maxUnidadesPorCircuito: number; // max units per breaker circuit
  toleranciaBreaker: number;      // NEC multiplier (typically 1.25 = 125%)
  breakersDisponibles: number[];  // available breaker sizes in amps

  // ── Cable rules (AC side) ──
  cableRulesAC: CableRule[];      // AWG rules by units per circuit (sorted ascending by maxUnidades)

  // ── Microinverter-specific ──
  panelesPorUnidad?: number;      // panels per micro (e.g. 2 for DS3D)
  maxCadena?: number;             // max micros per trunk cable

  // ── String/hybrid inverter-specific ──
  mpptInputs?: number;            // number of MPPT trackers
  maxStringsPorMPPT?: number;     // max strings per MPPT
  maxPanelesString?: number;      // max panels per string
  voltajeDCMax?: number;          // max DC input voltage
  amperajeDCMax?: number;         // max DC input current per MPPT
  cableRulesDC?: CableRule[];     // DC cable rules
  requiereDesconectorDC?: boolean; // requires DC disconnect switch
  amperajeDesconectorDC?: number;  // DC disconnect rating

  // ── General ──
  requiereTierraFisica?: boolean;
  calibreTierra?: number;         // AWG for ground wire
  notas?: string;
};

/** Input for electrical calculation */
export type ElectricalInput = {
  equipmentProfileId: string;
  cantidadEquipos: number;            // total units (micros or inverters)
  distanciaMetros?: number;           // cable run distance (for voltage drop calc)
  cantidadPaneles?: number;           // total panels (for string inverter string config)
};

/** A single circuit with its breaker and cable */
export type CircuitResult = {
  circuitoNumero: number;
  unidadesEnCircuito: number;
  amperajeCircuito: number;          // raw amps in this circuit
  amperajeConTolerancia: number;     // amps × tolerance factor
  breakerSeleccionado: number;       // selected breaker size (A)
  calibreCableAWG: number;
  tipoCable: string;                 // e.g. "Uso rudo 3x12"
  warnings: string[];
};

/** String configuration (for string/hybrid inverters) */
export type StringConfig = {
  mpptNumero: number;
  stringsEnMPPT: number;
  panelesPorString: number;
  voltajeDCEstimado?: number;
  calibreCableDC?: number;
  warnings: string[];
};

/** Complete electrical calculation result */
export type ElectricalResult = {
  perfil: EquipmentProfile;
  cantidadEquipos: number;

  // ── Breaker summary ──
  totalCircuitos: number;
  circuitos: CircuitResult[];
  totalBreakers: number;
  breakerResumen: { amperaje: number; cantidad: number }[];

  // ── Cable summary ──
  cableACResumen: { tipo: string; calibreAWG: number; circuitos: number }[];
  metrosCableACEstimado?: number;

  // ── String config (only for string/hybrid inverters) ──
  stringConfig?: StringConfig[];
  desconectorDC?: { requerido: boolean; amperaje: number };

  // ── Grounding ──
  tierraFisica?: { requerida: boolean; calibreAWG: number };

  // ── General ──
  amperajeTotalAC: number;
  amperajeTotalConTolerancia: number;
  warnings: string[];
};
