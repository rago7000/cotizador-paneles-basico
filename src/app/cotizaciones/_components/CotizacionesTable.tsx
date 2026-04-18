"use client";

import { useState } from "react";
import type { CotizacionRow, SortKey, SortDir } from "../_lib/types-shared";
import { ORIGEN_LABEL } from "../_lib/types-shared";
import { fmtMXN, fmtRelative } from "../_lib/derive";
import EtapaPill from "./EtapaPill";
import type { Etapa } from "../_lib/types-shared";

interface Props {
  rows: CotizacionRow[];
  selected: Set<string>;
  onToggleSelect: (nombre: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (row: CotizacionRow) => void;
  onChangeEtapa: (row: CotizacionRow, etapa: Etapa) => void;
  onAction: (action: "cargar" | "duplicar" | "eliminar", row: CotizacionRow) => void;
}

export default function CotizacionesTable({
  rows, selected, onToggleSelect, onSelectAll,
  sortKey, sortDir, onSort, onRowClick, onChangeEtapa, onAction,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.nombre));
  const someSelected = rows.some((r) => selected.has(r.nombre));

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
        <svg className="mb-3 h-10 w-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-zinc-400">Sin cotizaciones que coincidan</p>
        <p className="mt-1 text-xs text-zinc-600">Ajusta los filtros o crea una nueva.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-zinc-900 text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="w-10 px-3 py-2.5 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-amber-400 focus:ring-amber-400/30"
                  aria-label="Seleccionar todo"
                />
              </th>
              <Th label="Nombre" sortKey="nombre" current={sortKey} dir={sortDir} onSort={onSort} />
              <Th label="Etapa" sortKey="etapa" current={sortKey} dir={sortDir} onSort={onSort} />
              <th className="px-3 py-2.5 text-left font-medium">Origen</th>
              <Th label="Total cliente" sortKey="totalCliente" current={sortKey} dir={sortDir} onSort={onSort} align="right" />
              <Th label="Prob" sortKey="probabilidadCierre" current={sortKey} dir={sortDir} onSort={onSort} align="right" />
              <Th label="Actualizada" sortKey="actualizadoEn" current={sortKey} dir={sortDir} onSort={onSort} />
              <th className="px-3 py-2.5 text-left font-medium">Tags</th>
              <th className="w-10 px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row
                key={r.nombre}
                row={r}
                checked={selected.has(r.nombre)}
                onToggleCheck={(c) => onToggleSelect(r.nombre, c)}
                onRowClick={() => onRowClick(r)}
                onChangeEtapa={(e) => onChangeEtapa(r, e)}
                onAction={(a) => onAction(a, r)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label, sortKey, current, dir, onSort, align = "left",
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
  const active = sortKey === current;
  return (
    <th className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition ${active ? "text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
      >
        {label}
        {active && (
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={dir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        )}
      </button>
    </th>
  );
}

function Row({
  row, checked, onToggleCheck, onRowClick, onChangeEtapa, onAction,
}: {
  row: CotizacionRow;
  checked: boolean;
  onToggleCheck: (c: boolean) => void;
  onRowClick: () => void;
  onChangeEtapa: (e: Etapa) => void;
  onAction: (a: "cargar" | "duplicar" | "eliminar") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const inactividad = row.diasSinMovimiento;
  const inactivo = inactividad != null && inactividad >= 14 && !["cerrado_ganado", "cerrado_perdido", "instalado"].includes(row.etapa);

  return (
    <tr className={`border-t border-zinc-800 transition ${checked ? "bg-amber-400/5" : "hover:bg-zinc-800/40"} cursor-pointer`} onClick={onRowClick}>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggleCheck(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-amber-400 focus:ring-amber-400/30"
          aria-label={`Seleccionar ${row.nombre}`}
        />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="truncate text-[13px] font-medium text-zinc-100">{row.nombre}</span>
          <span className="truncate text-[11px] text-zinc-500">
            {row.clienteUbicacion || row.clienteTelefono || row.clienteEmail || "Sin datos de contacto"}
            {row.cantidadPaneles > 0 && (
              <> · {row.cantidadPaneles} paneles · {row.kWp.toFixed(2)} kWp</>
            )}
          </span>
        </div>
      </td>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <EtapaPill etapa={row.etapa} editable onChange={onChangeEtapa} />
      </td>
      <td className="px-3 py-3 text-xs text-zinc-400">
        {row.origen ? ORIGEN_LABEL[row.origen] : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-3 py-3 text-right font-medium text-zinc-100 tabular-nums">
        {fmtMXN(row.totalClienteMXN)}
        {row.utilidadNetaPct != null && row.totalClienteMXN != null && (
          <div className="mt-0.5 text-[10px] font-normal text-emerald-400/80">
            +{row.utilidadNetaPct.toFixed(0)}% util.
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-300">
        {row.probabilidadCierre != null ? `${row.probabilidadCierre}%` : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-3 py-3 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          {fmtRelative(row.actualizadoEn)}
          {inactivo && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-300 ring-1 ring-amber-500/20" title={`${inactividad} días sin movimiento`}>
              inactiva
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {(row.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
              {t}
            </span>
          ))}
          {(row.tags?.length ?? 0) > 3 && (
            <span className="text-[10px] text-zinc-600">+{(row.tags?.length ?? 0) - 3}</span>
          )}
        </div>
      </td>
      <td className="relative px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition"
          aria-label="Acciones"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-3 top-10 z-50 min-w-[150px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
              <MenuItem onClick={() => { setMenuOpen(false); onAction("cargar"); }}>Cargar</MenuItem>
              <MenuItem onClick={() => { setMenuOpen(false); onAction("duplicar"); }}>Duplicar</MenuItem>
              <div className="border-t border-zinc-800" />
              <MenuItem onClick={() => { setMenuOpen(false); onAction("eliminar"); }} danger>Eliminar</MenuItem>
            </div>
          </>
        )}
      </td>
    </tr>
  );
}

function MenuItem({ children, onClick, danger = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-xs transition hover:bg-zinc-800 ${
        danger ? "text-red-400 hover:text-red-300" : "text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
