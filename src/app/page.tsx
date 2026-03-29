"use client";

import { useState, useEffect } from "react";
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
} from "./lib/storage";
import type {
  CotizacionData,
  CotizacionGuardada,
  LineItem,
  TipoCambioData,
  CatalogoPanel,
  CatalogoMicro,
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
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0">
      <span className="text-xs font-medium text-zinc-400 tracking-wide uppercase">{label}</span>
      <span className="text-sm font-semibold text-zinc-100 font-mono">${fmt(value)}</span>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [cantidad, setCantidad] = useState("");
  const [potencia, setPotencia] = useState("");
  const [precioPorWatt, setPrecioPorWatt] = useState("");
  const [fletePaneles, setFletePaneles] = useState("100");
  const [garantiaPaneles, setGarantiaPaneles] = useState("20");
  const [precioMicroinversor, setPrecioMicroinversor] = useState("");
  const [precioCable, setPrecioCable] = useState("");
  const [precioECU, setPrecioECU] = useState("");
  const [incluyeECU, setIncluyeECU] = useState(false);
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

  const tcVal = tc?.tipoCambio || 0;

  const totalPanelesUSD = costoPanelesUSD + fletePanelesNum + garantiaPanelesNum;
  const partidaPanelesMXN = totalPanelesUSD * tcVal;

  const totalInversoresUSD =
    costoMicrosUSD + costoCablesUSD + costoECUUSD + costoHerramientaUSD + fleteMicrosNum;
  const partidaInversoresMXN = totalInversoresUSD * tcVal;

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

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((d) => (d.error ? setTcError(d.error) : setTc(d)))
      .catch(() => setTcError("No se pudo obtener el tipo de cambio"));
  }, []);

  useEffect(() => {
    setCotizacionesGuardadas(listarCotizaciones());
    setCatalogoPaneles(listarCatalogoPaneles());
    setCatalogoMicros(listarCatalogoMicros());
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getFormData = (): CotizacionData => ({
    nombre: nombreCotizacion,
    fecha: new Date().toISOString(),
    cantidad, potencia, precioPorWatt, fletePaneles, garantiaPaneles,
    precioMicroinversor, precioCable, precioECU, incluyeECU,
    precioHerramienta, incluyeHerramienta, fleteMicros,
    aluminio, fleteAluminio, tornilleria, generales,
  });

  const handleGuardar = () => {
    if (!nombreCotizacion.trim()) { setMsgGuardado("err"); setTimeout(() => setMsgGuardado(""), 2500); return; }
    guardarCotizacion(getFormData());
    setCotizacionesGuardadas(listarCotizaciones());
    setMsgGuardado("ok");
    setTimeout(() => setMsgGuardado(""), 2500);
  };

  const handleCargar = (nombre: string) => {
    const data = cargarCotizacion(nombre);
    if (!data) return;
    setNombreCotizacion(data.nombre);
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
    setMostrarGuardadas(false);
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
                    {panelSeleccionado.potencia}W · ${fmtUSD(panelSeleccionado.precioPorWatt)}/W
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                <Field label="Servicio de logística (Flete)">
                  <NumInput value={fletePaneles} onChange={setFletePaneles} step={0.01} />
                </Field>
                <Field label="Garantía contra daños de mercancía">
                  <NumInput value={garantiaPaneles} onChange={setGarantiaPaneles} step={0.01} />
                </Field>
              </div>

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
                  {fletePanelesNum > 0 && (
                    <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                      <span className="text-xs text-zinc-300">Servicio de logística (Flete)</span>
                      <span className="text-xs text-center text-zinc-400 font-mono">—</span>
                      <span className="text-xs text-right text-zinc-400 font-mono"></span>
                      <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(fletePanelesNum)}</span>
                    </div>
                  )}

                  {/* Garantía */}
                  {garantiaPanelesNum > 0 && (
                    <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                      <span className="text-xs text-zinc-300">Garantía contra daños de mercancía</span>
                      <span className="text-xs text-center text-zinc-400 font-mono">—</span>
                      <span className="text-xs text-right text-zinc-400 font-mono"></span>
                      <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(garantiaPanelesNum)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
                    <span className="text-xs text-zinc-500">
                      {cantidadNum} × {potenciaNum}W × ${fmtUSD(precioNum)}/W
                    </span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">
                      ${fmtUSD(totalPanelesUSD)} USD
                    </span>
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
                  {fleteMicrosNum > 0 && (
                    <div className="grid grid-cols-[1fr_56px_90px_90px] gap-2 px-4 py-2.5 border-t border-zinc-800/60 items-center">
                      <span className="text-xs text-zinc-300">Flete</span>
                      <span className="text-xs text-center text-zinc-400 font-mono">—</span>
                      <span className="text-xs text-right text-zinc-400 font-mono"></span>
                      <span className="text-xs text-right text-zinc-200 font-mono font-medium">${fmtUSD(fleteMicrosNum)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
                    <span className="text-xs text-zinc-500">
                      {cantidadNum} paneles ÷ {panelesPorMicro} = {cantidadMicros} micros
                    </span>
                    <span className="text-sm font-semibold text-amber-400 font-mono">
                      ${fmtUSD(totalInversoresUSD)} USD
                    </span>
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
                      <NumInput value={precioECU} onChange={setPrecioECU} placeholder="Ej: 95.00" step={0.01} />
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

              <div className="border-t border-zinc-800 pt-4">
                <Field label="Flete microinversores (USD)">
                  <NumInput value={fleteMicros} onChange={setFleteMicros} step={0.01} />
                </Field>
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
            </SectionCard>

            {/* 4. TORNILLERIA */}
            <SectionCard num="4" title="Tornillería" badge="MXN sin IVA">
              <LineItemTable
                items={tornilleria}
                onChange={updateTornilleria}
                currency="MXN"
              />
            </SectionCard>

            {/* 5. GENERALES */}
            <SectionCard num="5" title="Generales" badge="MXN sin IVA">
              <LineItemTable
                items={generales}
                onChange={updateGeneral}
                currency="MXN"
              />
            </SectionCard>
          </div>

          {/* ── RIGHT: Sticky sidebar ─────────────────────────────────────── */}
          <div className="lg:sticky lg:top-20 h-fit space-y-4">

            {/* Tipo de cambio */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              {tc ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                      Tipo de cambio DOF
                    </span>
                    <span className="text-xs text-zinc-600">{tc.fecha}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-zinc-100 font-mono">
                      ${fmt(tc.tipoCambio)}
                    </span>
                    <span className="text-sm text-zinc-500 mb-0.5">MXN/USD</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">{tc.fuente}</p>
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
              </div>
            )}

            {/* PDF Button */}
            <button
              onClick={() => setMostrarPDF((v) => !v)}
              disabled={!tc}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {mostrarPDF ? "Cerrar PDF" : "Ver PDF"}
            </button>
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
                    <button key={p.id} onClick={() => seleccionarPanel(p)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/60 transition-colors text-left">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{p.marca} — {p.modelo}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{p.potencia}W · ${fmtUSD(p.precioPorWatt)}/W</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-400 font-mono shrink-0 ml-3">${fmtUSD(p.potencia * p.precioPorWatt)}/panel</span>
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
                    <button key={m.id} onClick={() => seleccionarMicro(m)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/60 transition-colors text-left">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{m.marca} — {m.modelo}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {m.panelesPorUnidad ?? 4} panel{(m.panelesPorUnidad ?? 4) !== 1 ? "es" : ""}/micro
                          {m.precioCable > 0 && ` · cable $${fmtUSD(m.precioCable)}`}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-amber-400 font-mono shrink-0 ml-3">${fmtUSD(m.precio)} USD</span>
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
