"use client";

import { ETAPAS, ETAPA_LABEL, ETAPA_COLOR, ORIGENES, ORIGEN_LABEL, type Etapa, type Origen, type UIState } from "../_lib/types-shared";

interface Props {
  ui: UIState;
  onChange: (patch: Partial<UIState>) => void;
  totalCount: number;
  filteredCount: number;
  onNew: () => void;
}

export default function CotizacionesToolbar({ ui, onChange, totalCount, filteredCount, onNew }: Props) {
  const toggleEtapa = (e: Etapa) => {
    onChange({
      etapas: ui.etapas.includes(e) ? ui.etapas.filter((x) => x !== e) : [...ui.etapas, e],
    });
  };
  const toggleOrigen = (o: Origen) => {
    onChange({
      origenes: ui.origenes.includes(o) ? ui.origenes.filter((x) => x !== o) : [...ui.origenes, o],
    });
  };
  const clearFilters = () => {
    onChange({ search: "", etapas: [], origenes: [], soloConCFE: false, rangoDias: 0 });
  };
  const activeFilterCount =
    (ui.search ? 1 : 0) +
    ui.etapas.length +
    ui.origenes.length +
    (ui.soloConCFE ? 1 : 0) +
    (ui.rangoDias > 0 ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
          </svg>
          <input
            type="text"
            value={ui.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Buscar por nombre, cliente, tags…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
          />
        </div>

        <select
          value={ui.rangoDias}
          onChange={(e) => onChange({ rangoDias: Number(e.target.value) as UIState["rangoDias"] })}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none hover:border-zinc-600"
          aria-label="Rango de fechas"
        >
          <option value={0}>Todas las fechas</option>
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>

        <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600 cursor-pointer">
          <input
            type="checkbox"
            checked={ui.soloConCFE}
            onChange={(e) => onChange({ soloConCFE: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-amber-400 focus:ring-amber-400/30"
          />
          Con CFE
        </label>

        <div className="ml-auto flex items-center gap-2">
          <ViewSwitch value={ui.view} onChange={(v) => onChange({ view: v })} />
          <button
            type="button"
            onClick={onNew}
            className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nueva
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mr-1">Etapa</span>
        {ETAPAS.map((e) => {
          const c = ETAPA_COLOR[e];
          const active = ui.etapas.includes(e);
          return (
            <button
              key={e}
              type="button"
              onClick={() => toggleEtapa(e)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition ${
                active
                  ? `${c.bg} ${c.text} ${c.ring}`
                  : "bg-transparent text-zinc-500 ring-zinc-800 hover:text-zinc-300 hover:ring-zinc-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? c.dot : "bg-zinc-600"}`} />
              {ETAPA_LABEL[e]}
            </button>
          );
        })}
        <span className="mx-2 h-4 w-px bg-zinc-800" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mr-1">Origen</span>
        {ORIGENES.map((o) => {
          const active = ui.origenes.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggleOrigen(o)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition ${
                active
                  ? "bg-zinc-200/10 text-zinc-100 ring-zinc-400/30"
                  : "bg-transparent text-zinc-500 ring-zinc-800 hover:text-zinc-300 hover:ring-zinc-700"
              }`}
            >
              {ORIGEN_LABEL[o]}
            </button>
          );
        })}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
          >
            Limpiar filtros ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <div>
          {filteredCount === totalCount ? (
            <>
              <span className="text-zinc-300 font-medium">{totalCount}</span> cotización{totalCount === 1 ? "" : "es"}
            </>
          ) : (
            <>
              <span className="text-zinc-300 font-medium">{filteredCount}</span> de {totalCount}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewSwitch({ value, onChange }: { value: UIState["view"]; onChange: (v: UIState["view"]) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
      <button
        type="button"
        onClick={() => onChange("tabla")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
          value === "tabla" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
        }`}
        aria-label="Vista de tabla"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Tabla
      </button>
      <button
        type="button"
        onClick={() => onChange("tablero")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
          value === "tablero" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
        }`}
        aria-label="Vista de tablero"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v12H4V6zm6 0h4v8h-4V6zm6 0h4v6h-4V6z" />
        </svg>
        Tablero
      </button>
    </div>
  );
}
