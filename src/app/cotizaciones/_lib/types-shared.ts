import type { CotizacionData } from "../../lib/types";

export const ETAPAS = [
  "prospecto",
  "cotizado",
  "negociacion",
  "cerrado_ganado",
  "instalado",
  "cerrado_perdido",
] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_LABEL: Record<Etapa, string> = {
  prospecto: "Prospecto",
  cotizado: "Cotizado",
  negociacion: "Negociación",
  cerrado_ganado: "Ganado",
  cerrado_perdido: "Perdido",
  instalado: "Instalado",
};

export const ETAPA_COLOR: Record<Etapa, { bg: string; text: string; ring: string; dot: string }> = {
  prospecto:       { bg: "bg-zinc-500/10",    text: "text-zinc-300",    ring: "ring-zinc-500/30",    dot: "bg-zinc-400" },
  cotizado:        { bg: "bg-sky-500/10",     text: "text-sky-300",     ring: "ring-sky-500/30",     dot: "bg-sky-400" },
  negociacion:     { bg: "bg-amber-500/10",   text: "text-amber-300",   ring: "ring-amber-500/30",   dot: "bg-amber-400" },
  cerrado_ganado:  { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/30", dot: "bg-emerald-400" },
  instalado:       { bg: "bg-violet-500/10",  text: "text-violet-300",  ring: "ring-violet-500/30",  dot: "bg-violet-400" },
  cerrado_perdido: { bg: "bg-red-500/10",     text: "text-red-300",     ring: "ring-red-500/30",     dot: "bg-red-400" },
};

export const ORIGENES = [
  "referido",
  "facebook",
  "instagram",
  "google",
  "tiktok",
  "sitio_web",
  "volanteo",
  "feria",
  "otro",
] as const;
export type Origen = (typeof ORIGENES)[number];

export const ORIGEN_LABEL: Record<Origen, string> = {
  referido: "Referido",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  tiktok: "TikTok",
  sitio_web: "Sitio web",
  volanteo: "Volanteo",
  feria: "Feria",
  otro: "Otro",
};

export type SortKey =
  | "actualizadoEn"
  | "creadoEn"
  | "nombre"
  | "totalCliente"
  | "probabilidadCierre"
  | "etapa"
  | "origen"
  | "tags";

export type SortDir = "asc" | "desc";

export type ViewMode = "tabla" | "tablero";

export interface CotizacionRow {
  nombre: string;
  cotizacionId?: string;
  fecha: string;
  actualizadoEn?: string;
  creadoEn?: string;
  etapa: Etapa;
  origen?: Origen;
  origenDetalle?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  clienteUbicacion?: string;
  clienteNotas?: string;
  probabilidadCierre?: number;
  fechaCierre?: string;
  fechaInstalacion?: string;
  tags?: string[];
  archived: boolean;
  archivadoEn?: string;
  cantidadPaneles: number;
  potenciaW: number;
  kWp: number;
  totalMXN: number | null;
  totalClienteMXN: number | null;
  utilidadNetaMXN: number | null;
  utilidadNetaPct: number | null;
  diasSinMovimiento: number | null;
  valorPonderadoMXN: number;
  hasReciboCFE: boolean;
  raw: CotizacionData;
}

export interface UIState {
  search: string;
  etapas: Etapa[];
  origenes: Origen[];
  soloConCFE: boolean;
  rangoDias: 0 | 7 | 30 | 90; // 0 = todo
  sortKey: SortKey;
  sortDir: SortDir;
  view: ViewMode;
  mostrarArchivadas: boolean;
}

export const DEFAULT_UI: UIState = {
  search: "",
  etapas: [],
  origenes: [],
  soloConCFE: false,
  rangoDias: 0,
  sortKey: "actualizadoEn",
  sortDir: "desc",
  view: "tabla",
  mostrarArchivadas: false,
};
