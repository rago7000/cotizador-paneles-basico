"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppNav from "../components/AppNav";
import { useConvexCotizaciones } from "../lib/useConvexCatalogo";
import type { CotizacionData } from "../lib/types";
import CotizacionesMetrics from "./_components/CotizacionesMetrics";
import CotizacionesToolbar from "./_components/CotizacionesToolbar";
import CotizacionesTable from "./_components/CotizacionesTable";
import CotizacionesBoard from "./_components/CotizacionesBoard";
import CotizacionDrawer from "./_components/CotizacionDrawer";
import BulkActionBar from "./_components/BulkActionBar";
import { toRow, filterRows, sortRows } from "./_lib/derive";
import { DEFAULT_UI, type UIState, type Etapa, type CotizacionRow, type SortKey } from "./_lib/types-shared";

const UI_STORAGE_KEY = "cotizaciones:ui:v1";

export default function CotizacionesPage() {
  const router = useRouter();
  const { cotizaciones, cargarCotizacion, guardarCotizacion, eliminarCotizacion } = useConvexCotizaciones();

  const [ui, setUI] = useState<UIState>(DEFAULT_UI);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerNombre, setDrawerNombre] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" && sessionStorage.getItem(UI_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUI({ ...DEFAULT_UI, ...parsed });
      }
    } catch { /* ignore corrupt storage */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(UI_STORAGE_KEY, JSON.stringify(ui));
    } catch { /* ignore */ }
  }, [ui]);

  const rows: CotizacionRow[] = useMemo(() => {
    return (cotizaciones ?? [])
      .map((doc) => {
        const data = cargarCotizacion(doc.nombre);
        return data ? toRow(data) : null;
      })
      .filter((r): r is CotizacionRow => r !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotizaciones]);

  const filteredRows = useMemo(() => sortRows(filterRows(rows, ui), ui), [rows, ui]);
  const drawerRow = drawerNombre ? rows.find((r) => r.nombre === drawerNombre) ?? null : null;

  const updateUI = (patch: Partial<UIState>) => setUI((s) => ({ ...s, ...patch }));

  const onSort = (key: SortKey) => {
    setUI((s) => ({
      ...s,
      sortKey: key,
      sortDir: s.sortKey === key ? (s.sortDir === "asc" ? "desc" : "asc") : "desc",
    }));
  };

  const toggleSelect = (nombre: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(nombre);
      else next.delete(nombre);
      return next;
    });
  };

  const selectAllVisible = (checked: boolean) => {
    setSelected(() => {
      if (!checked) return new Set();
      return new Set(filteredRows.map((r) => r.nombre));
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleChangeEtapa = async (row: CotizacionRow, etapa: Etapa) => {
    if (row.etapa === etapa) return;
    const next: CotizacionData = { ...row.raw, etapa };
    try {
      await guardarCotizacion(row.nombre, next);
    } catch (e) {
      console.error("Failed to update etapa", e);
    }
  };

  const handleBulkChangeEtapa = async (targetRows: CotizacionRow[], etapa: Etapa) => {
    const changed = targetRows.filter((r) => r.etapa !== etapa);
    await Promise.all(
      changed.map((r) => guardarCotizacion(r.nombre, { ...r.raw, etapa })),
    );
    clearSelection();
  };

  const handleDelete = async (row: CotizacionRow) => {
    await eliminarCotizacion(row.nombre);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(row.nombre);
      return next;
    });
    if (drawerNombre === row.nombre) setDrawerNombre(null);
  };

  const handleBulkDelete = async (targetRows: CotizacionRow[]) => {
    await Promise.all(targetRows.map((r) => eliminarCotizacion(r.nombre)));
    clearSelection();
  };

  const handleDuplicar = async (row: CotizacionRow) => {
    const baseNombre = `${row.nombre} (copia)`;
    const existing = new Set(rows.map((r) => r.nombre));
    let counter = 2;
    let nombreNuevo = baseNombre;
    while (existing.has(nombreNuevo)) {
      nombreNuevo = `${baseNombre} ${counter++}`;
    }
    const now = new Date().toISOString();
    const clone: CotizacionData = {
      ...row.raw,
      nombre: nombreNuevo,
      cotizacionId: undefined,
      fecha: now,
      creadoEn: now,
      actualizadoEn: now,
    };
    await guardarCotizacion(nombreNuevo, clone);
  };

  const handleCargar = (row: CotizacionRow) => {
    router.push(`/?load=${encodeURIComponent(row.nombre)}`);
  };

  const handleNew = () => {
    router.push("/");
  };

  const handleAction = (action: "cargar" | "duplicar" | "eliminar", row: CotizacionRow) => {
    if (action === "cargar") handleCargar(row);
    else if (action === "duplicar") handleDuplicar(row);
    else if (action === "eliminar") handleDelete(row);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg">☀️</span>
            <span className="hidden sm:block text-sm font-semibold text-zinc-100">Cotizador Solar</span>
          </Link>
          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-zinc-100">Mis cotizaciones</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Pipeline comercial, métricas y gestión de cotizaciones guardadas.
          </p>
        </div>

        <div className="mb-5">
          <CotizacionesMetrics rows={rows} />
        </div>

        <div className="mb-4">
          <CotizacionesToolbar
            ui={ui}
            onChange={updateUI}
            totalCount={rows.length}
            filteredCount={filteredRows.length}
            onNew={handleNew}
          />
        </div>

        {ui.view === "tabla" ? (
          <CotizacionesTable
            rows={filteredRows}
            selected={selected}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAllVisible}
            sortKey={ui.sortKey}
            sortDir={ui.sortDir}
            onSort={onSort}
            onRowClick={(r) => setDrawerNombre(r.nombre)}
            onChangeEtapa={handleChangeEtapa}
            onAction={handleAction}
          />
        ) : (
          <CotizacionesBoard
            rows={filteredRows}
            onRowClick={(r) => setDrawerNombre(r.nombre)}
            onChangeEtapa={handleChangeEtapa}
            onAction={handleAction}
          />
        )}
      </main>

      <CotizacionDrawer
        key={drawerRow?.nombre ?? "empty"}
        row={drawerRow}
        onClose={() => setDrawerNombre(null)}
        onCargar={handleCargar}
        onDuplicar={handleDuplicar}
        onEliminar={handleDelete}
        onChangeEtapa={handleChangeEtapa}
      />

      <BulkActionBar
        rows={rows}
        selected={selected}
        onClear={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkChangeEtapa={handleBulkChangeEtapa}
      />
    </div>
  );
}
