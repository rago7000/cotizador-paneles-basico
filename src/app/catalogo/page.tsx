"use client";

import { useState, useEffect } from "react";
import AppNav from "../components/AppNav";
import {
  listarCatalogoPaneles,
  guardarCatalogoPanel,
  eliminarCatalogoPanel,
  listarCatalogoMicros,
  guardarCatalogoMicro,
  eliminarCatalogoMicro,
} from "../lib/storage";
import type { CatalogoPanel, CatalogoMicro } from "../lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15";

const labelCls = "block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide";

// ── sub-components ───────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
      <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p className="text-sm mb-4">No hay ítems en el catálogo</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Agregar primero
      </button>
    </div>
  );
}

// ── Panel form ────────────────────────────────────────────────────────────────

const panelEmpty = (): Omit<CatalogoPanel, "id" | "fechaActualizacion"> => ({
  marca: "", modelo: "", potencia: 0, precioPorWatt: 0, notas: "",
});

function PanelForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CatalogoPanel;
  onSave: (p: CatalogoPanel) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(
    initial
      ? { marca: initial.marca, modelo: initial.modelo, potencia: String(initial.potencia), precioPorWatt: String(initial.precioPorWatt), notas: initial.notas }
      : { marca: "", modelo: "", potencia: "", precioPorWatt: "", notas: "" }
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const valid = form.marca.trim() && form.modelo.trim() && Number(form.potencia) > 0 && Number(form.precioPorWatt) > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      id: initial?.id || uid(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      potencia: Number(form.potencia),
      precioPorWatt: Number(form.precioPorWatt),
      notas: form.notas.trim(),
      fechaActualizacion: new Date().toLocaleString("es-MX"),
    });
  };

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-zinc-900 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100">
        {initial ? "Editar panel" : "Nuevo panel"}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Marca</label>
          <input className={inputCls} value={form.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Ej: Longi, Jinko, Canadian..." />
        </div>
        <div>
          <label className={labelCls}>Modelo</label>
          <input className={inputCls} value={form.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="Ej: Hi-MO 6 Pro" />
        </div>
        <div>
          <label className={labelCls}>Potencia (W)</label>
          <input className={inputCls} type="number" min={0} value={form.potencia} onChange={(e) => set("potencia", e.target.value)} placeholder="Ej: 550" />
        </div>
        <div>
          <label className={labelCls}>Precio / watt (USD sin IVA)</label>
          <input className={inputCls} type="number" min={0} step={0.001} value={form.precioPorWatt} onChange={(e) => set("precioPorWatt", e.target.value)} placeholder="Ej: 0.185" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notas (opcional)</label>
        <input className={inputCls} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Proveedor, condiciones, etc." />
      </div>

      {form.potencia && form.precioPorWatt && Number(form.potencia) > 0 && Number(form.precioPorWatt) > 0 && (
        <div className="rounded-lg bg-amber-400/5 border border-amber-400/20 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Precio por panel ({form.potencia}W)</span>
          <span className="text-sm font-semibold text-amber-400 font-mono">
            ${fmt2(Number(form.potencia) * Number(form.precioPorWatt))} USD
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!valid}
          className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Micro form ────────────────────────────────────────────────────────────────

function MicroForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CatalogoMicro;
  onSave: (m: CatalogoMicro) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(
    initial
      ? { marca: initial.marca, modelo: initial.modelo, precio: String(initial.precio), precioCable: String(initial.precioCable), notas: initial.notas }
      : { marca: "", modelo: "", precio: "", precioCable: "", notas: "" }
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const valid = form.marca.trim() && form.modelo.trim() && Number(form.precio) > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      id: initial?.id || uid(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      precio: Number(form.precio),
      precioCable: Number(form.precioCable) || 0,
      notas: form.notas.trim(),
      fechaActualizacion: new Date().toLocaleString("es-MX"),
    });
  };

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-zinc-900 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100">
        {initial ? "Editar microinversor" : "Nuevo microinversor"}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Marca</label>
          <input className={inputCls} value={form.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Ej: APsystems, Enphase..." />
        </div>
        <div>
          <label className={labelCls}>Modelo</label>
          <input className={inputCls} value={form.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="Ej: DS3D" />
        </div>
        <div>
          <label className={labelCls}>Precio por unidad (USD sin IVA)</label>
          <input className={inputCls} type="number" min={0} step={0.01} value={form.precio} onChange={(e) => set("precio", e.target.value)} placeholder="Ej: 180.00" />
        </div>
        <div>
          <label className={labelCls}>Cable troncal por unidad (USD sin IVA)</label>
          <input className={inputCls} type="number" min={0} step={0.01} value={form.precioCable} onChange={(e) => set("precioCable", e.target.value)} placeholder="Ej: 25.00" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notas (opcional)</label>
        <input className={inputCls} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Proveedor, condiciones, etc." />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!valid}
          className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CatalogoPage() {
  const [tab, setTab] = useState<"paneles" | "micros">("paneles");

  const [paneles, setPaneles] = useState<CatalogoPanel[]>([]);
  const [micros, setMicros] = useState<CatalogoMicro[]>([]);

  const [addingPanel, setAddingPanel] = useState(false);
  const [editingPanel, setEditingPanel] = useState<CatalogoPanel | null>(null);
  const [addingMicro, setAddingMicro] = useState(false);
  const [editingMicro, setEditingMicro] = useState<CatalogoMicro | null>(null);

  useEffect(() => {
    setPaneles(listarCatalogoPaneles());
    setMicros(listarCatalogoMicros());
  }, []);

  // ── Panel handlers ──────────────────────────────────────────────────────
  const handleSavePanel = (p: CatalogoPanel) => {
    guardarCatalogoPanel(p);
    setPaneles(listarCatalogoPaneles());
    setAddingPanel(false);
    setEditingPanel(null);
  };

  const handleDeletePanel = (id: string) => {
    eliminarCatalogoPanel(id);
    setPaneles(listarCatalogoPaneles());
  };

  // ── Micro handlers ──────────────────────────────────────────────────────
  const handleSaveMicro = (m: CatalogoMicro) => {
    guardarCatalogoMicro(m);
    setMicros(listarCatalogoMicros());
    setAddingMicro(false);
    setEditingMicro(null);
  };

  const handleDeleteMicro = (id: string) => {
    eliminarCatalogoMicro(id);
    setMicros(listarCatalogoMicros());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">☀️</span>
            <span className="hidden sm:block text-sm font-semibold text-zinc-100 tracking-tight">
              Cotizador Solar
            </span>
          </div>
          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        {/* Title + sub-tabs */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Catálogo de productos</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Guarda paneles y microinversores para reutilizarlos en tus cotizaciones
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-zinc-800 pb-0">
          {(["paneles", "micros"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setAddingPanel(false); setAddingMicro(false); setEditingPanel(null); setEditingMicro(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "paneles" ? "Paneles" : "Microinversores"}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? "bg-amber-400/15 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
                {t === "paneles" ? paneles.length : micros.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── PANELES ── */}
        {tab === "paneles" && (
          <div className="space-y-3">
            {/* Add button */}
            {!addingPanel && !editingPanel && (
              <div className="flex justify-end">
                <button
                  onClick={() => setAddingPanel(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo panel
                </button>
              </div>
            )}

            {/* Add form */}
            {addingPanel && (
              <PanelForm
                onSave={handleSavePanel}
                onCancel={() => setAddingPanel(false)}
              />
            )}

            {/* Edit form */}
            {editingPanel && (
              <PanelForm
                initial={editingPanel}
                onSave={handleSavePanel}
                onCancel={() => setEditingPanel(null)}
              />
            )}

            {/* List */}
            {!addingPanel && !editingPanel && paneles.length === 0 && (
              <EmptyState onAdd={() => setAddingPanel(true)} />
            )}

            {!addingPanel && !editingPanel && paneles.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_100px_110px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  <span>Panel</span>
                  <span className="text-right">Potencia</span>
                  <span className="text-right">$/watt</span>
                  <span className="text-right">$/panel</span>
                  <span />
                </div>

                {paneles.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex sm:grid sm:grid-cols-[1fr_80px_100px_110px_36px] gap-3 items-start sm:items-center px-5 py-4 hover:bg-zinc-800/30 transition-colors ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">
                        {p.marca} — {p.modelo}
                      </p>
                      {p.notas && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{p.notas}</p>
                      )}
                      <p className="text-xs text-zinc-600 mt-0.5 sm:hidden">
                        {p.potencia}W · ${fmt2(p.precioPorWatt)}/W · ${fmt2(p.potencia * p.precioPorWatt)}/panel
                      </p>
                    </div>
                    <p className="hidden sm:block text-sm text-zinc-300 text-right font-mono">{p.potencia}W</p>
                    <p className="hidden sm:block text-sm text-zinc-300 text-right font-mono">${fmt2(p.precioPorWatt)}</p>
                    <p className="hidden sm:block text-sm font-semibold text-amber-400 text-right font-mono">${fmt2(p.potencia * p.precioPorWatt)}</p>

                    <div className="flex gap-1 shrink-0 sm:justify-end">
                      <button
                        onClick={() => { setEditingPanel(p); setAddingPanel(false); }}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePanel(p.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MICROS ── */}
        {tab === "micros" && (
          <div className="space-y-3">
            {!addingMicro && !editingMicro && (
              <div className="flex justify-end">
                <button
                  onClick={() => setAddingMicro(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo microinversor
                </button>
              </div>
            )}

            {addingMicro && (
              <MicroForm
                onSave={handleSaveMicro}
                onCancel={() => setAddingMicro(false)}
              />
            )}

            {editingMicro && (
              <MicroForm
                initial={editingMicro}
                onSave={handleSaveMicro}
                onCancel={() => setEditingMicro(null)}
              />
            )}

            {!addingMicro && !editingMicro && micros.length === 0 && (
              <EmptyState onAdd={() => setAddingMicro(true)} />
            )}

            {!addingMicro && !editingMicro && micros.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1fr_110px_110px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  <span>Microinversor</span>
                  <span className="text-right">Precio unit.</span>
                  <span className="text-right">Cable troncal</span>
                  <span />
                </div>

                {micros.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex sm:grid sm:grid-cols-[1fr_110px_110px_36px] gap-3 items-start sm:items-center px-5 py-4 hover:bg-zinc-800/30 transition-colors ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">
                        {m.marca} — {m.modelo}
                      </p>
                      {m.notas && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{m.notas}</p>
                      )}
                      <p className="text-xs text-zinc-600 mt-0.5 sm:hidden">
                        ${fmt2(m.precio)} USD · cable: ${fmt2(m.precioCable)} USD
                      </p>
                    </div>
                    <p className="hidden sm:block text-sm font-semibold text-amber-400 text-right font-mono">${fmt2(m.precio)} USD</p>
                    <p className="hidden sm:block text-sm text-zinc-300 text-right font-mono">
                      {m.precioCable > 0 ? `$${fmt2(m.precioCable)} USD` : <span className="text-zinc-600">—</span>}
                    </p>

                    <div className="flex gap-1 shrink-0 sm:justify-end">
                      <button
                        onClick={() => { setEditingMicro(m); setAddingMicro(false); }}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteMicro(m.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
