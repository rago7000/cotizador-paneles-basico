"use client";

import { useState, useCallback, type KeyboardEvent } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Etapa =
  | "prospecto"
  | "cotizado"
  | "negociacion"
  | "cerrado_ganado"
  | "cerrado_perdido"
  | "instalado"
  | "";

type Origen =
  | "referido"
  | "facebook"
  | "instagram"
  | "google"
  | "tiktok"
  | "sitio_web"
  | "volanteo"
  | "feria"
  | "otro"
  | "";

export interface PanelClienteProps {
  clienteTelefono: string;
  clienteEmail: string;
  clienteUbicacion: string;
  clienteNotas: string;
  etapa: Etapa;
  etapaNotas: string;
  fechaCierre: string;
  fechaInstalacion: string;
  probabilidadCierre: number;
  origen: Origen;
  origenDetalle: string;
  tags: string[];
  nombreCliente: string;
  onChange: (field: string, value: string | number | string[]) => void;
}

// ── Pipeline stages ───────────────────────────────────────────────────────────

const ETAPAS: { key: Etapa; label: string; color: string; activeBg: string; activeBorder: string }[] = [
  { key: "prospecto",       label: "Prospecto",       color: "text-zinc-400",    activeBg: "bg-zinc-600",      activeBorder: "border-zinc-500" },
  { key: "cotizado",        label: "Cotizado",        color: "text-blue-400",    activeBg: "bg-blue-600/70",   activeBorder: "border-blue-500" },
  { key: "negociacion",     label: "Negociaci\u00f3n",     color: "text-amber-400",   activeBg: "bg-amber-600/70",  activeBorder: "border-amber-500" },
  { key: "cerrado_ganado",  label: "Ganado",          color: "text-emerald-400", activeBg: "bg-emerald-600/70",activeBorder: "border-emerald-500" },
  { key: "cerrado_perdido", label: "Perdido",         color: "text-red-400",     activeBg: "bg-red-600/70",    activeBorder: "border-red-500" },
  { key: "instalado",       label: "Instalado",       color: "text-green-400",   activeBg: "bg-green-600/70",  activeBorder: "border-green-500" },
];

const ORIGENES: { value: Origen; label: string }[] = [
  { value: "",          label: "Sin definir" },
  { value: "referido",  label: "Referido" },
  { value: "facebook",  label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google",    label: "Google" },
  { value: "tiktok",    label: "TikTok" },
  { value: "sitio_web", label: "Sitio web" },
  { value: "volanteo",  label: "Volanteo" },
  { value: "feria",     label: "Feria" },
  { value: "otro",      label: "Otro" },
];

const ORIGEN_PLACEHOLDERS: Record<string, string> = {
  referido:  "\u00bfQui\u00e9n te refiri\u00f3?",
  facebook:  "Nombre de campa\u00f1a o publicaci\u00f3n",
  instagram: "Nombre de campa\u00f1a o publicaci\u00f3n",
  google:    "Palabra clave o campa\u00f1a",
  tiktok:    "Video o campa\u00f1a",
  sitio_web: "P\u00e1gina de aterrizaje",
  volanteo:  "Zona o evento",
  feria:     "Nombre de la feria",
  otro:      "Especifica el origen",
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20";

const labelCls = "block text-[10px] font-medium text-zinc-500 mb-1 uppercase tracking-wider";

// ── Helpers ───────────────────────────────────────────────────────────────────

function etapaBadge(etapa: Etapa) {
  const found = ETAPAS.find((e) => e.key === etapa);
  if (!found) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${found.activeBg} ${found.activeBorder} ${found.color}`}
    >
      {found.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PanelCliente(props: PanelClienteProps) {
  const {
    clienteTelefono, clienteEmail, clienteUbicacion, clienteNotas,
    etapa, etapaNotas, fechaCierre, fechaInstalacion, probabilidadCierre,
    origen, origenDetalle, tags, nombreCliente, onChange,
  } = props;

  const [collapsed, setCollapsed] = useState(true);
  const [tagInput, setTagInput] = useState("");

  const handleTagKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = tagInput.trim();
        if (val && !tags.includes(val)) {
          onChange("tags", [...tags, val]);
        }
        setTagInput("");
      }
    },
    [tagInput, tags, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange("tags", tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  // Current etapa index for the pipeline visualization
  const currentIdx = ETAPAS.findIndex((e) => e.key === etapa);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* ── Header (always visible) ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
      >
        {/* Icon */}
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </span>

        <span className="text-sm font-semibold text-zinc-100 truncate">
          {nombreCliente || "Cliente sin nombre"}
        </span>

        {etapa && <span className="ml-1">{etapaBadge(etapa)}</span>}

        <svg
          className={`w-4 h-4 text-zinc-500 shrink-0 ml-auto transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Expanded body ───────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-5 pb-4 pt-2 space-y-4 border-t border-zinc-800">
          {/* A. Contacto ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Contacto</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <label className={labelCls}>Tel&eacute;fono</label>
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => onChange("clienteTelefono", e.target.value)}
                  placeholder="(000) 000-0000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => onChange("clienteEmail", e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Ubicaci&oacute;n</label>
                <input
                  type="text"
                  value={clienteUbicacion}
                  onChange={(e) => onChange("clienteUbicacion", e.target.value)}
                  placeholder="Ciudad, Estado"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Notas</label>
                <textarea
                  rows={2}
                  value={clienteNotas}
                  onChange={(e) => onChange("clienteNotas", e.target.value)}
                  placeholder="Notas sobre el cliente..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </section>

          {/* B. Pipeline ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Pipeline</h3>

            {/* Stage pills */}
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {ETAPAS.map((st, idx) => {
                const isActive = st.key === etapa;
                const isPast = currentIdx >= 0 && idx < currentIdx;
                return (
                  <div key={st.key} className="flex items-center">
                    {idx > 0 && (
                      <div
                        className={`w-4 h-px ${isPast || isActive ? "bg-zinc-600" : "bg-zinc-800"}`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onChange("etapa", st.key)}
                      className={`
                        h-6 px-2.5 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all
                        ${isActive
                          ? `${st.activeBg} ${st.activeBorder} ${st.color}`
                          : isPast
                            ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                            : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                        }
                      `}
                    >
                      {st.label}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Conditional fields based on etapa */}
            {etapa === "negociacion" && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Probabilidad de cierre</label>
                  <span className="text-xs font-mono text-amber-400">{probabilidadCierre}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={probabilidadCierre}
                  onChange={(e) => onChange("probabilidadCierre", Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-zinc-800 accent-amber-400 cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-md
                    [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:border-0"
                />
              </div>
            )}

            {(etapa === "cerrado_ganado" || etapa === "cerrado_perdido") && (
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Fecha de cierre</label>
                  <input
                    type="date"
                    value={fechaCierre}
                    onChange={(e) => onChange("fechaCierre", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Notas de etapa</label>
                  <textarea
                    rows={2}
                    value={etapaNotas}
                    onChange={(e) => onChange("etapaNotas", e.target.value)}
                    placeholder={etapa === "cerrado_perdido" ? "Motivo de p\u00e9rdida..." : "Detalles del cierre..."}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>
            )}

            {etapa === "instalado" && (
              <div className="mt-2.5 max-w-xs">
                <label className={labelCls}>Fecha de instalaci&oacute;n</label>
                <input
                  type="date"
                  value={fechaInstalacion}
                  onChange={(e) => onChange("fechaInstalacion", e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
          </section>

          {/* C. Origen + Tags ─────────────────────────────────────── */}
          <section>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Origen y etiquetas</h3>
            <div className="flex flex-wrap items-start gap-3">
              {/* Origen select */}
              <div className="w-32 shrink-0">
                <label className={labelCls}>Origen</label>
                <select
                  value={origen}
                  onChange={(e) => onChange("origen", e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                >
                  {ORIGENES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Origen detalle */}
              {origen && (
                <div className="flex-1 min-w-[140px]">
                  <label className={labelCls}>Detalle</label>
                  <input
                    type="text"
                    value={origenDetalle}
                    onChange={(e) => onChange("origenDetalle", e.target.value)}
                    placeholder={ORIGEN_PLACEHOLDERS[origen] || "Detalle del origen"}
                    className={inputCls}
                  />
                </div>
              )}

              {/* Tags */}
              <div className="flex-1 min-w-[180px]">
                <label className={labelCls}>Etiquetas</label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 min-h-[30px]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded bg-zinc-700 border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-zinc-500 hover:text-zinc-200 transition-colors leading-none"
                        aria-label={`Eliminar etiqueta ${tag}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? "Escribe y Enter..." : ""}
                    className="flex-1 min-w-[60px] bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none py-0.5"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
