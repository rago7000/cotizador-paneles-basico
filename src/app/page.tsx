"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import AppNav from "./components/AppNav";
import {
  guardarCotizacion,
  cargarCotizacion,
  listarCotizaciones,
  eliminarCotizacion,
  listarCatalogoPaneles,
  guardarCatalogoPanel,
  listarCatalogoMicros,
  guardarCatalogoMicro,
  guardarSeguimiento,
  cargarSeguimiento,
  listarCotizacionesCliente,
  guardarCotizacionCliente,
  eliminarCotizacionCliente,
  listarProductosPaneles,
  listarProductosMicros,
  listarOfertas,
  mejorOferta,
} from "./lib/storage";
import type {
  CotizacionData,
  CotizacionGuardada,
  LineItem,
  TipoCambioData,
  CatalogoPanel,
  CatalogoMicro,
  SeguimientoData,
  UtilidadConfig,
  CotizacionCliente,
} from "./lib/types";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const PDFViewerWrapper = dynamic(
  () => import("./components/PDFViewerWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        Cargando visor PDF…
      </div>
    ),
  }
);

const PDFViewerClienteWrapper = dynamic(
  () => import("./components/PDFViewerClienteWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        Cargando visor PDF…
      </div>
    ),
  }
);

type AluminioItem = LineItem;
type GeneralItem = LineItem;

const aluminioDefault: AluminioItem[] = [
  { nombre: "Angulo - 1 1/2 X 1 1/2 X 0.1875\" (3/16)", cantidad: "3", precioUnitario: "700.94", unidad: "Pza" },
  { nombre: "Unicanal - PARA PANEL SOLAR GRANDE", cantidad: "3", precioUnitario: "839.34", unidad: "Pza" },
  { nombre: "Clip - PARA PANEL SOLAR", cantidad: "27", precioUnitario: "41.58", unidad: "Pza" },
];

const tornilleriaDefault: LineItem[] = [
  { nombre: "Tornillo acero inox (largo: ..)", cantidad: "40", precioUnitario: "3.00", unidad: "Pza" },
  { nombre: "Tuerca de presion - Acero inox.", cantidad: "40", precioUnitario: "2.00", unidad: "Pza" },
  { nombre: "Guasa de presion - Acero inox.", cantidad: "40", precioUnitario: "1.00", unidad: "Pza" },
  { nombre: "Guasa grande (microinversores)", cantidad: "1", precioUnitario: "80.95", unidad: "Lote" },
  { nombre: "Pijas con taquete", cantidad: "1", precioUnitario: "61.64", unidad: "Lote" },
];

const generalesDefault: GeneralItem[] = [
  { nombre: "Centro de carga (p/1 pastilla doble)", cantidad: "1", precioUnitario: "229.00", unidad: "Pza" },
  { nombre: "Pastilla 2 polos (15 amp)", cantidad: "1", precioUnitario: "589.00", unidad: "Pza" },
  { nombre: "Cemento plastico", cantidad: "1", precioUnitario: "79.80", unidad: "Lote" },
  { nombre: "Cable de uso rudo", cantidad: "20", precioUnitario: "37.97", unidad: "mL" },
  { nombre: "Instalacion - Precio base", cantidad: "1", precioUnitario: "3000.00", unidad: "Lote" },
  { nombre: "Instalacion - Paneles adicionales", cantidad: "0", precioUnitario: "150.00", unidad: "Pza" },
  { nombre: "Instalacion - Vueltas gasolina", cantidad: "1", precioUnitario: "2500.00", unidad: "Pza" },
];

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtUSD = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtUSD3 = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  num,
  title,
  badge,
  children,
}: {
  num: string;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold">
          {num}
        </span>
        <h2 className="font-semibold text-zinc-100 text-base">{title}</h2>
        {badge && (
          <span className="ml-auto text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15";

function NumInput({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: number;
}) {
  return (
    <input
      type="number"
      min={0}
      step={step ?? 1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`h-5 w-9 rounded-full transition-colors ${checked ? "bg-amber-400" : "bg-zinc-700"}`}
        />
        <div
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </div>
      <div>
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function LineItemTable({
  items,
  onChange,
  currency,
}: {
  items: LineItem[];
  onChange: (i: number, field: keyof LineItem, val: string) => void;
  currency: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      {/* header */}
      <div className="grid grid-cols-[1fr_72px_100px_88px] gap-2 px-3 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
        <span>Concepto</span>
        <span className="text-center">Cant.</span>
        <span className="text-right">Precio unit.</span>
        <span className="text-right">Subtotal</span>
      </div>
      {items.map((item, i) => {
        const sub = (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0);
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_72px_100px_88px] gap-2 px-3 py-2.5 border-t border-zinc-800/60 items-center hover:bg-zinc-800/30 transition-colors"
          >
            <div>
              <p className="text-xs text-zinc-300 leading-tight">{item.nombre}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{item.unidad}</p>
            </div>
            <input
              type="number"
              min={0}
              value={item.cantidad}
              onChange={(e) => onChange(i, "cantidad", e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-center text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={item.precioUnitario}
              onChange={(e) => onChange(i, "precioUnitario", e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            />
            <p className="text-xs text-right font-mono text-zinc-200">
              ${fmt(sub)}
            </p>
          </div>
        );
      })}
      <div className="flex justify-between items-center px-3 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
        <span className="text-xs text-zinc-500">Total</span>
        <span className="text-sm font-semibold text-zinc-100 font-mono">
          ${fmt(items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0))}{" "}
          <span className="text-zinc-500 font-normal">{currency}</span>
        </span>
      </div>
    </div>
  );
}

function PartidaRow({ label, value }: { label: string; value: number }) {
  const conIva = value * 1.16;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0">
      <span className="text-xs font-medium text-zinc-400 tracking-wide uppercase">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-zinc-100 font-mono">${fmt(conIva)}</span>
        <p className="text-[10px] text-zinc-600 font-mono">${fmt(value)} + IVA</p>
      </div>
    </div>
  );
}

function TcCustomRow({
  tcGlobal,
  value,
  onChange,
}: {
  tcGlobal: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const isCustom = Number(value) > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/30">
      <button
        onClick={() => onChange(isCustom ? "" : String(tcGlobal || ""))}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 ${
          isCustom ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors ${
          isCustom ? "border-amber-400 bg-amber-400" : "border-zinc-600"
        }`}>
          {isCustom && (
            <svg className="w-2.5 h-2.5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        TC personalizado
      </button>

      {isCustom ? (
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs text-zinc-500">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-28 rounded border border-amber-400/50 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 font-mono outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            autoFocus
          />
          <span className="text-xs text-zinc-500">MXN/USD</span>
          {tcGlobal > 0 && (
            <span className="text-xs text-zinc-600 ml-1">
              (DOF: ${tcGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })})
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-zinc-600">
          Usando DOF{tcGlobal > 0 ? `: $${tcGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "…"}
        </span>
      )}
    </div>
  );
}

function SaveToCatalogBanner({
  label,
  onSave,
  onDismiss,
}: {
  label: string;
  onSave: (marca: string, modelo: string) => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 bg-zinc-800/30">
        <span className="text-xs text-zinc-400">{label}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Sí, guardar
          </button>
          <button onClick={onDismiss} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            No
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-400/30 bg-zinc-800/40 p-3 space-y-2.5">
      <p className="text-xs font-medium text-zinc-300">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400"
          placeholder="Marca"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400"
          placeholder="Modelo"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { if (marca.trim() && modelo.trim()) onSave(marca.trim(), modelo.trim()); }}
          disabled={!marca.trim() || !modelo.trim()}
          className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Guardar en catálogo
        </button>
        <button onClick={onDismiss} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-2">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── CFE Recibo type ──────────────────────────────────────────────────────────

interface ReciboCFEData {
  nombre: string;
  direccion: string;
  noServicio: string;
  tarifa: string;
  periodoInicio: string;
  periodoFin: string;
  diasPeriodo: number;
  consumoKwh: number;
  consumoMensualPromedio: number;
  totalFacturado: number;
  historico: { periodo: string; kwh: number; importe: number }[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [cantidad, setCantidad] = useState("");
  const [potencia, setPotencia] = useState("");
  const [precioPorWatt, setPrecioPorWatt] = useState("");
  const [fletePaneles, setFletePaneles] = useState("100");
  const [garantiaPaneles, setGarantiaPaneles] = useState("20");
  const [precioMicroinversor, setPrecioMicroinversor] = useState("");
  const [precioCable, setPrecioCable] = useState("");
  const [precioECU, setPrecioECU] = useState("145");
  const [incluyeECU, setIncluyeECU] = useState(true);
  const [precioHerramienta, setPrecioHerramienta] = useState("");
  const [incluyeHerramienta, setIncluyeHerramienta] = useState(false);
  const [fleteMicros, setFleteMicros] = useState("35");
  const [aluminio, setAluminio] = useState<AluminioItem[]>(aluminioDefault);
  const [fleteAluminio, setFleteAluminio] = useState("500");
  const [tornilleria, setTornilleria] = useState<LineItem[]>(tornilleriaDefault);
  const [generales, setGenerales] = useState<GeneralItem[]>(generalesDefault);
  const [tc, setTc] = useState<TipoCambioData | null>(null);
  const [tcError, setTcError] = useState("");

  const [nombreCotizacion, setNombreCotizacion] = useState("");
  const [cotizacionesGuardadas, setCotizacionesGuardadas] = useState<CotizacionGuardada[]>([]);
  const [mostrarGuardadas, setMostrarGuardadas] = useState(false);
  const [mostrarPDF, setMostrarPDF] = useState(false);
  const [msgGuardado, setMsgGuardado] = useState<"ok" | "err" | "">("");

  // TC congelado / manual
  const [tcFrozen, setTcFrozen] = useState(false);     // congelado (no editable)
  const [tcManual, setTcManual] = useState(false);      // modo manual (editable)
  const [tcSnapshotLocal, setTcSnapshotLocal] = useState(""); // valor guardado
  const [tcUsarManana, setTcUsarManana] = useState(false); // toggle hoy/mañana

  // Tipos de cambio personalizados por sección
  const [tcCustomPaneles, setTcCustomPaneles] = useState("");
  const [tcCustomMicros, setTcCustomMicros] = useState("");

  // Catálogo
  const [catalogoPaneles, setCatalogoPaneles] = useState<CatalogoPanel[]>([]);
  const [catalogoMicros, setCatalogoMicros] = useState<CatalogoMicro[]>([]);
  const [pickerPanel, setPickerPanel] = useState(false);
  const [pickerMicro, setPickerMicro] = useState(false);
  // "¿Guardar en catálogo?" tras llenar campos manualmente
  const [sugerirGuardarPanel, setSugerirGuardarPanel] = useState(false);
  const [sugerirGuardarMicro, setSugerirGuardarMicro] = useState(false);
  const [panelSeleccionado, setPanelSeleccionado] = useState<CatalogoPanel | null>(null);
  const [microSeleccionado, setMicroSeleccionado] = useState<CatalogoMicro | null>(null);

  // Recibo CFE
  const [reciboCFE, setReciboCFE] = useState<ReciboCFEData | null>(null);
  const [loadingRecibo, setLoadingRecibo] = useState(false);
  const [errorRecibo, setErrorRecibo] = useState("");
  const [reciboDetalle, setReciboDetalle] = useState(false);
  const [reciboPDFBase64, setReciboPDFBase64] = useState<string | null>(null);
  const [reciboUltimoAnio, setReciboUltimoAnio] = useState(true); // true = último año (6 bim), false = todo
  const reciboInputRef = useRef<HTMLInputElement>(null);

  // Minisplits — incremento de consumo
  interface Minisplit { id: string; cantidad: number; toneladas: string; horasDia: number; tipo: "inverter" | "convencional" }
  const [minisplits, setMinisplits] = useState<Minisplit[]>([]);
  const [minisplitTemporada, setMinisplitTemporada] = useState<"anual" | "temporada">("temporada"); // temporada = 6 meses
  const addMinisplit = () => setMinisplits((prev) => [...prev, { id: uid(), cantidad: 1, toneladas: "1", horasDia: 8, tipo: "inverter" }]);
  const removeMinisplit = (id: string) => setMinisplits((prev) => prev.filter((m) => m.id !== id));
  const updateMinisplit = (id: string, field: keyof Minisplit, value: string | number) =>
    setMinisplits((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));

  // Utilidad / Precio al cliente
  const utilidadDefault: UtilidadConfig = { tipo: "global", globalPct: 25, panelesPct: 25, inversoresPct: 25, estructuraPct: 25, tornilleriaPct: 25, generalesPct: 25, montoFijo: 0 };
  const [mostrarPrecioCliente, setMostrarPrecioCliente] = useState(false);
  const [utilidad, setUtilidad] = useState<UtilidadConfig>(utilidadDefault);
  const [variantes, setVariantes] = useState<CotizacionCliente[]>([]);
  const [nombreVariante, setNombreVariante] = useState("");
  const [mostrarVariantes, setMostrarVariantes] = useState(false);
  const [mostrarPDFCliente, setMostrarPDFCliente] = useState(false);
  const [mostrarComparador, setMostrarComparador] = useState(false);

  // ── Numeric derivations ──────────────────────────────────────────────────
  const cantidadNum = Number(cantidad) || 0;
  const potenciaNum = Number(potencia) || 0;
  const precioNum = Number(precioPorWatt) || 0;
  const fletePanelesNum = Number(fletePaneles) || 0;
  const garantiaPanelesNum = Number(garantiaPaneles) || 0;
  const precioMicroNum = Number(precioMicroinversor) || 0;
  const precioCableNum = Number(precioCable) || 0;
  const precioECUNum = Number(precioECU) || 0;
  const precioHerramientaNum = Number(precioHerramienta) || 0;
  const fleteMicrosNum = Number(fleteMicros) || 0;

  const costoPanel = potenciaNum * precioNum;
  const costoPanelesUSD = costoPanel * cantidadNum;

  const panelesPorMicro = microSeleccionado?.panelesPorUnidad ?? 4;
  const cantidadMicros = cantidadNum > 0 ? Math.ceil(cantidadNum / panelesPorMicro) : 0;
  const costoMicrosUSD = cantidadMicros * precioMicroNum;
  const costoCablesUSD = cantidadMicros * precioCableNum;
  const costoECUUSD = incluyeECU ? precioECUNum : 0;
  const costoHerramientaUSD = incluyeHerramienta ? precioHerramientaNum : 0;

  const costoAluminioMXN = aluminio.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0),
    0
  );
  const fleteAluminioNum = Number(fleteAluminio) || 0;
  const fleteAluminioSinIVA = fleteAluminioNum / 1.16;

  const costoTornilleriaMXN = tornilleria.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0),
    0
  );
  const costoGeneralesMXN = generales.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0),
    0
  );

  const tcLive = (tcUsarManana && tc?.tipoCambioAlt) ? tc.tipoCambioAlt : (tc?.tipoCambio || 0);
  const tcVal = ((tcFrozen || tcManual) && Number(tcSnapshotLocal) > 0) ? Number(tcSnapshotLocal) : tcLive;
  const tcPaneles = Number(tcCustomPaneles) > 0 ? Number(tcCustomPaneles) : tcVal;
  const tcMicros  = Number(tcCustomMicros)  > 0 ? Number(tcCustomMicros)  : tcVal;

  const totalPanelesUSD = costoPanelesUSD + fletePanelesNum + garantiaPanelesNum;
  const partidaPanelesMXN = totalPanelesUSD * tcPaneles;

  const totalInversoresUSD =
    costoMicrosUSD + costoCablesUSD + costoECUUSD + costoHerramientaUSD + fleteMicrosNum;
  const partidaInversoresMXN = totalInversoresUSD * tcMicros;

  const partidaEstructuraMXN = costoAluminioMXN + fleteAluminioSinIVA;
  const partidaTornilleriaMXN = costoTornilleriaMXN;
  const partidaGeneralesMXN = costoGeneralesMXN;

  const subtotalMXN =
    partidaPanelesMXN +
    partidaInversoresMXN +
    partidaEstructuraMXN +
    partidaTornilleriaMXN +
    partidaGeneralesMXN;
  const ivaMXN = subtotalMXN * 0.16;
  const totalMXN = subtotalMXN + ivaMXN;
  const costoPorPanel = cantidadNum > 0 ? totalMXN / cantidadNum : 0;

  // ── Precio al cliente ───────────────────────────────────────────────────
  const pctPaneles = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.panelesPct;
  const pctInversores = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.inversoresPct;
  const pctEstructura = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.estructuraPct;
  const pctTornilleria = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.tornilleriaPct;
  const pctGenerales = utilidad.tipo === "global" ? utilidad.globalPct : utilidad.generalesPct;

  const clientePanelesMXN = partidaPanelesMXN * (1 + pctPaneles / 100);
  const clienteInversoresMXN = partidaInversoresMXN * (1 + pctInversores / 100);
  const clienteEstructuraMXN = partidaEstructuraMXN * (1 + pctEstructura / 100);
  const clienteTornilleriaMXN = partidaTornilleriaMXN * (1 + pctTornilleria / 100);
  const clienteGeneralesMXN = partidaGeneralesMXN * (1 + pctGenerales / 100);
  const clienteSubtotalMXN = clientePanelesMXN + clienteInversoresMXN + clienteEstructuraMXN + clienteTornilleriaMXN + clienteGeneralesMXN + utilidad.montoFijo;
  const clienteIvaMXN = clienteSubtotalMXN * 0.16;
  const clienteTotalMXN = clienteSubtotalMXN + clienteIvaMXN;
  const utilidadNetaMXN = clienteSubtotalMXN - subtotalMXN;
  const utilidadNetaPct = subtotalMXN > 0 ? (utilidadNetaMXN / subtotalMXN) * 100 : 0;
  const clientePorPanel = cantidadNum > 0 ? clienteTotalMXN / cantidadNum : 0;
  const clientePorWatt = cantidadNum > 0 && potenciaNum > 0 ? clienteTotalMXN / (cantidadNum * potenciaNum) : 0;

  // ── ROI del cliente ─────────────────────────────────────────────────────
  const kWpSistema = cantidadNum * potenciaNum / 1000;
  const generacionMensualKwh = kWpSistema * 132; // 132 kWh/kWp/mes (HSP 5.5, eff 0.8)
  const costoCFEporKwh = reciboCFE && reciboCFE.consumoKwh > 0
    ? reciboCFE.totalFacturado / reciboCFE.consumoKwh
    : 0;
  const ahorroMensualMXN = generacionMensualKwh * costoCFEporKwh;
  const ahorroAnualMXN = ahorroMensualMXN * 12;
  const roiMeses = ahorroMensualMXN > 0 ? clienteTotalMXN / ahorroMensualMXN : 0;
  const roiAnios = roiMeses / 12;

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((d) => (d.error ? setTcError(d.error) : setTc(d)))
      .catch(() => setTcError("No se pudo obtener el tipo de cambio"));
  }, []);

  useEffect(() => {
    setCotizacionesGuardadas(listarCotizaciones());

    // Merge legacy catalog + v2 products+offers into a unified list
    const legacyPaneles = listarCatalogoPaneles();
    const v2Paneles = listarProductosPaneles();
    const allOfertas = listarOfertas();
    const v2AsCatalogo: CatalogoPanel[] = v2Paneles
      .map((p) => {
        const best = mejorOferta(p.id, allOfertas);
        if (!best) return null;
        const ofertasProducto = allOfertas.filter((o) => o.productoId === p.id);
        return {
          id: `v2_${p.id}`,
          marca: p.marca,
          modelo: p.modelo,
          potencia: p.potencia,
          precioPorWatt: best.precio,
          notas: best.notas || "",
          fechaActualizacion: best.fecha,
          totalOfertas: ofertasProducto.length,
        } as CatalogoPanel;
      })
      .filter((x): x is CatalogoPanel => x !== null);
    // Deduplicate: if a v2 product matches a legacy one (same marca+modelo), prefer v2 (fresher prices)
    const legacyIds = new Set(
      v2AsCatalogo.map((v) => `${v.marca.toLowerCase()}:${v.modelo.toLowerCase()}`)
    );
    const filteredLegacy = legacyPaneles.filter(
      (p) => !legacyIds.has(`${p.marca.toLowerCase()}:${p.modelo.toLowerCase()}`)
    );
    setCatalogoPaneles([...v2AsCatalogo, ...filteredLegacy]);

    // Same for micros
    const legacyMicros = listarCatalogoMicros();
    const v2Micros = listarProductosMicros();
    const v2MicrosAsCatalogo: CatalogoMicro[] = v2Micros
      .map((m) => {
        const best = mejorOferta(m.id, allOfertas);
        if (!best) return null;
        const ofertasProducto = allOfertas.filter((o) => o.productoId === m.id);
        return {
          id: `v2_${m.id}`,
          marca: m.marca,
          modelo: m.modelo,
          precio: best.precio,
          precioCable: best.precioCable || 0,
          panelesPorUnidad: m.panelesPorUnidad,
          notas: best.notas || "",
          fechaActualizacion: best.fecha,
          totalOfertas: ofertasProducto.length,
        } as CatalogoMicro;
      })
      .filter((x): x is CatalogoMicro => x !== null);
    const legacyMicroIds = new Set(
      v2MicrosAsCatalogo.map((v) => `${v.marca.toLowerCase()}:${v.modelo.toLowerCase()}`)
    );
    const filteredLegacyMicros = legacyMicros.filter(
      (m) => !legacyMicroIds.has(`${m.marca.toLowerCase()}:${m.modelo.toLowerCase()}`)
    );
    const allMicros = [...v2MicrosAsCatalogo, ...filteredLegacyMicros];
    setCatalogoMicros(allMicros);

    // Auto-select DS3D if available and no micro selected yet
    if (!precioMicroinversor) {
      const ds3d = allMicros.find((m) => /ds3d|ds3-d/i.test(m.modelo));
      if (ds3d) {
        setPrecioMicroinversor(String(ds3d.precio));
        setPrecioCable(String(ds3d.precioCable));
        setMicroSeleccionado(ds3d);
      }
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getFormData = (): CotizacionData => ({
    nombre: nombreCotizacion,
    fecha: new Date().toISOString(),
    tcCustomPaneles, tcCustomMicros,
    tcSnapshot: (tcFrozen || tcManual) ? tcSnapshotLocal : String(tcLive),
    tcFrozen: tcFrozen || tcManual,
    cantidad, potencia, precioPorWatt, fletePaneles, garantiaPaneles,
    precioMicroinversor, precioCable, precioECU, incluyeECU,
    precioHerramienta, incluyeHerramienta, fleteMicros,
    aluminio, fleteAluminio, tornilleria, generales,
    reciboCFE,
    reciboPDFBase64,
    minisplits: minisplits.length > 0 ? minisplits : undefined,
    minisplitTemporada: minisplits.length > 0 ? minisplitTemporada : undefined,
    utilidad: mostrarPrecioCliente ? utilidad : undefined,
  });

  const handleGuardar = () => {
    if (!nombreCotizacion.trim()) { setMsgGuardado("err"); setTimeout(() => setMsgGuardado(""), 2500); return; }
    guardarCotizacion(getFormData());
    setCotizacionesGuardadas(listarCotizaciones());
    setVariantes(listarCotizacionesCliente(nombreCotizacion.trim()));
    setMsgGuardado("ok");
    setTimeout(() => setMsgGuardado(""), 2500);
  };

  const handleCargar = (nombre: string) => {
    const data = cargarCotizacion(nombre);
    if (!data) return;
    setNombreCotizacion(data.nombre);
    setTcCustomPaneles(data.tcCustomPaneles ?? "");
    setTcCustomMicros(data.tcCustomMicros ?? "");
    setTcFrozen(data.tcFrozen ?? false);
    setTcSnapshotLocal(data.tcSnapshot ?? "");
    setCantidad(data.cantidad);
    setPotencia(data.potencia);
    setPrecioPorWatt(data.precioPorWatt);
    setFletePaneles(data.fletePaneles);
    setGarantiaPaneles(data.garantiaPaneles);
    setPrecioMicroinversor(data.precioMicroinversor);
    setPrecioCable(data.precioCable);
    setPrecioECU(data.precioECU);
    setIncluyeECU(data.incluyeECU);
    setPrecioHerramienta(data.precioHerramienta);
    setIncluyeHerramienta(data.incluyeHerramienta);
    setFleteMicros(data.fleteMicros);
    setAluminio(data.aluminio);
    setFleteAluminio(data.fleteAluminio);
    setTornilleria(data.tornilleria);
    setGenerales(data.generales);
    setReciboCFE(data.reciboCFE ?? null);
    setReciboPDFBase64(data.reciboPDFBase64 ?? null);
    setMinisplits(data.minisplits ?? []);
    setMinisplitTemporada(data.minisplitTemporada ?? "temporada");
    if (data.utilidad) {
      setUtilidad(data.utilidad);
      setMostrarPrecioCliente(true);
    } else {
      setMostrarPrecioCliente(false);
    }
    setVariantes(listarCotizacionesCliente(data.nombre));
    setReciboDetalle(false);
    setMostrarGuardadas(false);
  };

  const handleGuardarVariante = () => {
    if (!nombreCotizacion.trim() || !nombreVariante.trim() || subtotalMXN <= 0) return;
    const c: CotizacionCliente = {
      id: uid(),
      cotizacionBase: nombreCotizacion,
      nombre: nombreVariante,
      fecha: new Date().toISOString(),
      utilidad: { ...utilidad },
      costos: {
        paneles: partidaPanelesMXN,
        inversores: partidaInversoresMXN,
        estructura: partidaEstructuraMXN,
        tornilleria: partidaTornilleriaMXN,
        generales: partidaGeneralesMXN,
        subtotal: subtotalMXN,
        iva: ivaMXN,
        total: totalMXN,
        cantidadPaneles: cantidadNum,
        potenciaW: potenciaNum,
      },
      precios: {
        paneles: clientePanelesMXN,
        inversores: clienteInversoresMXN,
        estructura: clienteEstructuraMXN,
        tornilleria: clienteTornilleriaMXN,
        generales: clienteGeneralesMXN,
        montoFijo: utilidad.montoFijo,
        subtotal: clienteSubtotalMXN,
        iva: clienteIvaMXN,
        total: clienteTotalMXN,
        porPanel: clientePorPanel,
        porWatt: clientePorWatt,
        utilidadNeta: utilidadNetaMXN,
        utilidadPct: utilidadNetaPct,
      },
      notas: "",
      vigenciaDias: 15,
    };
    guardarCotizacionCliente(c);
    setVariantes(listarCotizacionesCliente(nombreCotizacion));
    setNombreVariante("");
    setMostrarVariantes(true);
  };

  const handleEliminarVariante = (id: string) => {
    eliminarCotizacionCliente(id);
    setVariantes(listarCotizacionesCliente(nombreCotizacion));
  };

  const handleCargarVariante = (v: CotizacionCliente) => {
    setUtilidad(v.utilidad);
    setMostrarPrecioCliente(true);
  };

  const handleEliminar = (nombre: string) => {
    eliminarCotizacion(nombre);
    setCotizacionesGuardadas(listarCotizaciones());
  };

  const updateAluminio = (i: number, f: keyof AluminioItem, v: string) =>
    setAluminio((prev) => prev.map((it, idx) => (idx === i ? { ...it, [f]: v } : it)));
  const updateTornilleria = (i: number, f: keyof LineItem, v: string) =>
    setTornilleria((prev) => prev.map((it, idx) => (idx === i ? { ...it, [f]: v } : it)));
  const updateGeneral = (i: number, f: keyof GeneralItem, v: string) =>
    setGenerales((prev) => prev.map((it, idx) => (idx === i ? { ...it, [f]: v } : it)));

  // Catálogo — seleccionar
  const seleccionarPanel = (p: CatalogoPanel) => {
    setPotencia(String(p.potencia));
    setPrecioPorWatt(String(p.precioPorWatt));
    setPanelSeleccionado(p);
    setPickerPanel(false);
    setSugerirGuardarPanel(false);
  };
  const seleccionarMicro = (m: CatalogoMicro) => {
    setPrecioMicroinversor(String(m.precio));
    setPrecioCable(String(m.precioCable));
    setMicroSeleccionado(m);
    setPickerMicro(false);
    setSugerirGuardarMicro(false);
  };

  // Catálogo — guardar desde cotizador
  const guardarPanelEnCatalogo = (marca: string, modelo: string) => {
    const p: CatalogoPanel = {
      id: uid(),
      marca, modelo,
      potencia: potenciaNum,
      precioPorWatt: precioNum,
      notas: "",
      fechaActualizacion: new Date().toLocaleString("es-MX"),
    };
    guardarCatalogoPanel(p);
    setCatalogoPaneles(listarCatalogoPaneles());
    setSugerirGuardarPanel(false);
  };
  const guardarMicroEnCatalogo = (marca: string, modelo: string) => {
    const m: CatalogoMicro = {
      id: uid(),
      marca, modelo,
      precio: precioMicroNum,
      precioCable: precioCableNum,
      panelesPorUnidad: 4,
      notas: "",
      fechaActualizacion: new Date().toLocaleString("es-MX"),
    };
    guardarCatalogoMicro(m);
    setCatalogoMicros(listarCatalogoMicros());
    setSugerirGuardarMicro(false);
  };

  // ── CFE handler ───────────────────────────────────────────────────────────
  const handleReciboCFE = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingRecibo(true);
    setErrorRecibo("");
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await fetch("/api/leer-recibo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReciboCFE(data);
      // Save PDF as base64 for later viewing
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip "data:application/pdf;base64," prefix
        setReciboPDFBase64(result);
      };
      reader.readAsDataURL(file);
      // Auto-fill quote name if empty
      if (data.nombre && !nombreCotizacion.trim()) {
        setNombreCotizacion(data.nombre);
      }
    } catch (err: unknown) {
      setErrorRecibo(err instanceof Error ? err.message : "Error al procesar el recibo");
    } finally {
      setLoadingRecibo(false);
      if (reciboInputRef.current) reciboInputRef.current.value = "";
    }
  };

  // CFE-derived sizing suggestion (northern Mexico ~5.5 peak sun hours)
  const consumoMensualCFE = reciboCFE
    ? reciboCFE.consumoMensualPromedio > 0
      ? reciboCFE.consumoMensualPromedio
      : Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1))
    : 0;
  const GEN_POR_KWP = 5.5 * 30 * 0.8; // 132 kWh/mes por kWp
  const panelW = Number(potencia) || 545;

  // Histórico filtrado según toggle (último año = 6 bimestres, o todo)
  const historicoFiltrado = reciboCFE
    ? reciboUltimoAnio
      ? reciboCFE.historico.slice(0, 6)
      : reciboCFE.historico
    : [];
  const periodosUsados = historicoFiltrado.length;

  // Consumo mensual promedio (recalculado con el rango seleccionado)
  const consumoMensualCalc = reciboCFE
    ? historicoFiltrado.length > 0
      ? Math.round(historicoFiltrado.reduce((s, h) => s + h.kwh, 0) / historicoFiltrado.length / 2)
      : Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1))
    : 0;

  // Propuesta 1: Promedio histórico
  const kWpPromedio = consumoMensualCalc / GEN_POR_KWP;
  const panelesPromedio = reciboCFE ? Math.ceil((kWpPromedio * 1000) / panelW) : 0;

  // Propuesta 2: Período más alto (referencia)
  const maxHistKwh = reciboCFE
    ? Math.max(reciboCFE.consumoKwh, ...historicoFiltrado.map((h) => h.kwh))
    : 0;
  const consumoMensualMax = Math.round(maxHistKwh / 2); // bimestral → mensual
  const kWpMax = consumoMensualMax / GEN_POR_KWP;
  const panelesMax = reciboCFE ? Math.ceil((kWpMax * 1000) / panelW) : 0;

  // Propuesta 3: Equilibrada — percentil ~75 para no depender del acumulado
  const todosKwh = reciboCFE
    ? [reciboCFE.consumoKwh, ...historicoFiltrado.map((h) => h.kwh)].sort((a, b) => a - b)
    : [];
  const p75Index = Math.floor(todosKwh.length * 0.75);
  const consumoP75 = todosKwh.length > 0 ? Math.round(todosKwh[p75Index] / 2) : 0;
  const kWpEquilibrado = consumoP75 / GEN_POR_KWP;
  const panelesEquilibrado = reciboCFE ? Math.ceil((kWpEquilibrado * 1000) / panelW) : 0;

  // Propuesta 4: Con incremento de minisplits
  const WATTS_POR_TON = { inverter: 900, convencional: 1400 };
  const minisplitKwhMes = minisplits.reduce((sum, m) => {
    const watts = m.cantidad * Number(m.toneladas) * WATTS_POR_TON[m.tipo];
    return sum + (watts * m.horasDia * 30) / 1000;
  }, 0);
  // Si es temporada (6 meses), prorrateamos: el consumo solo ocurre 6 de 12 meses → promedio anual = kwhMes * 6/12
  const minisplitKwhMesProm = minisplitTemporada === "temporada" ? Math.round(minisplitKwhMes / 2) : Math.round(minisplitKwhMes);
  const consumoConIncremento = consumoMensualCalc + minisplitKwhMesProm;
  const kWpConIncremento = consumoConIncremento / GEN_POR_KWP;
  const panelesConIncremento = reciboCFE ? Math.ceil((kWpConIncremento * 1000) / panelW) : 0;

  // Backward compat aliases
  const kWpSugerido = kWpPromedio;
  const panelesSugeridosCFE = panelesPromedio;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">☀️</span>
            <span className="hidden sm:block text-sm font-semibold text-zinc-100 tracking-tight">
              Cotizador Solar
            </span>
          </div>

          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
          <AppNav />
          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

          {/* Cotizacion name */}
          <input
            type="text"
            value={nombreCotizacion}
            onChange={(e) => setNombreCotizacion(e.target.value)}
            placeholder="Nombre de la cotización…"
            className="flex-1 min-w-0 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
          />

          {/* Save feedback */}
          {msgGuardado === "ok" && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-400 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Guardado
            </span>
          )}
          {msgGuardado === "err" && (
            <span className="hidden sm:block text-xs text-red-400 shrink-0">Pon un nombre</span>
          )}

          {/* Buttons */}
          <button
            onClick={handleGuardar}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="hidden sm:inline">Guardar</span>
          </button>

          <button
            onClick={() => setMostrarGuardadas(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span className="hidden sm:inline">Mis cotizaciones</span>
            {cotizacionesGuardadas.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-300">
                {cotizacionesGuardadas.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── LEFT: Form sections ──────────────────────────────────────── */}
          <div className="space-y-4 min-w-0">

            {/* ── CFE Recibo banner ────────────────────────────────────────── */}
            <input
              ref={reciboInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleReciboCFE}
            />

            {reciboCFE ? (
              /* Loaded state */
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
                {/* Header — clickable to toggle detail */}
                <button
                  onClick={() => setReciboDetalle(!reciboDetalle)}
                  className="w-full flex items-center justify-between px-5 py-3 border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">⚡</span>
                    <span className="text-sm font-semibold text-zinc-100">Recibo CFE</span>
                    <span className="text-xs text-zinc-500 truncate max-w-48">{reciboCFE.nombre}</span>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                      Tarifa {reciboCFE.tarifa}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{reciboDetalle ? "Ocultar" : "Ver detalle"}</span>
                    <svg
                      className={`w-4 h-4 text-zinc-500 transition-transform ${reciboDetalle ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <button
                      onClick={(e) => { e.stopPropagation(); setReciboCFE(null); setReciboDetalle(false); }}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs px-1 ml-1"
                      title="Cerrar"
                    >
                      ✕
                    </button>
                  </div>
                </button>

                {/* Summary metrics */}
                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <div>
                    <div className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Consumo período</div>
                    <div className="text-xl font-bold text-zinc-100">{reciboCFE.consumoKwh} <span className="text-sm font-normal text-zinc-400">kWh</span></div>
                    <div className="text-xs text-zinc-600 mt-0.5">{reciboCFE.diasPeriodo} días · {reciboCFE.periodoInicio} – {reciboCFE.periodoFin}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Promedio mensual</div>
                    <div className="text-xl font-bold text-zinc-100">{Math.round(consumoMensualCFE)} <span className="text-sm font-normal text-zinc-400">kWh/mes</span></div>
                    <div className="text-xs text-zinc-600 mt-0.5">{reciboCFE.historico.length} períodos de historial</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Sistema sugerido</div>
                    <div className="text-xl font-bold text-amber-400">{kWpSugerido.toFixed(2)} <span className="text-sm font-normal text-amber-400/60">kWp</span></div>
                    <div className="text-xs text-zinc-600 mt-0.5">~{panelesSugeridosCFE} paneles de {Number(potencia) || 545}W</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Último recibo</div>
                    <div className="text-xl font-bold text-zinc-100">${fmt(reciboCFE.totalFacturado)}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">MXN con IVA</div>
                  </div>
                </div>

                {/* ── Expandable detail ──────────────────────────────────────── */}
                {reciboDetalle && (
                  <div className="border-t border-emerald-500/10 px-5 py-5 space-y-6">

                    {/* Datos del servicio */}
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Datos del servicio</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="space-y-0.5">
                          <span className="text-xs text-zinc-600">Titular</span>
                          <p className="text-zinc-200">{reciboCFE.nombre}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs text-zinc-600">No. de Servicio</span>
                          <p className="text-zinc-200 font-mono">{reciboCFE.noServicio || "—"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs text-zinc-600">Dirección</span>
                          <p className="text-zinc-200">{reciboCFE.direccion || "—"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Historial de consumo — tabla */}
                    {reciboCFE.historico.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                          Consumo histórico ({reciboCFE.historico.length} períodos)
                        </h4>
                        <div className="rounded-xl border border-zinc-800 overflow-hidden">
                          <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 px-4 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                            <span>Período</span>
                            <span className="text-right">kWh</span>
                            <span className="text-right">Importe</span>
                            <span className="text-right">kWh/mes</span>
                          </div>
                          {(() => {
                            const allKwh = [reciboCFE.consumoKwh, ...reciboCFE.historico.map((x) => x.kwh)];
                            const maxKwh = Math.max(...allKwh);
                            const maxHistoricoKwh = reciboCFE.historico.length > 0 ? Math.max(...reciboCFE.historico.map((x) => x.kwh)) : 0;
                            const currentMensual = Math.round(reciboCFE.consumoKwh / Math.max(reciboCFE.diasPeriodo / 30, 1));
                            const currentBarPct = maxKwh > 0 ? (reciboCFE.consumoKwh / maxKwh) * 100 : 0;
                            const isCurrentMax = reciboCFE.consumoKwh >= maxHistoricoKwh;
                            return (
                              <>
                                {/* Current period row — highlighted */}
                                <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 px-4 py-2.5 border-t border-amber-500/30 items-center relative bg-amber-500/5">
                                  <div className="absolute inset-y-0 left-0 bg-amber-500/10" style={{ width: `${currentBarPct}%` }} />
                                  <span className="text-xs text-amber-400 relative font-semibold">
                                    {reciboCFE.periodoInicio} – {reciboCFE.periodoFin}
                                    <span className="ml-2 text-[10px] bg-amber-400/15 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">ACTUAL</span>
                                    {isCurrentMax && <span className="ml-1 text-[10px] bg-red-400/15 text-red-400 px-1.5 py-0.5 rounded-full font-medium">PICO</span>}
                                  </span>
                                  <span className="text-xs text-amber-400 font-mono text-right relative font-bold">{reciboCFE.consumoKwh.toLocaleString()}</span>
                                  <span className="text-xs text-amber-400/70 font-mono text-right relative">${fmt(reciboCFE.totalFacturado)}</span>
                                  <span className="text-xs text-amber-400/60 font-mono text-right relative">~{currentMensual}</span>
                                </div>
                                {/* Historic periods */}
                                {reciboCFE.historico.map((h, i) => {
                                  const mensual = Math.round(h.kwh / 2);
                                  const barPct = maxKwh > 0 ? (h.kwh / maxKwh) * 100 : 0;
                                  const isMax = !isCurrentMax && h.kwh === maxHistoricoKwh;
                                  return (
                                    <div
                                      key={i}
                                      className={`grid grid-cols-[1fr_80px_100px_80px] gap-2 px-4 py-2.5 border-t items-center relative ${isMax ? "border-red-500/30 bg-red-500/5" : "border-zinc-800/60"}`}
                                    >
                                      <div className={`absolute inset-y-0 left-0 ${isMax ? "bg-red-500/10" : "bg-emerald-500/5"}`} style={{ width: `${barPct}%` }} />
                                      <span className={`text-xs relative ${isMax ? "text-red-400 font-semibold" : "text-zinc-300"}`}>
                                        {h.periodo}
                                        {isMax && <span className="ml-2 text-[10px] bg-red-400/15 text-red-400 px-1.5 py-0.5 rounded-full font-medium">PICO</span>}
                                      </span>
                                      <span className={`text-xs font-mono text-right relative font-medium ${isMax ? "text-red-400" : "text-zinc-100"}`}>{h.kwh.toLocaleString()}</span>
                                      <span className={`text-xs font-mono text-right relative ${isMax ? "text-red-400/70" : "text-zinc-400"}`}>{h.importe > 0 ? `$${fmt(h.importe)}` : "—"}</span>
                                      <span className={`text-xs font-mono text-right relative ${isMax ? "text-red-400/60" : "text-zinc-500"}`}>~{mensual}</span>
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()}
                          {/* Average row */}
                          <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
                            <span className="text-xs font-semibold text-zinc-400 uppercase">Promedio</span>
                            <span className="text-xs text-zinc-200 font-mono text-right font-semibold">
                              {Math.round(reciboCFE.historico.reduce((s, h) => s + h.kwh, 0) / reciboCFE.historico.length).toLocaleString()}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono text-right">
                              ${fmt(reciboCFE.historico.reduce((s, h) => s + h.importe, 0) / reciboCFE.historico.length)}
                            </span>
                            <span className="text-xs text-amber-400 font-mono text-right font-semibold">
                              ~{Math.round(consumoMensualCFE)}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-red-400/60 mt-2 flex items-center gap-1">
                          <span className="inline-block bg-red-400/15 text-red-400 px-1.5 py-0.5 rounded-full font-medium text-[10px]">PICO</span>
                          Bimestre de mayor consumo — se usa como referencia para la propuesta &quot;Máxima&quot;.
                        </p>
                      </div>
                    )}

                    {/* Propuestas de sistema */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                          Propuestas de sistema <span className="normal-case font-normal text-zinc-600">· {panelW}W · HSP 5.5 · 132 kWh/kWp/mes</span>
                        </h4>
                        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5 shrink-0">
                          <button
                            onClick={() => setReciboUltimoAnio(true)}
                            className={`text-[11px] px-3 py-1 rounded-md transition-colors font-medium ${reciboUltimoAnio ? "bg-amber-400/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            Último año ({Math.min(6, reciboCFE.historico.length) + 1} bim)
                          </button>
                          <button
                            onClick={() => setReciboUltimoAnio(false)}
                            className={`text-[11px] px-3 py-1 rounded-md transition-colors font-medium ${!reciboUltimoAnio ? "bg-amber-400/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            Todo el historial ({reciboCFE.historico.length + 1} bim)
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 mb-3">
                        {reciboUltimoAnio
                          ? `Usando los últimos ${Math.min(6, reciboCFE.historico.length) + 1} bimestres (${Math.min(6, reciboCFE.historico.length)} del historial + período actual).`
                          : `Usando todo el historial (${reciboCFE.historico.length + 1} bimestres incluyendo período actual).`
                        }
                      </p>
                      {(() => {
                        const genPanelBim = Math.round(panelW / 1000 * 132 * 2); // kWh por panel por bimestre
                        const consumoPromBim = consumoMensualCalc * 2;
                        const consumoEquilBim = consumoP75 * 2;
                        const consumoMaxBim = maxHistKwh; // ya es bimestral
                        const genPromedioBim = panelesPromedio * genPanelBim;
                        const genEquilibradoBim = panelesEquilibrado * genPanelBim;
                        const genMaxBim = panelesMax * genPanelBim;
                        return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Propuesta 1: Promedio */}
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Promedio</span>
                            <span className="text-[10px] bg-emerald-400/15 text-emerald-400 px-1.5 py-0.5 rounded-full">Recomendada</span>
                          </div>
                          <div className="text-center py-2">
                            <div className="text-3xl font-bold text-emerald-400">{panelesPromedio}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">paneles</div>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-zinc-500">Consumo mensual</span><span className="text-zinc-300 font-mono">{consumoMensualCalc} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Consumo bimestral</span><span className="text-zinc-100 font-mono font-semibold">{consumoPromBim.toLocaleString()} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Sistema</span><span className="text-zinc-300 font-mono">{kWpPromedio.toFixed(2)} kWp</span></div>
                            <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5"><span className="text-zinc-500">Gen. por panel/bim</span><span className="text-zinc-300 font-mono">{genPanelBim} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Gen. total/bimestre</span><span className="text-emerald-400 font-mono font-semibold">{genPromedioBim.toLocaleString()} kWh</span></div>
                            <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5">
                              <span className="text-zinc-500">Diferencia</span>
                              <span className={`font-mono font-semibold ${genPromedioBim >= consumoPromBim ? "text-emerald-400" : "text-red-400"}`}>
                                {genPromedioBim >= consumoPromBim ? "+" : ""}{(genPromedioBim - consumoPromBim).toLocaleString()} kWh
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-600 leading-tight">Cubre el promedio de todos los períodos. Meses altos generan un poco de deuda con CFE, meses bajos acumulan excedente.</p>
                          <button
                            onClick={() => setCantidad(String(panelesPromedio))}
                            className="w-full text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/25 hover:border-emerald-400/50 rounded-lg px-3 py-1.5 transition-colors mt-1"
                          >
                            Aplicar {panelesPromedio} paneles
                          </button>
                        </div>

                        {/* Propuesta 2: Equilibrada (P75) */}
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Equilibrada</span>
                            <span className="text-[10px] bg-amber-400/15 text-amber-400 px-1.5 py-0.5 rounded-full">P75</span>
                          </div>
                          <div className="text-center py-2">
                            <div className="text-3xl font-bold text-amber-400">{panelesEquilibrado}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">paneles</div>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-zinc-500">Consumo mensual</span><span className="text-zinc-300 font-mono">{consumoP75} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Consumo bimestral</span><span className="text-zinc-100 font-mono font-semibold">{consumoEquilBim.toLocaleString()} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Sistema</span><span className="text-zinc-300 font-mono">{kWpEquilibrado.toFixed(2)} kWp</span></div>
                            <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5"><span className="text-zinc-500">Gen. por panel/bim</span><span className="text-zinc-300 font-mono">{genPanelBim} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Gen. total/bimestre</span><span className="text-amber-400 font-mono font-semibold">{genEquilibradoBim.toLocaleString()} kWh</span></div>
                            <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5">
                              <span className="text-zinc-500">Diferencia</span>
                              <span className={`font-mono font-semibold ${genEquilibradoBim >= consumoEquilBim ? "text-emerald-400" : "text-red-400"}`}>
                                {genEquilibradoBim >= consumoEquilBim ? "+" : ""}{(genEquilibradoBim - consumoEquilBim).toLocaleString()} kWh
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-600 leading-tight">Cubre el 75% de los períodos sin depender del acumulado. Reduce al mínimo la deuda con CFE en meses de alto consumo.</p>
                          <button
                            onClick={() => setCantidad(String(panelesEquilibrado))}
                            className="w-full text-xs text-amber-400 hover:text-amber-300 border border-amber-400/25 hover:border-amber-400/50 rounded-lg px-3 py-1.5 transition-colors mt-1"
                          >
                            Aplicar {panelesEquilibrado} paneles
                          </button>
                        </div>

                        {/* Propuesta 3: Máxima (referencia) */}
                        <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Máxima</span>
                            <span className="text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-full">Referencia</span>
                          </div>
                          <div className="text-center py-2">
                            <div className="text-3xl font-bold text-zinc-300">{panelesMax}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">paneles</div>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-zinc-500">Consumo mensual</span><span className="text-zinc-300 font-mono">{consumoMensualMax} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Consumo bimestral</span><span className="text-zinc-100 font-mono font-semibold">{consumoMaxBim.toLocaleString()} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Sistema</span><span className="text-zinc-300 font-mono">{kWpMax.toFixed(2)} kWp</span></div>
                            <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5"><span className="text-zinc-500">Gen. por panel/bim</span><span className="text-zinc-300 font-mono">{genPanelBim} kWh</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Gen. total/bimestre</span><span className="text-zinc-100 font-mono font-semibold">{genMaxBim.toLocaleString()} kWh</span></div>
                            <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5">
                              <span className="text-zinc-500">Diferencia</span>
                              <span className={`font-mono font-semibold ${genMaxBim >= consumoMaxBim ? "text-emerald-400" : "text-red-400"}`}>
                                {genMaxBim >= consumoMaxBim ? "+" : ""}{(genMaxBim - consumoMaxBim).toLocaleString()} kWh
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-600 leading-tight">Cubriría hasta el bimestre de mayor consumo. Puede resultar sobredimensionado — solo como referencia.</p>
                          <button
                            onClick={() => setCantidad(String(panelesMax))}
                            className="w-full text-xs text-zinc-400 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-1.5 transition-colors mt-1"
                          >
                            Aplicar {panelesMax} paneles
                          </button>
                        </div>
                      </div>
                        );
                      })()}

                      {/* Propuesta 4: Con incremento (minisplits) — full width below */}
                      <div className={`mt-3 rounded-xl border p-4 space-y-3 ${minisplits.length > 0 ? "border-cyan-500/20 bg-cyan-500/5" : "border-dashed border-zinc-700 bg-zinc-800/10"}`}>
                        {minisplits.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
                            {/* Left: configurator */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Incremento por minisplits</span>
                                  <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5">
                                    <button
                                      onClick={() => setMinisplitTemporada("temporada")}
                                      className={`text-[11px] px-2.5 py-0.5 rounded-md transition-colors font-medium ${minisplitTemporada === "temporada" ? "bg-cyan-400/15 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
                                    >
                                      Temporada
                                    </button>
                                    <button
                                      onClick={() => setMinisplitTemporada("anual")}
                                      className={`text-[11px] px-2.5 py-0.5 rounded-md transition-colors font-medium ${minisplitTemporada === "anual" ? "bg-cyan-400/15 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
                                    >
                                      Todo el año
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {minisplits.map((m) => {
                                  const wPerUnit = Number(m.toneladas) * WATTS_POR_TON[m.tipo];
                                  const kwhMesUnit = Math.round((wPerUnit * m.horasDia * 30) / 1000);
                                  return (
                                  <div key={m.id} className="flex flex-wrap items-center gap-2">
                                    <select value={m.cantidad} onChange={(e) => updateMinisplit(m.id, "cantidad", Number(e.target.value))} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 w-14 focus:border-cyan-500/50 focus:outline-none">
                                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}×</option>)}
                                    </select>
                                    <select value={m.toneladas} onChange={(e) => updateMinisplit(m.id, "toneladas", e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:border-cyan-500/50 focus:outline-none">
                                      {["1", "1.5", "2", "2.5", "3"].map((t) => <option key={t} value={t}>{t} Ton</option>)}
                                    </select>
                                    <div className="flex items-center gap-1">
                                      <input type="number" min={1} max={24} value={m.horasDia} onChange={(e) => updateMinisplit(m.id, "horasDia", Math.min(24, Math.max(1, Number(e.target.value))))} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 w-14 focus:border-cyan-500/50 focus:outline-none text-center" />
                                      <span className="text-[10px] text-zinc-500">h/día</span>
                                    </div>
                                    <select value={m.tipo} onChange={(e) => updateMinisplit(m.id, "tipo", e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:border-cyan-500/50 focus:outline-none">
                                      <option value="inverter">Inverter</option>
                                      <option value="convencional">Convencional</option>
                                    </select>
                                    <span className="text-[10px] text-cyan-400/70 font-mono">{(kwhMesUnit * m.cantidad).toLocaleString()} kWh/mes</span>
                                    <button onClick={() => removeMinisplit(m.id)} className="text-zinc-600 hover:text-red-400 transition-colors text-xs px-1" title="Eliminar">✕</button>
                                  </div>
                                  );
                                })}
                              </div>

                              <div className="flex items-center gap-3">
                                <button onClick={addMinisplit} className="text-[11px] text-cyan-400/70 hover:text-cyan-400 transition-colors">+ Agregar equipo</button>
                                <span className="text-xs text-zinc-500">Total: <span className="text-cyan-400 font-mono font-semibold">{Math.round(minisplitKwhMes)} kWh/mes</span>{minisplitTemporada === "temporada" && <span className="text-zinc-600 ml-1">(prom. anual: {minisplitKwhMesProm})</span>}</span>
                              </div>
                            </div>

                            {/* Right: result card */}
                            <div className="sm:w-56 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Con incremento</span>
                                <span className="text-[10px] bg-cyan-400/15 text-cyan-400 px-1.5 py-0.5 rounded-full">+Minisplits</span>
                              </div>
                              <div className="text-center py-1">
                                <div className="text-3xl font-bold text-cyan-400">{panelesConIncremento}</div>
                                <div className="text-xs text-zinc-500">paneles</div>
                              </div>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-zinc-500">Actual</span><span className="text-zinc-300 font-mono">{consumoMensualCalc} kWh/mes</span></div>
                                <div className="flex justify-between"><span className="text-cyan-400/70">+ Minisplits</span><span className="text-cyan-400 font-mono font-semibold">+{minisplitKwhMesProm}</span></div>
                                <div className="flex justify-between border-t border-zinc-800/60 pt-1.5"><span className="text-zinc-500">Total</span><span className="text-zinc-100 font-mono font-semibold">{consumoConIncremento} kWh/mes</span></div>
                                <div className="flex justify-between"><span className="text-zinc-500">Bimestre</span><span className="text-zinc-100 font-mono font-semibold">{(consumoConIncremento * 2).toLocaleString()} kWh</span></div>
                                <div className="flex justify-between"><span className="text-zinc-500">Sistema</span><span className="text-zinc-300 font-mono">{kWpConIncremento.toFixed(2)} kWp</span></div>
                              </div>
                              <button
                                onClick={() => setCantidad(String(panelesConIncremento))}
                                className="w-full text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-400/25 hover:border-cyan-400/50 rounded-lg px-3 py-1.5 transition-colors"
                              >
                                Aplicar {panelesConIncremento} paneles
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">¿El cliente planea agregar minisplits u otra carga?</span>
                            </div>
                            <button
                              onClick={addMinisplit}
                              className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-400/25 hover:border-cyan-400/50 rounded-lg px-4 py-1.5 transition-colors shrink-0"
                            >
                              + Simular incremento
                            </button>
                          </div>
                        )}
                      </div>



                      <p className="text-xs text-zinc-600 mt-2">
                        * HSP 5.5 estimadas para norte de México. Fórmula: consumo mensual ÷ 132 = kWp → × 1000 ÷ {panelW}W = paneles.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action row */}
                <div className="px-5 pb-4 flex flex-wrap items-center gap-2 border-t border-emerald-500/10 pt-3">
                  <button
                    onClick={() => setNombreCotizacion(reciboCFE.nombre)}
                    className="text-xs text-amber-400 hover:text-amber-300 border border-amber-400/25 hover:border-amber-400/50 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Usar nombre del cliente
                  </button>
                  <button
                    onClick={() => setReciboDetalle(!reciboDetalle)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/25 hover:border-emerald-400/50 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {reciboDetalle ? "Ocultar desglose" : "Ver desglose"}
                  </button>
                  {reciboPDFBase64 && (
                    <button
                      onClick={() => {
                        const win = window.open();
                        if (win) {
                          win.document.write(`<iframe src="${reciboPDFBase64}" style="border:0;width:100%;height:100%" />`);
                          win.document.title = "Recibo CFE — " + reciboCFE.nombre;
                        }
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/25 hover:border-emerald-400/50 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Ver PDF original
                    </button>
                  )}
                  <button
                    onClick={() => reciboInputRef.current?.click()}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5"
                  >
                    Cambiar recibo
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Cargar recibo CFE</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Sube el PDF o una foto del recibo — la IA extrae consumo, tarifa e historial
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {errorRecibo && (
                    <span className="text-xs text-red-400 max-w-40 text-right">{errorRecibo}</span>
                  )}
                  <button
                    onClick={() => reciboInputRef.current?.click()}
                    disabled={loadingRecibo}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingRecibo ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Leyendo…
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Subir recibo
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 1. PANELES */}
            <SectionCard num="1" title="Paneles" badge="USD sin IVA">
              {/* Catalog picker trigger */}
              <div className="flex items-center justify-between -mt-1 mb-1">
                <span className="text-xs text-zinc-600">
                  {catalogoPaneles.length > 0 ? `${catalogoPaneles.length} panel${catalogoPaneles.length !== 1 ? "es" : ""} en catálogo` : "Catálogo vacío"}
                </span>
                <button
                  onClick={() => setPickerPanel(true)}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Del catálogo
                </button>
              </div>

              {/* Chip ítem seleccionado */}
              {panelSeleccionado && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-400/8 border border-amber-400/25 px-3 py-2">
                  <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs font-medium text-amber-300 flex-1">
                    {panelSeleccionado.marca} — {panelSeleccionado.modelo}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {panelSeleccionado.potencia}W · {fmtUSD3(panelSeleccionado.precioPorWatt)}/W
                  </span>
                  <button onClick={() => setPanelSeleccionado(null)} className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Cantidad">
                  <NumInput value={cantidad} onChange={setCantidad} placeholder="Ej: 12" />
                </Field>
                <Field label="Potencia por panel (W)">
                  <NumInput value={potencia} onChange={(v) => { setPotencia(v); if (v) { setSugerirGuardarPanel(true); setPanelSeleccionado(null); } }} placeholder="Ej: 550" />
                </Field>
                <Field label="Precio / watt (USD)">
                  <NumInput value={precioPorWatt} onChange={(v) => { setPrecioPorWatt(v); if (v) { setSugerirGuardarPanel(true); setPanelSeleccionado(null); } }} placeholder="Ej: 0.18" step={0.001} />
                </Field>
              </div>

              {/* Save to catalog suggestion */}
              {sugerirGuardarPanel && potenciaNum > 0 && precioNum > 0 && (
                <SaveToCatalogBanner
                  label="¿Guardar este panel en el catálogo?"
                  onSave={guardarPanelEnCatalogo}
                  onDismiss={() => setSugerirGuardarPanel(false)}
                />
              )}

              {/* Desglose calculado */}
              {cantidadNum > 0 && potenciaNum > 0 && precioNum > 0 && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    <span>Concepto</span>
                    <span className="text-center">Cant.</span>
                    <span className="text-right">Precio</span>
                    <span className="text-right">Subtotal</span>
                  </div>

                  {/* Paneles */}
                  <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                    <span className="text-xs text-zinc-300">
                      Panel {potenciaNum}W{panelSeleccionado ? ` ${panelSeleccionado.modelo}` : ""}
                    </span>
                    <span className="text-xs text-center text-zinc-400 font-mono">{cantidadNum}</span>
                    <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(costoPanel)}/pza</span>
                    <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoPanelesUSD)}</span>
                  </div>

                  {/* Flete */}
                  <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                    <span className="text-xs text-zinc-300">Servicio de logística (Flete)</span>
                    <span className="text-xs text-center text-zinc-400 font-mono">1</span>
                    <input
                      type="number" min={0} step={0.01}
                      value={fletePaneles}
                      onChange={(e) => setFletePaneles(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 font-mono"
                    />
                    <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(fletePanelesNum)}</span>
                  </div>

                  {/* Garantía */}
                  <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                    <span className="text-xs text-zinc-300">Garantía contra daños de mercancía</span>
                    <span className="text-xs text-center text-zinc-400 font-mono">1</span>
                    <input
                      type="number" min={0} step={0.01}
                      value={garantiaPaneles}
                      onChange={(e) => setGarantiaPaneles(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 font-mono"
                    />
                    <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(garantiaPanelesNum)}</span>
                  </div>

                  {/* Total USD */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
                    <span className="text-xs text-zinc-500">
                      {cantidadNum} × {potenciaNum}W × {fmtUSD3(precioNum)}/W
                    </span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">
                      ${fmtUSD(totalPanelesUSD)} USD
                    </span>
                  </div>

                  {/* TC personalizado */}
                  <TcCustomRow
                    tcGlobal={tcVal}
                    value={tcCustomPaneles}
                    onChange={setTcCustomPaneles}
                  />

                  {/* Total MXN */}
                  <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-700 bg-zinc-800/60">
                    <span className="text-xs text-zinc-400 font-medium">
                      Subtotal paneles
                      {Number(tcCustomPaneles) > 0 && (
                        <span className="ml-1.5 text-amber-400/70">(TC personalizado)</span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">
                      ${fmt(partidaPanelesMXN)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
                    <span className="text-xs text-zinc-500">IVA 16%</span>
                    <span className="text-xs text-zinc-400 font-mono">${fmt(partidaPanelesMXN * 0.16)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
                    <span className="text-xs text-zinc-300 font-semibold">Total paneles</span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaPanelesMXN * 1.16)} MXN</span>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* 2. INVERSORES */}
            <SectionCard
              num="2"
              title="Microinversores"
              badge={cantidadMicros > 0 ? `${cantidadMicros} uds · ${panelesPorMicro} pan/micro` : "USD sin IVA"}
            >
              {/* Catalog picker trigger */}
              <div className="flex items-center justify-between -mt-1 mb-1">
                <span className="text-xs text-zinc-600">
                  {catalogoMicros.length > 0 ? `${catalogoMicros.length} modelo${catalogoMicros.length !== 1 ? "s" : ""} en catálogo` : "Catálogo vacío"}
                </span>
                <button
                  onClick={() => setPickerMicro(true)}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Del catálogo
                </button>
              </div>

              {/* Chip ítem seleccionado */}
              {microSeleccionado && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-400/8 border border-amber-400/25 px-3 py-2">
                  <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs font-medium text-amber-300 flex-1">
                    {microSeleccionado.marca} — {microSeleccionado.modelo}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    ${fmtUSD(microSeleccionado.precio)} USD
                    {microSeleccionado.precioCable > 0 && ` · cable $${fmtUSD(microSeleccionado.precioCable)}`}
                  </span>
                  <button onClick={() => setMicroSeleccionado(null)} className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Precio por microinversor (USD)" hint={microSeleccionado ? `1 micro por cada ${panelesPorMicro} paneles (${microSeleccionado.modelo})` : `1 micro por cada ${panelesPorMicro} paneles (default DS3D)`}>
                  <NumInput value={precioMicroinversor} onChange={(v) => { setPrecioMicroinversor(v); if (v) { setSugerirGuardarMicro(true); setMicroSeleccionado(null); } }} placeholder="Ej: 180.00" step={0.01} />
                </Field>
                <Field label="Cable troncal APS por unidad (USD)" hint="1 cable por microinversor">
                  <NumInput value={precioCable} onChange={(v) => { setPrecioCable(v); if (v) { setSugerirGuardarMicro(true); setMicroSeleccionado(null); } }} placeholder="Ej: 25.00" step={0.01} />
                </Field>
              </div>

              {/* Desglose calculado */}
              {cantidadNum > 0 && precioMicroNum > 0 && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  {/* header */}
                  <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    <span>Concepto</span>
                    <span className="text-center">Cant.</span>
                    <span className="text-right">Precio</span>
                    <span className="text-right">Subtotal</span>
                  </div>

                  {/* Microinversores */}
                  <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                    <span className="text-xs text-zinc-300">Microinversor{microSeleccionado ? ` ${microSeleccionado.modelo}` : ""}</span>
                    <span className="text-xs text-center text-zinc-400 font-mono">{cantidadMicros}</span>
                    <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioMicroNum)}</span>
                    <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoMicrosUSD)}</span>
                  </div>

                  {/* Cables */}
                  {precioCableNum > 0 && (
                    <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                      <span className="text-xs text-zinc-300">Cable troncal</span>
                      <span className="text-xs text-center text-zinc-400 font-mono">{cantidadMicros}</span>
                      <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioCableNum)}</span>
                      <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoCablesUSD)}</span>
                    </div>
                  )}

                  {/* ECU */}
                  {incluyeECU && precioECUNum > 0 && (
                    <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                      <span className="text-xs text-zinc-300">ECU-R Monitoreo</span>
                      <span className="text-xs text-center text-zinc-400 font-mono">1</span>
                      <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioECUNum)}</span>
                      <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoECUUSD)}</span>
                    </div>
                  )}

                  {/* Herramienta */}
                  {incluyeHerramienta && precioHerramientaNum > 0 && (
                    <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                      <span className="text-xs text-zinc-300">Herramienta desconectora</span>
                      <span className="text-xs text-center text-zinc-400 font-mono">1</span>
                      <span className="text-xs text-right text-zinc-400 font-mono">${fmtUSD(precioHerramientaNum)}</span>
                      <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(costoHerramientaUSD)}</span>
                    </div>
                  )}

                  {/* Flete */}
                  <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                    <span className="text-xs text-zinc-300">Flete microinversores</span>
                    <span className="text-xs text-center text-zinc-400 font-mono">1</span>
                    <input
                      type="number" min={0} step={0.01}
                      value={fleteMicros}
                      onChange={(e) => setFleteMicros(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 font-mono"
                    />
                    <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(fleteMicrosNum)}</span>
                  </div>

                  {/* Total USD */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
                    <span className="text-xs text-zinc-500">
                      {cantidadNum} paneles ÷ {panelesPorMicro} = {cantidadMicros} micros
                    </span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">
                      ${fmtUSD(totalInversoresUSD)} USD
                    </span>
                  </div>

                  {/* TC personalizado */}
                  <TcCustomRow
                    tcGlobal={tcVal}
                    value={tcCustomMicros}
                    onChange={setTcCustomMicros}
                  />

                  {/* Total MXN */}
                  <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-700 bg-zinc-800/60">
                    <span className="text-xs text-zinc-400 font-medium">
                      Subtotal inversores
                      {Number(tcCustomMicros) > 0 && (
                        <span className="ml-1.5 text-amber-400/70">(TC personalizado)</span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">
                      ${fmt(partidaInversoresMXN)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
                    <span className="text-xs text-zinc-500">IVA 16%</span>
                    <span className="text-xs text-zinc-400 font-mono">${fmt(partidaInversoresMXN * 0.16)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
                    <span className="text-xs text-zinc-300 font-semibold">Total inversores</span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaInversoresMXN * 1.16)} MXN</span>
                  </div>
                </div>
              )}

              {/* Save to catalog suggestion */}
              {sugerirGuardarMicro && precioMicroNum > 0 && (
                <SaveToCatalogBanner
                  label="¿Guardar este microinversor en el catálogo?"
                  onSave={guardarMicroEnCatalogo}
                  onDismiss={() => setSugerirGuardarMicro(false)}
                />
              )}

              <div className="space-y-3 border-t border-zinc-800 pt-4">
                <Toggle
                  checked={incluyeECU}
                  onChange={setIncluyeECU}
                  label="ECU-R — Sistema de monitoreo"
                />
                {incluyeECU && (
                  <div className="pl-12">
                    <Field label="Precio ECU-R (USD)">
                      <NumInput value={precioECU} onChange={setPrecioECU} placeholder="Ej: 145.00" step={0.01} />
                    </Field>
                  </div>
                )}

                <Toggle
                  checked={incluyeHerramienta}
                  onChange={setIncluyeHerramienta}
                  label="Herramienta desconectora APS"
                  hint="Opcional — no se requiere en cada instalación"
                />
                {incluyeHerramienta && (
                  <div className="pl-12">
                    <Field label="Precio herramienta (USD)">
                      <NumInput value={precioHerramienta} onChange={setPrecioHerramienta} placeholder="Ej: 35.00" step={0.01} />
                    </Field>
                  </div>
                )}
              </div>

            </SectionCard>

            {/* 3. ESTRUCTURA */}
            <SectionCard num="3" title="Estructura — Aluminio" badge="MXN sin IVA">
              <LineItemTable
                items={aluminio}
                onChange={updateAluminio}
                currency="MXN"
              />
              <Field label="Flete" hint="MXN con IVA incluido — se descuenta el IVA para no cobrar doble">
                <NumInput value={fleteAluminio} onChange={setFleteAluminio} step={0.01} />
              </Field>
              {partidaEstructuraMXN > 0 && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden mt-3">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/60">
                    <span className="text-xs text-zinc-400">Subtotal estructura</span>
                    <span className="text-xs text-zinc-300 font-mono">${fmt(partidaEstructuraMXN)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
                    <span className="text-xs text-zinc-500">IVA 16%</span>
                    <span className="text-xs text-zinc-400 font-mono">${fmt(partidaEstructuraMXN * 0.16)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
                    <span className="text-xs text-zinc-300 font-semibold">Total estructura</span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaEstructuraMXN * 1.16)} MXN</span>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* 4. TORNILLERIA */}
            <SectionCard num="4" title="Tornillería" badge="MXN sin IVA">
              <LineItemTable
                items={tornilleria}
                onChange={updateTornilleria}
                currency="MXN"
              />
              {partidaTornilleriaMXN > 0 && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden mt-3">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/60">
                    <span className="text-xs text-zinc-400">Subtotal tornillería</span>
                    <span className="text-xs text-zinc-300 font-mono">${fmt(partidaTornilleriaMXN)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
                    <span className="text-xs text-zinc-500">IVA 16%</span>
                    <span className="text-xs text-zinc-400 font-mono">${fmt(partidaTornilleriaMXN * 0.16)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
                    <span className="text-xs text-zinc-300 font-semibold">Total tornillería</span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaTornilleriaMXN * 1.16)} MXN</span>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* 5. GENERALES */}
            <SectionCard num="5" title="Generales" badge="MXN sin IVA">
              <LineItemTable
                items={generales}
                onChange={updateGeneral}
                currency="MXN"
              />
              {partidaGeneralesMXN > 0 && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden mt-3">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/60">
                    <span className="text-xs text-zinc-400">Subtotal generales</span>
                    <span className="text-xs text-zinc-300 font-mono">${fmt(partidaGeneralesMXN)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800/60">
                    <span className="text-xs text-zinc-500">IVA 16%</span>
                    <span className="text-xs text-zinc-400 font-mono">${fmt(partidaGeneralesMXN * 0.16)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/80 border-t border-zinc-700">
                    <span className="text-xs text-zinc-300 font-semibold">Total generales</span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">${fmt(partidaGeneralesMXN * 1.16)} MXN</span>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── RIGHT: Sticky sidebar ─────────────────────────────────────── */}
          <div className="lg:sticky lg:top-20 h-fit space-y-4">

            {/* Tipo de cambio */}
            <div className={`rounded-2xl border p-4 transition-colors ${
              tcFrozen ? "border-blue-400/40 bg-blue-400/5" : tcManual ? "border-amber-400/40 bg-amber-400/5" : "border-zinc-800 bg-zinc-900"
            }`}>
              {tc || tcFrozen || tcManual ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs uppercase tracking-wide font-medium ${
                      tcFrozen ? "text-blue-400" : tcManual ? "text-amber-400" : "text-zinc-500"
                    }`}>
                      {tcManual ? "TC Manual" : tcFrozen ? "TC Congelado" : "Tipo de cambio FIX"}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {tcManual ? "editable" : tcFrozen ? "fijo en cotización" : tc?.fecha}
                    </span>
                  </div>

                  {/* Hoy / Mañana toggle — only when live mode and alt rate exists */}
                  {!tcFrozen && !tcManual && tc?.tipoCambioAlt && (
                    <div className="flex rounded-lg border border-zinc-700 overflow-hidden mb-2">
                      <button
                        onClick={() => setTcUsarManana(false)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                          !tcUsarManana
                            ? "bg-zinc-700 text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Hoy <span className="font-mono text-[10px] ml-1">${tc.tipoCambio.toFixed(4)}</span>
                      </button>
                      <button
                        onClick={() => setTcUsarManana(true)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-l border-zinc-700 ${
                          tcUsarManana
                            ? "bg-zinc-700 text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Mañana <span className="font-mono text-[10px] ml-1">${tc.tipoCambioAlt.toFixed(4)}</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-end gap-2">
                      {tcManual ? (
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500 text-xl font-mono">$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.0001}
                            value={tcSnapshotLocal}
                            onChange={(e) => setTcSnapshotLocal(e.target.value)}
                            className="w-32 text-2xl font-bold text-amber-300 font-mono bg-transparent border-b border-amber-400/40 outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      ) : (
                        <span className={`text-2xl font-bold font-mono ${tcFrozen ? "text-blue-300" : "text-zinc-100"}`}>
                          ${tcVal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </span>
                      )}
                      <span className="text-sm text-zinc-500 mb-0.5">MXN/USD</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1.5 mt-2.5">
                    {/* Congelar / Descongelar */}
                    <button
                      onClick={() => {
                        if (tcFrozen) {
                          setTcFrozen(false);
                          setTcSnapshotLocal("");
                        } else {
                          setTcManual(false);
                          setTcSnapshotLocal(String(tcLive || tcVal));
                          setTcFrozen(true);
                        }
                      }}
                      disabled={!tcLive && !tcFrozen && !tcManual}
                      title={tcFrozen ? "Descongelar — volver al DOF en vivo" : "Congelar este TC en la cotización"}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        tcFrozen
                          ? "bg-blue-400/20 text-blue-300 border border-blue-400/40 hover:bg-blue-400/10"
                          : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {tcFrozen ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          Descongelar
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z M12 7a4 4 0 00-4 4" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a4 4 0 014 4" />
                          </svg>
                          Congelar
                        </>
                      )}
                    </button>

                    {/* Manual / Auto */}
                    <button
                      onClick={() => {
                        if (tcManual) {
                          setTcManual(false);
                          setTcSnapshotLocal("");
                        } else {
                          setTcFrozen(false);
                          setTcSnapshotLocal(String(tcLive || tcVal));
                          setTcManual(true);
                        }
                      }}
                      disabled={!tcLive && !tcFrozen && !tcManual}
                      title={tcManual ? "Volver al TC automático" : "Escribir TC manualmente"}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        tcManual
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/10"
                          : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {tcManual ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Auto
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Manual
                        </>
                      )}
                    </button>
                  </div>

                  {tcManual && (
                    <p className="text-xs text-zinc-500 mt-1.5">
                      Escribe el TC exacto del DOF para tu pago
                    </p>
                  )}
                  {tcFrozen && tcLive > 0 && tcLive !== tcVal && (
                    <p className="text-xs text-zinc-600 mt-1.5">
                      DOF actual: ${tcLive.toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </p>
                  )}
                  {!tcFrozen && !tcManual && tc && (
                    <p className="text-xs text-zinc-600 mt-1">
                      {tcUsarManana && tc.tipoCambioAlt ? tc.etiquetaAlt || "DOF mañana" : tc.etiqueta || tc.fuente}
                      {" — "}{tcUsarManana && tc.fechaAlt ? tc.fechaAlt : tc.fecha}
                    </p>
                  )}
                </>
              ) : tcError ? (
                <p className="text-xs text-red-400">{tcError}</p>
              ) : (
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <div className="h-3 w-3 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin" />
                  Cargando tipo de cambio…
                </div>
              )}
            </div>

            {/* Resumen */}
            {subtotalMXN > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Resumen</h3>
                </div>
                <div className="px-4 py-2">
                  {partidaPanelesMXN > 0 && <PartidaRow label="Paneles" value={partidaPanelesMXN} />}
                  {partidaInversoresMXN > 0 && <PartidaRow label="Inversores" value={partidaInversoresMXN} />}
                  {partidaEstructuraMXN > 0 && <PartidaRow label="Estructura" value={partidaEstructuraMXN} />}
                  {partidaTornilleriaMXN > 0 && <PartidaRow label="Tornillería" value={partidaTornilleriaMXN} />}
                  {partidaGeneralesMXN > 0 && <PartidaRow label="Generales" value={partidaGeneralesMXN} />}
                </div>

                <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-mono">${fmt(subtotalMXN)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>IVA 16%</span>
                    <span className="font-mono">${fmt(ivaMXN)}</span>
                  </div>
                </div>

                <div className="bg-amber-400/5 border-t border-amber-400/20 px-4 py-4">
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-semibold text-zinc-300">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-amber-400 font-mono leading-none">
                        ${fmt(totalMXN)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">MXN con IVA</div>
                    </div>
                  </div>
                </div>

                {costoPorPanel > 0 && (
                  <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Costo por panel</span>
                        <p className="text-[10px] text-zinc-600 mt-0.5">Total ÷ {cantidadNum} paneles</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-cyan-400 font-mono">${fmt(costoPorPanel)}</span>
                        <p className="text-[10px] text-zinc-600">MXN con IVA</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Precio al Cliente ──────────────────────────────────── */}
            {subtotalMXN > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <button
                  onClick={() => setMostrarPrecioCliente((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                >
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Precio al Cliente</h3>
                  <span className="text-xs text-zinc-600">{mostrarPrecioCliente ? "▲" : "▼"}</span>
                </button>

                {mostrarPrecioCliente && (
                  <div>
                    {/* Tipo de utilidad */}
                    <div className="px-4 py-3 border-b border-zinc-800 space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setUtilidad((u) => ({ ...u, tipo: "global" }))}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${utilidad.tipo === "global" ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}
                        >
                          % Global
                        </button>
                        <button
                          onClick={() => setUtilidad((u) => ({ ...u, tipo: "por_partida" }))}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${utilidad.tipo === "por_partida" ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}
                        >
                          % Por partida
                        </button>
                      </div>

                      {utilidad.tipo === "global" ? (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-zinc-500 w-20">Utilidad</label>
                          <input
                            type="number"
                            value={utilidad.globalPct}
                            onChange={(e) => setUtilidad((u) => ({ ...u, globalPct: Number(e.target.value) || 0 }))}
                            className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 text-right font-mono outline-none focus:border-emerald-400"
                          />
                          <span className="text-xs text-zinc-500">%</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {([
                            ["panelesPct", "Paneles", partidaPanelesMXN],
                            ["inversoresPct", "Inversores", partidaInversoresMXN],
                            ["estructuraPct", "Estructura", partidaEstructuraMXN],
                            ["tornilleriaPct", "Tornillería", partidaTornilleriaMXN],
                            ["generalesPct", "Generales", partidaGeneralesMXN],
                          ] as const).map(([key, label, val]) =>
                            val > 0 ? (
                              <div key={key} className="flex items-center gap-2">
                                <label className="text-xs text-zinc-500 w-20">{label}</label>
                                <input
                                  type="number"
                                  value={utilidad[key]}
                                  onChange={(e) => setUtilidad((u) => ({ ...u, [key]: Number(e.target.value) || 0 }))}
                                  className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 text-right font-mono outline-none focus:border-emerald-400"
                                />
                                <span className="text-xs text-zinc-500">%</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}

                      {/* Monto fijo adicional */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-500 w-20">+ Fijo</label>
                        <input
                          type="number"
                          value={utilidad.montoFijo || ""}
                          onChange={(e) => setUtilidad((u) => ({ ...u, montoFijo: Number(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 text-right font-mono outline-none focus:border-emerald-400 placeholder-zinc-700"
                        />
                        <span className="text-xs text-zinc-500">MXN</span>
                      </div>
                    </div>

                    {/* Desglose precio cliente */}
                    <div className="px-4 py-2">
                      {clientePanelesMXN > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                          <span className="text-xs text-zinc-400">Paneles</span>
                          <span className="text-xs font-mono text-zinc-300">${fmt(clientePanelesMXN * 1.16)}</span>
                        </div>
                      )}
                      {clienteInversoresMXN > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                          <span className="text-xs text-zinc-400">Inversores</span>
                          <span className="text-xs font-mono text-zinc-300">${fmt(clienteInversoresMXN * 1.16)}</span>
                        </div>
                      )}
                      {clienteEstructuraMXN > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                          <span className="text-xs text-zinc-400">Estructura</span>
                          <span className="text-xs font-mono text-zinc-300">${fmt(clienteEstructuraMXN * 1.16)}</span>
                        </div>
                      )}
                      {clienteTornilleriaMXN > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                          <span className="text-xs text-zinc-400">Tornillería</span>
                          <span className="text-xs font-mono text-zinc-300">${fmt(clienteTornilleriaMXN * 1.16)}</span>
                        </div>
                      )}
                      {clienteGeneralesMXN > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                          <span className="text-xs text-zinc-400">Generales</span>
                          <span className="text-xs font-mono text-zinc-300">${fmt(clienteGeneralesMXN * 1.16)}</span>
                        </div>
                      )}
                      {utilidad.montoFijo > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                          <span className="text-xs text-zinc-400">Adicional fijo</span>
                          <span className="text-xs font-mono text-zinc-300">${fmt(utilidad.montoFijo * 1.16)}</span>
                        </div>
                      )}
                    </div>

                    {/* Totales cliente */}
                    <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Subtotal</span>
                        <span className="font-mono">${fmt(clienteSubtotalMXN)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>IVA 16%</span>
                        <span className="font-mono">${fmt(clienteIvaMXN)}</span>
                      </div>
                    </div>

                    <div className="bg-emerald-400/5 border-t border-emerald-400/20 px-4 py-4 space-y-3">
                      <div className="flex items-end justify-between">
                        <span className="text-sm font-semibold text-zinc-300">Total cliente</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-400 font-mono leading-none">
                            ${fmt(clienteTotalMXN)}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">MXN con IVA</div>
                        </div>
                      </div>
                      {cantidadNum > 0 && (
                        <div className="flex items-end justify-between pt-2 border-t border-emerald-400/10">
                          <div>
                            <span className="text-xs font-semibold text-zinc-400">Precio por panel</span>
                            <p className="text-[10px] text-zinc-600">Total ÷ {cantidadNum} paneles</p>
                          </div>
                          <span className="text-xl font-bold text-emerald-300 font-mono">${fmt(clientePorPanel)}</span>
                        </div>
                      )}
                    </div>

                    {/* Métricas */}
                    {cantidadNum > 0 && (
                      <div className="border-t border-zinc-800 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-zinc-600 uppercase">Precio por Watt</p>
                          <p className="text-sm font-bold text-emerald-400 font-mono">${fmt(clientePorWatt)}</p>
                        </div>
                      </div>
                    )}

                    {/* Utilidad neta */}
                    <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-600 uppercase">Utilidad neta</p>
                          <p className="text-[10px] text-zinc-600">{utilidadNetaPct.toFixed(1)}% sobre costo</p>
                        </div>
                        <span className="text-lg font-bold text-amber-400 font-mono">${fmt(utilidadNetaMXN)}</span>
                      </div>
                    </div>

                    {/* Guardar variante */}
                    {nombreCotizacion.trim() && (
                      <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={nombreVariante}
                            onChange={(e) => setNombreVariante(e.target.value)}
                            placeholder="Nombre de variante (ej: Opción A)"
                            className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-400"
                          />
                          <button
                            onClick={handleGuardarVariante}
                            disabled={!nombreVariante.trim()}
                            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            Guardar
                          </button>
                        </div>
                        {!nombreCotizacion.trim() && (
                          <p className="text-[10px] text-red-400">Primero guarda la cotización de costos</p>
                        )}
                      </div>
                    )}

                    {/* Lista de variantes guardadas */}
                    {variantes.length > 0 && (
                      <div className="border-t border-zinc-800">
                        <button
                          onClick={() => setMostrarVariantes((v) => !v)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/50 transition-colors"
                        >
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wide">
                            {variantes.length} variante{variantes.length > 1 ? "s" : ""} guardada{variantes.length > 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-zinc-600">{mostrarVariantes ? "▲" : "▼"}</span>
                        </button>

                        {mostrarVariantes && (
                          <div className="space-y-px">
                            {variantes.map((v) => (
                              <div key={v.id} className="px-4 py-3 bg-zinc-800/30 border-t border-zinc-800/50">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-xs font-medium text-zinc-300">{v.nombre}</p>
                                    <p className="text-[10px] text-zinc-600">
                                      {v.utilidad.tipo === "global" ? `${v.utilidad.globalPct}% global` : "% por partida"}
                                      {v.utilidad.montoFijo > 0 && ` + $${fmt(v.utilidad.montoFijo)}`}
                                    </p>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleCargarVariante(v)}
                                      className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                      Usar
                                    </button>
                                    <button
                                      onClick={() => handleEliminarVariante(v.id)}
                                      className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <p className="text-[10px] text-zinc-600">Total</p>
                                    <p className="text-xs font-bold text-emerald-400 font-mono">${fmt(v.precios.total)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-zinc-600">Por panel</p>
                                    <p className="text-xs font-bold text-emerald-300 font-mono">${fmt(v.precios.porPanel)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-zinc-600">Utilidad</p>
                                    <p className="text-xs font-bold text-amber-400 font-mono">${fmt(v.precios.utilidadNeta)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Comparación: mejor para cliente vs mejor para nosotros */}
                            {variantes.length >= 2 && (
                              <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700 space-y-2">
                                <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wide">Comparación</p>
                                {(() => {
                                  const mejorCliente = [...variantes].sort((a, b) => a.precios.total - b.precios.total)[0];
                                  const mejorNosotros = [...variantes].sort((a, b) => b.precios.utilidadNeta - a.precios.utilidadNeta)[0];
                                  return (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-zinc-500">Mejor para cliente</span>
                                        <span className="text-xs text-emerald-400 font-medium">{mejorCliente.nombre} — ${fmt(mejorCliente.precios.total)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-zinc-500">Mejor para nosotros</span>
                                        <span className="text-xs text-amber-400 font-medium">{mejorNosotros.nombre} — ${fmt(mejorNosotros.precios.utilidadNeta)}</span>
                                      </div>
                                    </>
                                  );
                                })()}
                                <button
                                  onClick={() => setMostrarComparador((v) => !v)}
                                  className="w-full text-xs text-center py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors mt-1"
                                >
                                  {mostrarComparador ? "Cerrar comparador" : "Ver comparador completo"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PDF Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => setMostrarPDF((v) => !v)}
                disabled={!tc}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {mostrarPDF ? "Cerrar PDF costos" : "PDF costos (interno)"}
              </button>

              {mostrarPrecioCliente && clienteTotalMXN > 0 && (
                <button
                  onClick={() => setMostrarPDFCliente((v) => !v)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400/50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {mostrarPDFCliente ? "Cerrar PDF cliente" : "PDF cotizacion cliente"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── PDF Viewer (full width below grid) ───────────────────────── */}
        {mostrarPDF && tc && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-300">Vista previa del PDF</span>
              <button
                onClick={() => setMostrarPDF(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PDFViewerWrapper
              nombreCotizacion={nombreCotizacion}
              cantidad={cantidadNum}
              potencia={potenciaNum}
              precioPorWatt={precioNum}
              fletePaneles={fletePanelesNum}
              garantiaPaneles={garantiaPanelesNum}
              precioMicroinversor={precioMicroNum}
              precioCable={precioCableNum}
              precioECU={precioECUNum}
              incluyeECU={incluyeECU}
              precioHerramienta={precioHerramientaNum}
              incluyeHerramienta={incluyeHerramienta}
              fleteMicros={fleteMicrosNum}
              aluminio={aluminio}
              fleteAluminio={fleteAluminioNum}
              tornilleria={tornilleria}
              generales={generales}
              tc={tc}
            />
          </div>
        )}

        {/* ── PDF Cliente Viewer ─────────────────────────────────────── */}
        {mostrarPDFCliente && mostrarPrecioCliente && clienteTotalMXN > 0 && (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <span className="text-sm font-medium text-emerald-400">PDF Cotizacion al Cliente</span>
              <button
                onClick={() => setMostrarPDFCliente(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PDFViewerClienteWrapper
              nombreCotizacion={nombreCotizacion}
              clienteNombre={reciboCFE?.nombre || ""}
              cantidadPaneles={cantidadNum}
              potenciaW={potenciaNum}
              kWp={cantidadNum * potenciaNum / 1000}
              generacionMensualKwh={cantidadNum * potenciaNum / 1000 * 132}
              partidas={{
                paneles: clientePanelesMXN * 1.16,
                inversores: clienteInversoresMXN * 1.16,
                estructura: clienteEstructuraMXN * 1.16,
                tornilleria: clienteTornilleriaMXN * 1.16,
                generales: clienteGeneralesMXN * 1.16,
                montoFijo: utilidad.montoFijo * 1.16,
              }}
              subtotal={clienteSubtotalMXN}
              iva={clienteIvaMXN}
              total={clienteTotalMXN}
              porPanel={clientePorPanel}
              porWatt={clientePorWatt}
              vigenciaDias={15}
              notas=""
            />
          </div>
        )}
        {/* ── Comparador de variantes ──────────────────────────────── */}
        {mostrarComparador && variantes.length >= 2 && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-300">Comparador de variantes</span>
              <button
                onClick={() => setMostrarComparador(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium w-36">Concepto</th>
                    {variantes.map((v) => (
                      <th key={v.id} className="text-right px-4 py-3 text-zinc-300 font-semibold min-w-[140px]">
                        {v.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Config de utilidad */}
                  <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                    <td className="px-4 py-2 text-zinc-500">Utilidad</td>
                    {variantes.map((v) => (
                      <td key={v.id} className="px-4 py-2 text-right text-zinc-400 font-mono">
                        {v.utilidad.tipo === "global" ? `${v.utilidad.globalPct}%` : "por partida"}
                        {v.utilidad.montoFijo > 0 && ` +$${fmt(v.utilidad.montoFijo)}`}
                      </td>
                    ))}
                  </tr>
                  {/* Partidas */}
                  {[
                    ["Paneles", (v: CotizacionCliente) => v.precios.paneles],
                    ["Inversores", (v: CotizacionCliente) => v.precios.inversores],
                    ["Estructura", (v: CotizacionCliente) => v.precios.estructura],
                    ["Tornillería", (v: CotizacionCliente) => v.precios.tornilleria],
                    ["Generales", (v: CotizacionCliente) => v.precios.generales],
                  ].map(([label, getter]) => {
                    const fn = getter as (v: CotizacionCliente) => number;
                    const anyNonZero = variantes.some((v) => fn(v) > 0);
                    if (!anyNonZero) return null;
                    return (
                      <tr key={label as string} className="border-b border-zinc-800/50">
                        <td className="px-4 py-2 text-zinc-500">{label as string}</td>
                        {variantes.map((v) => (
                          <td key={v.id} className="px-4 py-2 text-right text-zinc-300 font-mono">
                            ${fmt(fn(v))}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Subtotal */}
                  <tr className="border-b border-zinc-800 bg-zinc-800/20">
                    <td className="px-4 py-2 text-zinc-400 font-medium">Subtotal</td>
                    {variantes.map((v) => (
                      <td key={v.id} className="px-4 py-2 text-right text-zinc-300 font-mono font-medium">
                        ${fmt(v.precios.subtotal)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-zinc-800/50">
                    <td className="px-4 py-2 text-zinc-500">IVA 16%</td>
                    {variantes.map((v) => (
                      <td key={v.id} className="px-4 py-2 text-right text-zinc-400 font-mono">
                        ${fmt(v.precios.iva)}
                      </td>
                    ))}
                  </tr>
                  {/* Total */}
                  <tr className="border-b border-zinc-700 bg-emerald-400/5">
                    <td className="px-4 py-3 text-emerald-400 font-semibold">Total cliente</td>
                    {variantes.map((v) => {
                      const isMin = v.precios.total === Math.min(...variantes.map((x) => x.precios.total));
                      return (
                        <td key={v.id} className={`px-4 py-3 text-right font-mono font-bold text-lg ${isMin ? "text-emerald-400" : "text-zinc-300"}`}>
                          ${fmt(v.precios.total)}
                          {isMin && <span className="block text-[10px] font-normal text-emerald-400/60">mejor precio</span>}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Métricas */}
                  <tr className="border-b border-zinc-800/50">
                    <td className="px-4 py-2 text-zinc-500">Precio / panel</td>
                    {variantes.map((v) => (
                      <td key={v.id} className="px-4 py-2 text-right text-emerald-300 font-mono font-medium">
                        ${fmt(v.precios.porPanel)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-zinc-800/50">
                    <td className="px-4 py-2 text-zinc-500">Precio / Watt</td>
                    {variantes.map((v) => (
                      <td key={v.id} className="px-4 py-2 text-right text-emerald-300 font-mono">
                        ${fmt(v.precios.porWatt)}
                      </td>
                    ))}
                  </tr>
                  {/* Utilidad */}
                  <tr className="bg-amber-400/5">
                    <td className="px-4 py-3 text-amber-400 font-semibold">Utilidad neta</td>
                    {variantes.map((v) => {
                      const isMax = v.precios.utilidadNeta === Math.max(...variantes.map((x) => x.precios.utilidadNeta));
                      return (
                        <td key={v.id} className={`px-4 py-3 text-right font-mono font-bold text-lg ${isMax ? "text-amber-400" : "text-zinc-300"}`}>
                          ${fmt(v.precios.utilidadNeta)}
                          <span className="block text-[10px] font-normal text-zinc-500">{v.precios.utilidadPct.toFixed(1)}%</span>
                          {isMax && <span className="block text-[10px] font-normal text-amber-400/60">mayor utilidad</span>}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Modal: Picker paneles ────────────────────────────────────────── */}
      {pickerPanel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setPickerPanel(false)}>
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Seleccionar panel del catálogo</h2>
              <button onClick={() => setPickerPanel(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {catalogoPaneles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-600 text-sm">
                  <p>No hay paneles en el catálogo</p>
                  <a href="/catalogo" className="mt-2 text-xs text-amber-400 hover:text-amber-300">Ir al catálogo →</a>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {catalogoPaneles.map((p) => (
                    <button key={p.id} onClick={() => seleccionarPanel(p)} className="w-full flex items-start justify-between px-5 py-3.5 hover:bg-zinc-800/60 transition-colors text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-100">{p.marca} — {p.modelo}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{p.potencia}W · {fmtUSD3(p.precioPorWatt)}/W</p>
                        <div className="flex items-center gap-2 mt-1">
                          {p.totalOfertas && p.totalOfertas > 0 && (
                            <span className="text-[10px] text-zinc-600">
                              {p.totalOfertas} {p.totalOfertas === 1 ? "cotización" : "cotizaciones"}
                            </span>
                          )}
                          {p.fechaActualizacion && (
                            <span className="text-[10px] text-zinc-600">
                              · act. {p.fechaActualizacion}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-amber-400 font-mono shrink-0 ml-3">{fmtUSD(p.potencia * p.precioPorWatt)}/panel</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Picker micros ──────────────────────────────────────────── */}
      {pickerMicro && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setPickerMicro(false)}>
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Seleccionar microinversor del catálogo</h2>
              <button onClick={() => setPickerMicro(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {catalogoMicros.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-600 text-sm">
                  <p>No hay microinversores en el catálogo</p>
                  <a href="/catalogo" className="mt-2 text-xs text-amber-400 hover:text-amber-300">Ir al catálogo →</a>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {catalogoMicros.map((m) => (
                    <button key={m.id} onClick={() => seleccionarMicro(m)} className="w-full flex items-start justify-between px-5 py-3.5 hover:bg-zinc-800/60 transition-colors text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-100">{m.marca} — {m.modelo}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {m.panelesPorUnidad ?? 4} panel{(m.panelesPorUnidad ?? 4) !== 1 ? "es" : ""}/micro
                          {m.precioCable > 0 && ` · cable ${fmtUSD(m.precioCable)}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {m.totalOfertas && m.totalOfertas > 0 && (
                            <span className="text-[10px] text-zinc-600">
                              {m.totalOfertas} {m.totalOfertas === 1 ? "cotización" : "cotizaciones"}
                            </span>
                          )}
                          {m.fechaActualizacion && (
                            <span className="text-[10px] text-zinc-600">
                              · act. {m.fechaActualizacion}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-amber-400 font-mono shrink-0 ml-3">{fmtUSD(m.precio)} USD</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Mis cotizaciones ──────────────────────────────────────── */}
      {mostrarGuardadas && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setMostrarGuardadas(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Mis cotizaciones</h2>
              <button
                onClick={() => setMostrarGuardadas(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {cotizacionesGuardadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                  <svg className="w-8 h-8 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No hay cotizaciones guardadas</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {cotizacionesGuardadas.map((c) => (
                    <div
                      key={c.nombre}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/60 transition-colors"
                    >
                      <button
                        onClick={() => handleCargar(c.nombre)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium text-zinc-100 truncate">{c.nombre}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{c.fecha}</p>
                      </button>
                      <button
                        onClick={() => handleEliminar(c.nombre)}
                        className="shrink-0 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-600 text-center">
                Haz clic en una cotización para cargarla
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
