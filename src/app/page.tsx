"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { guardarCotizacion, cargarCotizacion, listarCotizaciones, eliminarCotizacion } from "./lib/storage";
import type { CotizacionData, CotizacionGuardada, LineItem, TipoCambioData } from "./lib/types";

const PDFViewerWrapper = dynamic(() => import("./components/PDFViewerWrapper"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-zinc-400">Cargando visor PDF...</div>,
});

type GeneralItem = LineItem;
type AluminioItem = LineItem;

const aluminioDefault: AluminioItem[] = [
  { nombre: "Angulo - 1 1/2 X 1 1/2 X 0.1875\" (3/16)", cantidad: "3", precioUnitario: "700.94", unidad: "Pza" },
  { nombre: "Unicanal - PARA PANEL SOLAR GRANDE", cantidad: "3", precioUnitario: "839.34", unidad: "Pza" },
  { nombre: "Clip - PARA PANEL SOLAR", cantidad: "27", precioUnitario: "41.58", unidad: "Pza" },
];

const tornilleriaDefault = [
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
  const [tornilleria, setTornilleria] = useState(tornilleriaDefault);
  const [generales, setGenerales] = useState<GeneralItem[]>(generalesDefault);
  const [tc, setTc] = useState<TipoCambioData | null>(null);
  const [tcError, setTcError] = useState("");
  // Guardar / Cargar / PDF
  const [nombreCotizacion, setNombreCotizacion] = useState("");
  const [cotizacionesGuardadas, setCotizacionesGuardadas] = useState<CotizacionGuardada[]>([]);
  const [mostrarGuardadas, setMostrarGuardadas] = useState(false);
  const [mostrarPDF, setMostrarPDF] = useState(false);
  const [msgGuardado, setMsgGuardado] = useState("");

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

  // Paneles
  const costoPanel = potenciaNum * precioNum;
  const costoPanelesUSD = costoPanel * cantidadNum;
  const costoFletePanelesUSD = fletePanelesNum;
  const costoGarantiaPanelesUSD = garantiaPanelesNum;

  // Microinversores: 1 DS3D = 4 paneles
  const panelesPorMicro = 4;
  const cantidadMicros = cantidadNum > 0 ? Math.ceil(cantidadNum / panelesPorMicro) : 0;
  const costoMicrosUSD = cantidadMicros * precioMicroNum;
  const costoCablesUSD = cantidadMicros * precioCableNum;
  const costoECUUSD = incluyeECU ? precioECUNum : 0;
  const costoHerramientaUSD = incluyeHerramienta ? precioHerramientaNum : 0;
  const costoFleteMicrosUSD = fleteMicrosNum;

  // Aluminio (MXN, sin IVA excepto flete que ya incluye IVA)
  const costoAluminioMXN = aluminio.reduce((sum, item) => {
    const qty = Number(item.cantidad) || 0;
    const price = Number(item.precioUnitario) || 0;
    return sum + qty * price;
  }, 0);
  const fleteAluminioNum = Number(fleteAluminio) || 0;
  // El flete de aluminio ya incluye IVA, así que lo separamos para no cobrar IVA doble
  const fleteAluminioSinIVA = fleteAluminioNum / 1.16;

  // Tornilleria (MXN subtotal)
  const costoTornilleriaMXN = tornilleria.reduce((sum, item) => {
    const qty = Number(item.cantidad) || 0;
    const price = Number(item.precioUnitario) || 0;
    return sum + qty * price;
  }, 0);

  // Generales (MXN)
  const costoGeneralesMXN = generales.reduce((sum, item) => {
    const qty = Number(item.cantidad) || 0;
    const price = Number(item.precioUnitario) || 0;
    return sum + qty * price;
  }, 0);

  // --- Partidas en MXN ---
  const tcVal = tc?.tipoCambio || 0;

  // 1. PANELES (USD → MXN)
  const totalPanelesUSD = costoPanelesUSD + costoFletePanelesUSD + costoGarantiaPanelesUSD;
  const partidaPanelesMXN = totalPanelesUSD * tcVal;

  // 2. INVERSORES (USD → MXN)
  const totalInversoresUSD = costoMicrosUSD + costoCablesUSD + costoECUUSD + costoHerramientaUSD + costoFleteMicrosUSD;
  const partidaInversoresMXN = totalInversoresUSD * tcVal;

  // 3. ESTRUCTURA (aluminio MXN + flete con IVA incluido)
  const partidaEstructuraMXN = costoAluminioMXN + fleteAluminioSinIVA;

  // 4. TORNILLERÍA (MXN)
  const partidaTornilleriaMXN = costoTornilleriaMXN;

  // 5. GENERALES (MXN)
  const partidaGeneralesMXN = costoGeneralesMXN;

  // Totales
  const subtotalMXN = partidaPanelesMXN + partidaInversoresMXN + partidaEstructuraMXN + partidaTornilleriaMXN + partidaGeneralesMXN;
  const ivaMXN = subtotalMXN * 0.16;
  const totalMXN = subtotalMXN + ivaMXN;

  useEffect(() => {
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setTcError(data.error);
        } else {
          setTc(data);
        }
      })
      .catch(() => setTcError("No se pudo obtener el tipo de cambio"));
  }, []);

  useEffect(() => {
    setCotizacionesGuardadas(listarCotizaciones());
  }, []);

  const getFormData = (): CotizacionData => ({
    nombre: nombreCotizacion,
    fecha: new Date().toISOString(),
    cantidad, potencia, precioPorWatt, fletePaneles, garantiaPaneles,
    precioMicroinversor, precioCable, precioECU, incluyeECU,
    precioHerramienta, incluyeHerramienta, fleteMicros,
    aluminio, fleteAluminio, tornilleria, generales,
  });

  const handleGuardar = () => {
    if (!nombreCotizacion.trim()) return;
    guardarCotizacion(getFormData());
    setCotizacionesGuardadas(listarCotizaciones());
    setMsgGuardado("Guardado");
    setTimeout(() => setMsgGuardado(""), 2000);
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

  const updateTornilleria = (index: number, field: string, value: string) => {
    setTornilleria((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const updateAluminio = (index: number, field: keyof AluminioItem, value: string) => {
    setAluminio((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const updateGeneral = (index: number, field: keyof GeneralItem, value: string) => {
    setGenerales((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const inputClass =
    "mt-2 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-lg text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";
  const inputSmClass =
    "w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";
  const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";
  const rowClass = "flex justify-between text-sm text-zinc-600 dark:text-zinc-400";
  const valClass = "font-medium text-zinc-900 dark:text-zinc-50";

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex flex-1 w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-12">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Cotizador de Paneles
        </h1>

        {/* Guardar / Cargar / PDF */}
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={nombreCotizacion}
              onChange={(e) => setNombreCotizacion(e.target.value)}
              placeholder="Nombre de la cotizacion..."
              className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <button
              onClick={handleGuardar}
              disabled={!nombreCotizacion.trim()}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>
          {msgGuardado && (
            <p className="text-xs text-green-600 dark:text-green-400">{msgGuardado}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarGuardadas(!mostrarGuardadas)}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {mostrarGuardadas ? "Ocultar" : "Cargar cotizacion"}
            </button>
            <button
              onClick={() => setMostrarPDF(!mostrarPDF)}
              disabled={!tc}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {mostrarPDF ? "Ocultar PDF" : "Ver PDF"}
            </button>
          </div>

          {mostrarGuardadas && (
            <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              {cotizacionesGuardadas.length === 0 ? (
                <p className="text-xs text-zinc-400">No hay cotizaciones guardadas</p>
              ) : (
                cotizacionesGuardadas.map((c) => (
                  <div key={c.nombre} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                    <button
                      onClick={() => handleCargar(c.nombre)}
                      className="text-left flex-1"
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{c.nombre}</span>
                      <span className="block text-xs text-zinc-400">{c.fecha}</span>
                    </button>
                    <button
                      onClick={() => handleEliminar(c.nombre)}
                      className="ml-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Visor PDF */}
        {mostrarPDF && tc && (
          <div className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
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

        {/* Tipo de cambio */}
        <div className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          {tc ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Tipo de cambio</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  ${fmt(tc.tipoCambio)} MXN/USD
                </span>
              </div>
              <div className="flex justify-between mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                <span>{tc.fuente}</span>
                <span>{tc.fecha}</span>
              </div>
            </div>
          ) : tcError ? (
            <p className="text-sm text-red-500">{tcError}</p>
          ) : (
            <p className="text-sm text-zinc-400">Cargando tipo de cambio...</p>
          )}
        </div>

        {/* Paneles */}
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Paneles
          </h2>

          <div>
            <label htmlFor="cantidad" className={labelClass}>Cantidad de paneles</label>
            <input id="cantidad" type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="potencia" className={labelClass}>Potencia por panel (watts)</label>
            <input id="potencia" type="number" min={0} value={potencia} onChange={(e) => setPotencia(e.target.value)} placeholder="Ej: 550" className={inputClass} />
          </div>

          <div>
            <label htmlFor="precioPorWatt" className={labelClass}>Precio por watt (USD sin IVA)</label>
            <input id="precioPorWatt" type="number" min={0} step={0.01} value={precioPorWatt} onChange={(e) => setPrecioPorWatt(e.target.value)} placeholder="Ej: 0.18" className={inputClass} />
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <label htmlFor="fletePaneles" className={labelClass}>Servicio de logistica (Flete) — USD sin IVA</label>
            <input id="fletePaneles" type="number" min={0} step={0.01} value={fletePaneles} onChange={(e) => setFletePaneles(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="garantiaPaneles" className={labelClass}>Servicio de garantia contra daños de mercancia — USD sin IVA</label>
            <input id="garantiaPaneles" type="number" min={0} step={0.01} value={garantiaPaneles} onChange={(e) => setGarantiaPaneles(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Microinversores y accesorios */}
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Microinversor — APsystems DS3D
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            1 microinversor por cada {panelesPorMicro} paneles
          </p>

          <div>
            <label htmlFor="precioMicro" className={labelClass}>Precio por microinversor (USD sin IVA)</label>
            <input id="precioMicro" type="number" min={0} step={0.01} value={precioMicroinversor} onChange={(e) => setPrecioMicroinversor(e.target.value)} placeholder="Ej: 180.00" className={inputClass} />
          </div>

          <div>
            <label htmlFor="precioCable" className={labelClass}>Cable troncal APS por unidad (USD sin IVA)</label>
            <input id="precioCable" type="number" min={0} step={0.01} value={precioCable} onChange={(e) => setPrecioCable(e.target.value)} placeholder="Ej: 25.00" className={inputClass} />
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">1 cable por cada microinversor</p>
          </div>

          {/* ECU-R */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={incluyeECU} onChange={(e) => setIncluyeECU(e.target.checked)} className="h-5 w-5 rounded border-zinc-300 text-blue-500 focus:ring-blue-500 dark:border-zinc-600" />
              <span className={labelClass}>ECU-R — Sistema de monitoreo</span>
            </label>
            {incluyeECU && (
              <div className="mt-3">
                <label htmlFor="precioECU" className={labelClass}>Precio ECU-R (USD sin IVA)</label>
                <input id="precioECU" type="number" min={0} step={0.01} value={precioECU} onChange={(e) => setPrecioECU(e.target.value)} placeholder="Ej: 95.00" className={inputClass} />
              </div>
            )}
          </div>

          {/* Herramienta desconectora */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={incluyeHerramienta} onChange={(e) => setIncluyeHerramienta(e.target.checked)} className="h-5 w-5 rounded border-zinc-300 text-blue-500 focus:ring-blue-500 dark:border-zinc-600" />
              <div>
                <span className={labelClass}>Herramienta desconectora APS</span>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Opcional — no se requiere en cada instalacion</p>
              </div>
            </label>
            {incluyeHerramienta && (
              <div className="mt-3">
                <label htmlFor="precioHerramienta" className={labelClass}>Precio herramienta (USD sin IVA)</label>
                <input id="precioHerramienta" type="number" min={0} step={0.01} value={precioHerramienta} onChange={(e) => setPrecioHerramienta(e.target.value)} placeholder="Ej: 35.00" className={inputClass} />
              </div>
            )}
          </div>

          {/* Flete microinversores */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <label htmlFor="fleteMicros" className={labelClass}>Flete microinversores (USD sin IVA)</label>
            <input id="fleteMicros" type="number" min={0} step={0.01} value={fleteMicros} onChange={(e) => setFleteMicros(e.target.value)} className={inputClass} />
          </div>

          {/* Resumen microinversores */}
          {cantidadNum > 0 && precioMicroNum > 0 && (
            <div className="rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Microinversores necesarios</span>
                <span className={valClass}>{cantidadMicros}</span>
              </div>
              <div className="flex justify-between">
                <span>Cables troncales</span>
                <span className={valClass}>{cantidadMicros}</span>
              </div>
            </div>
          )}
        </div>

        {/* Estructura */}
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Estructura
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Precios en MXN (subtotal)
          </p>

          <div className="space-y-3">
            {aluminio.map((item, i) => {
              const subtotal = (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0);
              return (
                <div key={i} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {item.nombre}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{item.unidad}</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-24">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Cant.</label>
                      <input
                        type="number"
                        min={0}
                        value={item.cantidad}
                        onChange={(e) => updateAluminio(i, "cantidad", e.target.value)}
                        className={inputSmClass}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Precio unit. MXN</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.precioUnitario}
                        onChange={(e) => updateAluminio(i, "precioUnitario", e.target.value)}
                        className={inputSmClass}
                      />
                    </div>
                    <div className="w-28 flex flex-col justify-end">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Subtotal</label>
                      <div className="py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50 text-right">
                        ${fmt(subtotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <label htmlFor="fleteAluminio" className={labelClass}>
              Flete
              <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">(MXN con IVA incluido)</span>
            </label>
            <input id="fleteAluminio" type="number" min={0} step={0.01} value={fleteAluminio} onChange={(e) => setFleteAluminio(e.target.value)} className={inputClass} />
          </div>

          <div className="flex justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50 border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span>Total estructura</span>
            <span>${fmt(costoAluminioMXN + fleteAluminioNum)} MXN</span>
          </div>
        </div>

        {/* Tornilleria */}
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Tornilleria
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Precios en MXN (subtotal)
          </p>

          <div className="space-y-3">
            {tornilleria.map((item, i) => {
              const subtotal = (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0);
              return (
                <div key={i} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {item.nombre}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{item.unidad}</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-24">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Cant.</label>
                      <input
                        type="number"
                        min={0}
                        value={item.cantidad}
                        onChange={(e) => updateTornilleria(i, "cantidad", e.target.value)}
                        className={inputSmClass}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Precio unit. MXN</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.precioUnitario}
                        onChange={(e) => updateTornilleria(i, "precioUnitario", e.target.value)}
                        className={inputSmClass}
                      />
                    </div>
                    <div className="w-28 flex flex-col justify-end">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Subtotal</label>
                      <div className="py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50 text-right">
                        ${fmt(subtotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50 border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span>Total tornilleria</span>
            <span>${fmt(costoTornilleriaMXN)} MXN</span>
          </div>
        </div>

        {/* Generales */}
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Generales
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Precios en MXN
          </p>

          <div className="space-y-3">
            {generales.map((item, i) => {
              const subtotal = (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0);
              return (
                <div key={i} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {item.nombre}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{item.unidad}</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-24">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Cant.</label>
                      <input
                        type="number"
                        min={0}
                        value={item.cantidad}
                        onChange={(e) => updateGeneral(i, "cantidad", e.target.value)}
                        className={inputSmClass}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Precio unit. MXN</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.precioUnitario}
                        onChange={(e) => updateGeneral(i, "precioUnitario", e.target.value)}
                        className={inputSmClass}
                      />
                    </div>
                    <div className="w-28 flex flex-col justify-end">
                      <label className="text-xs text-zinc-400 dark:text-zinc-500">Subtotal</label>
                      <div className="py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50 text-right">
                        ${fmt(subtotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50 border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <span>Total generales</span>
            <span>${fmt(costoGeneralesMXN)} MXN</span>
          </div>
        </div>

        {/* Resumen por partidas */}
        {tc && subtotalMXN > 0 && (
          <div className="w-full rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950 space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Resumen
            </h2>

            {partidaPanelesMXN > 0 && (
              <div className={rowClass}>
                <span className="font-medium">PANELES</span>
                <span className={valClass}>${fmt(partidaPanelesMXN)}</span>
              </div>
            )}

            {partidaInversoresMXN > 0 && (
              <div className={rowClass}>
                <span className="font-medium">INVERSORES</span>
                <span className={valClass}>${fmt(partidaInversoresMXN)}</span>
              </div>
            )}

            {partidaEstructuraMXN > 0 && (
              <div className={rowClass}>
                <span className="font-medium">ESTRUCTURA</span>
                <span className={valClass}>${fmt(partidaEstructuraMXN)}</span>
              </div>
            )}

            {partidaTornilleriaMXN > 0 && (
              <div className={rowClass}>
                <span className="font-medium">TORNILLERIA</span>
                <span className={valClass}>${fmt(partidaTornilleriaMXN)}</span>
              </div>
            )}

            {partidaGeneralesMXN > 0 && (
              <div className={rowClass}>
                <span className="font-medium">GENERALES</span>
                <span className={valClass}>${fmt(partidaGeneralesMXN)}</span>
              </div>
            )}

            <div className="border-t border-blue-200 dark:border-blue-800 pt-3 space-y-1">
              <div className={rowClass}>
                <span>Subtotal</span>
                <span className={valClass}>${fmt(subtotalMXN)}</span>
              </div>
              <div className={rowClass}>
                <span>IVA (16%)</span>
                <span className={valClass}>${fmt(ivaMXN)}</span>
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold text-zinc-900 dark:text-zinc-50 border-t border-blue-200 dark:border-blue-800 pt-3">
              <span>Total</span>
              <span>${fmt(totalMXN)} MXN</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
