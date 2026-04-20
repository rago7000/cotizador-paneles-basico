"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { CotizacionRow, Etapa } from "../_lib/types-shared";
import { ETAPAS, ETAPA_LABEL, ETAPA_COLOR, ORIGEN_LABEL } from "../_lib/types-shared";
import { fmtMXN, fmtMXNShort, fmtRelative } from "../_lib/derive";

interface Props {
  rows: CotizacionRow[];
  onRowClick: (row: CotizacionRow) => void;
  onChangeEtapa: (row: CotizacionRow, etapa: Etapa) => void;
  onAction: (action: "cargar" | "duplicar" | "eliminar" | "archivar" | "desarchivar", row: CotizacionRow) => void;
}

export default function CotizacionesBoard({ rows, onRowClick, onChangeEtapa, onAction }: Props) {
  const [activeRow, setActiveRow] = useState<CotizacionRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const byEtapa = useMemo(() => {
    const map = new Map<Etapa, CotizacionRow[]>();
    for (const e of ETAPAS) map.set(e, []);
    for (const r of rows) {
      map.get(r.etapa)!.push(r);
    }
    return map;
  }, [rows]);

  const onDragStart = (ev: DragStartEvent) => {
    const found = rows.find((r) => r.nombre === ev.active.id);
    setActiveRow(found ?? null);
  };

  const onDragEnd = (ev: DragEndEvent) => {
    setActiveRow(null);
    const overId = ev.over?.id as string | undefined;
    if (!overId) return;
    const targetEtapa = ETAPAS.find((e) => e === overId);
    if (!targetEtapa) return;
    const row = rows.find((r) => r.nombre === ev.active.id);
    if (!row || row.etapa === targetEtapa) return;
    onChangeEtapa(row, targetEtapa);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {ETAPAS.map((e) => (
          <Column
            key={e}
            etapa={e}
            rows={byEtapa.get(e) ?? []}
            onRowClick={onRowClick}
            onAction={onAction}
          />
        ))}
      </div>
      <DragOverlay>
        {activeRow ? <Card row={activeRow} overlay onRowClick={() => {}} onAction={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  etapa, rows, onRowClick, onAction,
}: {
  etapa: Etapa;
  rows: CotizacionRow[];
  onRowClick: (r: CotizacionRow) => void;
  onAction: (a: "cargar" | "duplicar" | "eliminar" | "archivar" | "desarchivar", r: CotizacionRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa });
  const c = ETAPA_COLOR[etapa];
  const suma = rows.reduce((s, r) => s + (r.valorPonderadoMXN || r.totalClienteMXN || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[290px] min-w-[290px] flex-col rounded-xl border bg-zinc-900/40 transition ${
        isOver ? "border-amber-400/60 ring-2 ring-amber-400/20" : "border-zinc-800"
      }`}
    >
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        <span className={`text-xs font-semibold ${c.text}`}>{ETAPA_LABEL[etapa]}</span>
        <span className="ml-auto rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 tabular-nums">
          {rows.length}
        </span>
      </header>
      <div className="border-b border-zinc-800/70 px-3 py-1.5 text-[10px] text-zinc-500 tabular-nums">
        {fmtMXNShort(suma)}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {rows.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-[11px] text-zinc-600">
            Vacío
          </div>
        ) : (
          rows.map((r) => (
            <Card key={r.nombre} row={r} onRowClick={onRowClick} onAction={onAction} />
          ))
        )}
      </div>
    </div>
  );
}

function Card({
  row, onRowClick, onAction, overlay = false,
}: {
  row: CotizacionRow;
  onRowClick: (r: CotizacionRow) => void;
  onAction: (a: "cargar" | "duplicar" | "eliminar" | "archivar" | "desarchivar", r: CotizacionRow) => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: row.nombre,
    disabled: overlay,
  });
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={(e) => {
        if (overlay) return;
        if ((e.target as HTMLElement).closest("[data-card-action]")) return;
        onRowClick(row);
      }}
      className={`group relative cursor-grab rounded-lg border bg-zinc-900 p-2.5 transition active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      } ${overlay ? "border-amber-400/60 shadow-2xl shadow-amber-400/20 ring-2 ring-amber-400/20 rotate-1" : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-zinc-100">{row.nombre}</p>
          {(row.clienteUbicacion || row.clienteTelefono) && (
            <p className="truncate text-[10px] text-zinc-500">
              {row.clienteUbicacion || row.clienteTelefono}
            </p>
          )}
        </div>
        {!overlay && (
          <div data-card-action className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              className="rounded p-0.5 text-zinc-500 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Acciones"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                <div className="absolute right-0 top-6 z-50 min-w-[140px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => { setMenuOpen(false); onAction("cargar", row); }} className="block w-full px-3 py-1.5 text-left text-[11px] text-zinc-200 hover:bg-zinc-800">Cargar</button>
                  <button type="button" onClick={() => { setMenuOpen(false); onAction("duplicar", row); }} className="block w-full px-3 py-1.5 text-left text-[11px] text-zinc-200 hover:bg-zinc-800">Duplicar</button>
                  <div className="border-t border-zinc-800" />
                  {row.archived ? (
                    <>
                      <button type="button" onClick={() => { setMenuOpen(false); onAction("desarchivar", row); }} className="block w-full px-3 py-1.5 text-left text-[11px] text-zinc-200 hover:bg-zinc-800">Desarchivar</button>
                      <button type="button" onClick={() => { setMenuOpen(false); onAction("eliminar", row); }} className="block w-full px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-zinc-800">Eliminar…</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setMenuOpen(false); onAction("archivar", row); }} className="block w-full px-3 py-1.5 text-left text-[11px] text-zinc-200 hover:bg-zinc-800">Archivar</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-100 tabular-nums">{fmtMXN(row.totalClienteMXN)}</span>
        {row.probabilidadCierre != null && (
          <span className="text-[10px] text-zinc-500 tabular-nums">{row.probabilidadCierre}%</span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>{fmtRelative(row.actualizadoEn)}</span>
        {row.origen && <span className="rounded bg-zinc-800 px-1 py-0.5">{ORIGEN_LABEL[row.origen]}</span>}
      </div>
    </div>
  );
}
