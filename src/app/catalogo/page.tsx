"use client";

import { useState, useEffect, useMemo } from "react";
import AppNav from "../components/AppNav";
import {
  listarProveedores,
  guardarProveedor,
  eliminarProveedor,
  listarProductosPaneles,
  guardarProductoPanel,
  eliminarProductoPanel,
  listarProductosMicros,
  guardarProductoMicro,
  eliminarProductoMicro,
  listarOfertas,
  guardarOferta,
  eliminarOferta,
  ofertasPorProducto,
  mejorOferta,
  tendenciaOferta,
  historialPrecios,
  migrarCatalogoLegacy,
} from "../lib/storage";
import type {
  Proveedor,
  ProductoPanel,
  ProductoMicro,
  Oferta,
} from "../lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmt3 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const fmtDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "Sin fecha";
  }
};

const toLocalInput = (iso?: string) => {
  try {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
};

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15";

const labelCls = "block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide";

const btnPrimary =
  "flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors";

const btnSecondary =
  "rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors";

const btnDisabled = "disabled:opacity-30 disabled:cursor-not-allowed";

// ── Icons ────────────────────────────────────────────────────────────────────

function IconPlus({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconEdit({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function IconTrash({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function IconTrend({ dir }: { dir: "up" | "down" | "stable" | "new" }) {
  if (dir === "up") return <span className="text-red-400 text-xs font-bold" title="Subió">▲</span>;
  if (dir === "down") return <span className="text-green-400 text-xs font-bold" title="Bajó">▼</span>;
  if (dir === "stable") return <span className="text-zinc-500 text-xs" title="Igual">—</span>;
  return <span className="text-blue-400 text-xs" title="Nueva">●</span>;
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
      <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p className="text-sm mb-4">{label}</p>
      <button onClick={onAdd} className={btnPrimary}>
        <IconPlus /> Agregar primero
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — PROVEEDORES
// ══════════════════════════════════════════════════════════════════════════════

function ProveedorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Proveedor;
  onSave: (p: Proveedor) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? "",
    contacto: initial?.contacto ?? "",
    telefono: initial?.telefono ?? "",
    notas: initial?.notas ?? "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.nombre.trim().length > 0;

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-zinc-900 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100">
        {initial ? "Editar proveedor" : "Nuevo proveedor"}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nombre *</label>
          <input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Solar Depot, Enertik..." />
        </div>
        <div>
          <label className={labelCls}>Contacto</label>
          <input className={inputCls} value={form.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="Nombre del vendedor" />
        </div>
        <div>
          <label className={labelCls}>Teléfono</label>
          <input className={inputCls} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="Ej: 33 1234 5678" />
        </div>
        <div>
          <label className={labelCls}>Notas</label>
          <input className={inputCls} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Condiciones, crédito, etc." />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            if (!valid) return;
            onSave({ id: initial?.id || uid(), nombre: form.nombre.trim(), contacto: form.contacto.trim(), telefono: form.telefono.trim(), notas: form.notas.trim() });
          }}
          disabled={!valid}
          className={`${btnPrimary} ${btnDisabled}`}
        >
          Guardar
        </button>
        <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
      </div>
    </div>
  );
}

function TabProveedores({
  proveedores,
  reload,
}: {
  proveedores: Proveedor[];
  reload: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);

  const handleSave = (p: Proveedor) => {
    guardarProveedor(p);
    reload();
    setAdding(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    eliminarProveedor(id);
    reload();
  };

  return (
    <div className="space-y-3">
      {!adding && !editing && (
        <div className="flex justify-end">
          <button onClick={() => setAdding(true)} className={btnPrimary}>
            <IconPlus /> Nuevo proveedor
          </button>
        </div>
      )}

      {adding && <ProveedorForm onSave={handleSave} onCancel={() => setAdding(false)} />}
      {editing && <ProveedorForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}

      {!adding && !editing && proveedores.length === 0 && (
        <EmptyState label="No hay proveedores registrados" onAdd={() => setAdding(true)} />
      )}

      {!adding && !editing && proveedores.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_140px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Proveedor</span>
            <span>Contacto</span>
            <span>Teléfono</span>
            <span />
          </div>
          {proveedores.map((p, i) => (
            <div
              key={p.id}
              className={`flex sm:grid sm:grid-cols-[1fr_1fr_140px_36px] gap-3 items-start sm:items-center px-5 py-4 hover:bg-zinc-800/30 transition-colors ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{p.nombre}</p>
                {p.notas && <p className="text-xs text-zinc-500 mt-0.5 truncate">{p.notas}</p>}
              </div>
              <p className="hidden sm:block text-sm text-zinc-400 truncate">{p.contacto || <span className="text-zinc-700">—</span>}</p>
              <p className="hidden sm:block text-sm text-zinc-400 font-mono truncate">{p.telefono || <span className="text-zinc-700">—</span>}</p>
              <div className="flex gap-1 shrink-0 sm:justify-end">
                <button onClick={() => { setEditing(p); setAdding(false); }} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors" title="Editar">
                  <IconEdit />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Eliminar">
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — PRODUCTOS
// ══════════════════════════════════════════════════════════════════════════════

function ProductoPanelForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ProductoPanel;
  onSave: (p: ProductoPanel) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    marca: initial?.marca ?? "",
    modelo: initial?.modelo ?? "",
    potencia: initial ? String(initial.potencia) : "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.marca.trim() && form.modelo.trim() && Number(form.potencia) > 0;

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-zinc-900 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100">{initial ? "Editar panel" : "Nuevo panel"}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Marca *</label>
          <input className={inputCls} value={form.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Ej: Longi, Jinko..." />
        </div>
        <div>
          <label className={labelCls}>Modelo *</label>
          <input className={inputCls} value={form.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="Ej: Hi-MO 6 Pro" />
        </div>
        <div>
          <label className={labelCls}>Potencia (W) *</label>
          <input className={inputCls} type="number" min={0} value={form.potencia} onChange={(e) => set("potencia", e.target.value)} placeholder="550" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            if (!valid) return;
            onSave({ id: initial?.id || uid(), marca: form.marca.trim(), modelo: form.modelo.trim(), potencia: Number(form.potencia) });
          }}
          disabled={!valid}
          className={`${btnPrimary} ${btnDisabled}`}
        >
          Guardar
        </button>
        <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
      </div>
    </div>
  );
}

function ProductoMicroForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ProductoMicro;
  onSave: (m: ProductoMicro) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    marca: initial?.marca ?? "",
    modelo: initial?.modelo ?? "",
    panelesPorUnidad: initial ? String(initial.panelesPorUnidad) : "4",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.marca.trim() && form.modelo.trim() && Number(form.panelesPorUnidad) > 0;

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-zinc-900 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100">{initial ? "Editar microinversor" : "Nuevo microinversor"}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Marca *</label>
          <input className={inputCls} value={form.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Ej: APsystems, Enphase..." />
        </div>
        <div>
          <label className={labelCls}>Modelo *</label>
          <input className={inputCls} value={form.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="Ej: DS3D" />
        </div>
        <div>
          <label className={labelCls}>Paneles por unidad *</label>
          <input className={inputCls} type="number" min={1} step={1} value={form.panelesPorUnidad} onChange={(e) => set("panelesPorUnidad", e.target.value)} placeholder="4" />
          <p className="mt-1 text-xs text-zinc-600">DS3D = 4 · YC600 = 2 · IQ8 = 1</p>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            if (!valid) return;
            onSave({ id: initial?.id || uid(), marca: form.marca.trim(), modelo: form.modelo.trim(), panelesPorUnidad: Number(form.panelesPorUnidad) });
          }}
          disabled={!valid}
          className={`${btnPrimary} ${btnDisabled}`}
        >
          Guardar
        </button>
        <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
      </div>
    </div>
  );
}

function TabProductos({
  paneles,
  micros,
  ofertas,
  reload,
}: {
  paneles: ProductoPanel[];
  micros: ProductoMicro[];
  ofertas: Oferta[];
  reload: () => void;
}) {
  const [subTab, setSubTab] = useState<"paneles" | "micros">("paneles");
  const [addingPanel, setAddingPanel] = useState(false);
  const [editingPanel, setEditingPanel] = useState<ProductoPanel | null>(null);
  const [addingMicro, setAddingMicro] = useState(false);
  const [editingMicro, setEditingMicro] = useState<ProductoMicro | null>(null);

  const handleSavePanel = (p: ProductoPanel) => { guardarProductoPanel(p); reload(); setAddingPanel(false); setEditingPanel(null); };
  const handleDeletePanel = (id: string) => { eliminarProductoPanel(id); reload(); };
  const handleSaveMicro = (m: ProductoMicro) => { guardarProductoMicro(m); reload(); setAddingMicro(false); setEditingMicro(null); };
  const handleDeleteMicro = (id: string) => { eliminarProductoMicro(id); reload(); };

  const clearForms = () => { setAddingPanel(false); setEditingPanel(null); setAddingMicro(false); setEditingMicro(null); };

  return (
    <div className="space-y-4">
      {/* Sub-tabs for panel / micro */}
      <div className="flex gap-1 border-b border-zinc-800">
        {(["paneles", "micros"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setSubTab(t); clearForms(); }}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              subTab === t ? "border-amber-400 text-amber-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "paneles" ? "Paneles" : "Microinversores"}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${subTab === t ? "bg-amber-400/15 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
              {t === "paneles" ? paneles.length : micros.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Paneles ── */}
      {subTab === "paneles" && (
        <div className="space-y-3">
          {!addingPanel && !editingPanel && (
            <div className="flex justify-end">
              <button onClick={() => setAddingPanel(true)} className={btnPrimary}><IconPlus /> Nuevo panel</button>
            </div>
          )}
          {addingPanel && <ProductoPanelForm onSave={handleSavePanel} onCancel={() => setAddingPanel(false)} />}
          {editingPanel && <ProductoPanelForm initial={editingPanel} onSave={handleSavePanel} onCancel={() => setEditingPanel(null)} />}

          {!addingPanel && !editingPanel && paneles.length === 0 && (
            <EmptyState label="No hay paneles registrados" onAdd={() => setAddingPanel(true)} />
          )}

          {!addingPanel && !editingPanel && paneles.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_80px_120px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                <span>Panel</span>
                <span className="text-right">Potencia</span>
                <span className="text-right">Mejor precio</span>
                <span />
              </div>
              {paneles.map((p, i) => {
                const best = mejorOferta(p.id, ofertas);
                return (
                  <div
                    key={p.id}
                    className={`flex sm:grid sm:grid-cols-[1fr_80px_120px_36px] gap-3 items-start sm:items-center px-5 py-4 hover:bg-zinc-800/30 transition-colors ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{p.marca} — {p.modelo}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {ofertasPorProducto(p.id, ofertas).length} oferta{ofertasPorProducto(p.id, ofertas).length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="hidden sm:block text-sm text-zinc-300 text-right font-mono">{p.potencia}W</p>
                    <div className="hidden sm:block text-right">
                      {best ? (
                        <p className="text-sm font-semibold text-amber-400 font-mono">${fmt3(best.precio)}/W</p>
                      ) : (
                        <p className="text-sm text-zinc-600">Sin ofertas</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 sm:justify-end">
                      <button onClick={() => { setEditingPanel(p); setAddingPanel(false); }} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors" title="Editar"><IconEdit /></button>
                      <button onClick={() => handleDeletePanel(p.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Eliminar"><IconTrash /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Micros ── */}
      {subTab === "micros" && (
        <div className="space-y-3">
          {!addingMicro && !editingMicro && (
            <div className="flex justify-end">
              <button onClick={() => setAddingMicro(true)} className={btnPrimary}><IconPlus /> Nuevo microinversor</button>
            </div>
          )}
          {addingMicro && <ProductoMicroForm onSave={handleSaveMicro} onCancel={() => setAddingMicro(false)} />}
          {editingMicro && <ProductoMicroForm initial={editingMicro} onSave={handleSaveMicro} onCancel={() => setEditingMicro(null)} />}

          {!addingMicro && !editingMicro && micros.length === 0 && (
            <EmptyState label="No hay microinversores registrados" onAdd={() => setAddingMicro(true)} />
          )}

          {!addingMicro && !editingMicro && micros.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_80px_120px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                <span>Microinversor</span>
                <span className="text-center">Pan./u.</span>
                <span className="text-right">Mejor precio</span>
                <span />
              </div>
              {micros.map((m, i) => {
                const best = mejorOferta(m.id, ofertas);
                return (
                  <div
                    key={m.id}
                    className={`flex sm:grid sm:grid-cols-[1fr_80px_120px_36px] gap-3 items-start sm:items-center px-5 py-4 hover:bg-zinc-800/30 transition-colors ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{m.marca} — {m.modelo}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {ofertasPorProducto(m.id, ofertas).length} oferta{ofertasPorProducto(m.id, ofertas).length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="hidden sm:block text-sm text-zinc-300 text-center font-mono">{m.panelesPorUnidad}</p>
                    <div className="hidden sm:block text-right">
                      {best ? (
                        <p className="text-sm font-semibold text-amber-400 font-mono">${fmt2(best.precio)} USD</p>
                      ) : (
                        <p className="text-sm text-zinc-600">Sin ofertas</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 sm:justify-end">
                      <button onClick={() => { setEditingMicro(m); setAddingMicro(false); }} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors" title="Editar"><IconEdit /></button>
                      <button onClick={() => handleDeleteMicro(m.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Eliminar"><IconTrash /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — OFERTAS
// ══════════════════════════════════════════════════════════════════════════════

function OfertaForm({
  initial,
  proveedores,
  paneles,
  micros,
  onSave,
  onCancel,
}: {
  initial?: Oferta;
  proveedores: Proveedor[];
  paneles: ProductoPanel[];
  micros: ProductoMicro[];
  onSave: (o: Oferta) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    proveedorId: initial?.proveedorId ?? "",
    tipo: initial?.tipo ?? ("panel" as "panel" | "micro"),
    productoId: initial?.productoId ?? "",
    precio: initial ? String(initial.precio) : "",
    precioCable: initial?.precioCable != null ? String(initial.precioCable) : "",
    fecha: toLocalInput(initial?.fecha),
    notas: initial?.notas ?? "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const productos = form.tipo === "panel"
    ? paneles.map((p) => ({ id: p.id, label: `${p.marca} ${p.modelo} (${p.potencia}W)` }))
    : micros.map((m) => ({ id: m.id, label: `${m.marca} ${m.modelo} (${m.panelesPorUnidad} pan/u)` }));

  const valid = form.proveedorId && form.productoId && Number(form.precio) > 0;

  const selectedPanel = form.tipo === "panel" ? paneles.find((p) => p.id === form.productoId) : null;

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-zinc-900 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100">{initial ? "Editar oferta" : "Nueva oferta"}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Proveedor *</label>
          <select className={inputCls} value={form.proveedorId} onChange={(e) => set("proveedorId", e.target.value)}>
            <option value="">Selecciona...</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo *</label>
          <select
            className={inputCls}
            value={form.tipo}
            onChange={(e) => { set("tipo", e.target.value); set("productoId", ""); }}
            disabled={!!initial}
          >
            <option value="panel">Panel</option>
            <option value="micro">Microinversor</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Producto *</label>
          <select className={inputCls} value={form.productoId} onChange={(e) => set("productoId", e.target.value)}>
            <option value="">Selecciona...</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{form.tipo === "panel" ? "Precio / watt (USD sin IVA) *" : "Precio por unidad (USD sin IVA) *"}</label>
          <input className={inputCls} type="number" min={0} step={form.tipo === "panel" ? 0.001 : 0.01} value={form.precio} onChange={(e) => set("precio", e.target.value)} placeholder={form.tipo === "panel" ? "0.185" : "180.00"} />
        </div>
        {form.tipo === "micro" && (
          <div>
            <label className={labelCls}>Cable troncal / unidad (USD sin IVA)</label>
            <input className={inputCls} type="number" min={0} step={0.01} value={form.precioCable} onChange={(e) => set("precioCable", e.target.value)} placeholder="25.00" />
          </div>
        )}
        <div>
          <label className={labelCls}>Fecha y hora</label>
          <input className={inputCls} type="datetime-local" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Notas</label>
          <input className={inputCls} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Condiciones, vigencia, etc." />
        </div>
      </div>

      {selectedPanel && form.precio && Number(form.precio) > 0 && (
        <div className="rounded-lg bg-amber-400/5 border border-amber-400/20 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Precio por panel ({selectedPanel.potencia}W)</span>
          <span className="text-sm font-semibold text-amber-400 font-mono">
            ${fmt2(selectedPanel.potencia * Number(form.precio))} USD
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            if (!valid) return;
            onSave({
              id: initial?.id || uid(),
              proveedorId: form.proveedorId,
              productoId: form.productoId,
              tipo: form.tipo,
              precio: Number(form.precio),
              precioCable: form.tipo === "micro" && form.precioCable ? Number(form.precioCable) : undefined,
              fecha: new Date(form.fecha).toISOString(),
              notas: form.notas.trim(),
            });
          }}
          disabled={!valid}
          className={`${btnPrimary} ${btnDisabled}`}
        >
          Guardar
        </button>
        <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
      </div>
    </div>
  );
}

function TabOfertas({
  proveedores,
  paneles,
  micros,
  ofertas,
  reload,
}: {
  proveedores: Proveedor[];
  paneles: ProductoPanel[];
  micros: ProductoMicro[];
  ofertas: Oferta[];
  reload: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Oferta | null>(null);
  const [filterProv, setFilterProv] = useState("");
  const [filterTipo, setFilterTipo] = useState<"" | "panel" | "micro">("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const provMap = useMemo(() => {
    const m = new Map<string, string>();
    proveedores.forEach((p) => m.set(p.id, p.nombre));
    return m;
  }, [proveedores]);

  const prodMap = useMemo(() => {
    const m = new Map<string, string>();
    paneles.forEach((p) => m.set(p.id, `${p.marca} ${p.modelo} (${p.potencia}W)`));
    micros.forEach((p) => m.set(p.id, `${p.marca} ${p.modelo} (${p.panelesPorUnidad} pan/u)`));
    return m;
  }, [paneles, micros]);

  const filtered = useMemo(() => {
    let list = [...ofertas];
    if (filterProv) list = list.filter((o) => o.proveedorId === filterProv);
    if (filterTipo) list = list.filter((o) => o.tipo === filterTipo);
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [ofertas, filterProv, filterTipo]);

  const handleSave = (o: Oferta) => {
    guardarOferta(o);
    reload();
    setAdding(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    eliminarOferta(id);
    reload();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${inputCls} w-auto min-w-[160px]`} value={filterProv} onChange={(e) => setFilterProv(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className={`${inputCls} w-auto min-w-[140px]`} value={filterTipo} onChange={(e) => setFilterTipo(e.target.value as "" | "panel" | "micro")}>
          <option value="">Todo tipo</option>
          <option value="panel">Paneles</option>
          <option value="micro">Microinversores</option>
        </select>
        <div className="flex-1" />
        {!adding && !editing && (
          <button onClick={() => setAdding(true)} className={btnPrimary}><IconPlus /> Nueva oferta</button>
        )}
      </div>

      {adding && <OfertaForm proveedores={proveedores} paneles={paneles} micros={micros} onSave={handleSave} onCancel={() => setAdding(false)} />}
      {editing && <OfertaForm initial={editing} proveedores={proveedores} paneles={paneles} micros={micros} onSave={handleSave} onCancel={() => setEditing(null)} />}

      {!adding && !editing && filtered.length === 0 && (
        <EmptyState label="No hay ofertas registradas" onAdd={() => setAdding(true)} />
      )}

      {!adding && !editing && filtered.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_100px_90px_70px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Producto</span>
            <span>Proveedor</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Fecha</span>
            <span className="text-center">Tend.</span>
            <span />
          </div>
          {filtered.map((o, i) => {
            const trend = tendenciaOferta(o.productoId, o.proveedorId, ofertas);
            const isExpanded = expandedProduct === `${o.productoId}:${o.proveedorId}`;
            const histKey = `${o.productoId}:${o.proveedorId}`;

            return (
              <div key={o.id}>
                <div
                  className={`flex sm:grid sm:grid-cols-[1fr_1fr_100px_90px_70px_36px] gap-3 items-start sm:items-center px-5 py-3.5 hover:bg-zinc-800/30 transition-colors cursor-pointer ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
                  onClick={() => setExpandedProduct(isExpanded ? null : histKey)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{prodMap.get(o.productoId) || "?"}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${o.tipo === "panel" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>
                      {o.tipo === "panel" ? "Panel" : "Micro"}
                    </span>
                  </div>
                  <p className="hidden sm:block text-sm text-zinc-400 truncate">{provMap.get(o.proveedorId) || "?"}</p>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-amber-400 font-mono">
                      ${o.tipo === "panel" ? fmt3(o.precio) + "/W" : fmt2(o.precio)}
                    </p>
                    {o.precioCable != null && o.precioCable > 0 && (
                      <p className="text-xs text-zinc-500 font-mono">+${fmt2(o.precioCable)} cable</p>
                    )}
                  </div>
                  <p className="hidden sm:block text-xs text-zinc-500 text-right">{fmtDateTime(o.fecha)}</p>
                  <div className="hidden sm:flex justify-center"><IconTrend dir={trend} /></div>
                  <div className="flex gap-1 shrink-0 sm:justify-end" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditing(o); setAdding(false); }} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors" title="Editar"><IconEdit /></button>
                    <button onClick={() => handleDelete(o.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Eliminar"><IconTrash /></button>
                  </div>
                </div>

                {/* Expanded: price history */}
                {isExpanded && (
                  <div className="bg-zinc-800/30 border-t border-zinc-800/60 px-5 py-3">
                    <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
                      Historial de precios — {provMap.get(o.proveedorId)}
                    </p>
                    <div className="space-y-1">
                      {historialPrecios(o.productoId, o.proveedorId, ofertas).map((h) => (
                        <div key={h.id} className="flex items-center gap-4 text-xs">
                          <span className="text-zinc-500 w-20">{fmtDateTime(h.fecha)}</span>
                          <span className="text-amber-400 font-mono font-semibold">
                            ${h.tipo === "panel" ? fmt3(h.precio) + "/W" : fmt2(h.precio)}
                          </span>
                          {h.notas && <span className="text-zinc-600 truncate">{h.notas}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

type Tab = "proveedores" | "productos" | "ofertas";

export default function CatalogoPage() {
  const [tab, setTab] = useState<Tab>("ofertas");

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [paneles, setPaneles] = useState<ProductoPanel[]>([]);
  const [micros, setMicros] = useState<ProductoMicro[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);

  const reload = () => {
    setProveedores(listarProveedores());
    setPaneles(listarProductosPaneles());
    setMicros(listarProductosMicros());
    setOfertas(listarOfertas());
  };

  useEffect(() => {
    migrarCatalogoLegacy();
    reload();
  }, []);

  const tabDef: { key: Tab; label: string; count: number }[] = [
    { key: "proveedores", label: "Proveedores", count: proveedores.length },
    { key: "productos", label: "Productos", count: paneles.length + micros.length },
    { key: "ofertas", label: "Ofertas", count: ofertas.length },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
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
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Catálogo de productos</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Proveedores, productos y ofertas — compara precios y lleva historial
          </p>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 border-b border-zinc-800 pb-0">
          {tabDef.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-amber-400/15 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {tab === "proveedores" && <TabProveedores proveedores={proveedores} reload={reload} />}
        {tab === "productos" && <TabProductos paneles={paneles} micros={micros} ofertas={ofertas} reload={reload} />}
        {tab === "ofertas" && <TabOfertas proveedores={proveedores} paneles={paneles} micros={micros} ofertas={ofertas} reload={reload} />}
      </main>
    </div>
  );
}
