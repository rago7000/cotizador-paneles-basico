"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  consolidarProveedores,
  consolidarProductos,
  guardarArchivoProveedor,
  listarArchivosProveedor,
  obtenerArchivoProveedor,
} from "../lib/storage";
import type {
  Proveedor,
  ProductoPanel,
  ProductoMicro,
  Oferta,
  PrecioTier,
  ArchivoProveedor,
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
  const [tiers, setTiers] = useState<PrecioTier[]>(initial?.precioTiers ?? []);
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

      {/* Tiers de volumen */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-500">Precios por volumen (opcional)</label>
          <button
            type="button"
            onClick={() => setTiers((t) => [...t, { etiqueta: "", precio: 0 }])}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            + Agregar tier
          </button>
        </div>
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${inputCls} w-40`}
              value={t.etiqueta}
              onChange={(e) => setTiers((prev) => prev.map((tt, idx) => idx === i ? { ...tt, etiqueta: e.target.value } : tt))}
              placeholder="ej: 1 pallet (36 pzas)"
            />
            <input
              className={`${inputCls} w-24`}
              type="number"
              step={0.001}
              value={t.precio || ""}
              onChange={(e) => setTiers((prev) => prev.map((tt, idx) => idx === i ? { ...tt, precio: Number(e.target.value) || 0 } : tt))}
              placeholder="0.156"
            />
            <button
              onClick={() => setTiers((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
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
            const validTiers = tiers.filter((t) => t.etiqueta.trim() && t.precio > 0);
            onSave({
              id: initial?.id || uid(),
              proveedorId: form.proveedorId,
              productoId: form.productoId,
              tipo: form.tipo,
              precio: Number(form.precio),
              precioTiers: validTiers.length > 0 ? validTiers : undefined,
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

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTADOR PDF — extrae precios de PDFs de proveedores con AI
// ══════════════════════════════════════════════════════════════════════════════

/** Normaliza nombre para comparaciones: minúsculas, sin espacios extra, sin acentos */
const normalizeName = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").trim();

interface ImportTier {
  etiqueta: string;
  precio: number;
}

interface ImportItem {
  selected: boolean;
  tipo: string;
  marca: string;
  modelo: string;
  descripcion: string;
  potencia: number;
  panelesPorUnidad: number;
  precio: number;
  precioTiers: ImportTier[];
  moneda: string;
  unidad: string;
  notas: string;
}

function ImportadorPDF({
  proveedores,
  paneles,
  micros,
  ofertas,
  onDone,
  onCancel,
}: {
  proveedores: Proveedor[];
  paneles: ProductoPanel[];
  micros: ProductoMicro[];
  ofertas: Oferta[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"upload" | "loading" | "review" | "done">("upload");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [nuevoProvNombre, setNuevoProvNombre] = useState("");
  const [fechaDocumento, setFechaDocumento] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [condiciones, setCondiciones] = useState("");
  const [resumenCondiciones, setResumenCondiciones] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [showCondiciones, setShowCondiciones] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStep("loading");
    setError("");

    // Read PDF as base64 for storage
    const arrayBuf = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    setPdfBase64(btoa(binary));

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/leer-catalogo", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("upload"); return; }

      const extracted: ImportItem[] = (data.items || []).map((it: Record<string, unknown>) => {
        const tiers: ImportTier[] = Array.isArray(it.precioTiers)
          ? (it.precioTiers as Record<string, unknown>[]).map((t) => ({ etiqueta: String(t.etiqueta || ""), precio: Number(t.precio) || 0 })).filter((t) => t.precio > 0)
          : [];
        return {
          selected: true,
          tipo: String(it.tipo || "otro"),
          marca: String(it.marca || ""),
          modelo: String(it.modelo || ""),
          descripcion: String(it.descripcion || ""),
          potencia: Number(it.potencia) || 0,
          panelesPorUnidad: Number(it.panelesPorUnidad) || 0,
          precio: Number(it.precio) || 0,
          precioTiers: tiers,
          moneda: String(it.moneda || "USD"),
          unidad: String(it.unidad || "por_unidad"),
          notas: String(it.notas || ""),
        };
      });

      if (extracted.length === 0) { setError("No se encontraron productos en el PDF"); setStep("upload"); return; }

      setItems(extracted);
      // Capture metadata from PDF
      if (data.fechaDocumento) setFechaDocumento(data.fechaDocumento);
      if (data.condiciones) setCondiciones(data.condiciones);
      if (data.resumenCondiciones) setResumenCondiciones(data.resumenCondiciones);
      // Auto-set proveedor with fuzzy matching (normalized)
      if (data.proveedor) {
        const norm = normalizeName(data.proveedor);
        const match = proveedores.find((p) => normalizeName(p.nombre) === norm);
        if (match) setProveedorId(match.id);
        else setNuevoProvNombre(data.proveedor);
      }
      setStep("review");
    } catch {
      setError("Error al procesar el PDF");
      setStep("upload");
    }
  };

  const updateItem = (i: number, field: keyof ImportItem, value: unknown) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };

  const handleSave = () => {
    // Resolve proveedor — fuzzy match existing by normalized name
    let provId = proveedorId;
    if (!provId && nuevoProvNombre.trim()) {
      const norm = normalizeName(nuevoProvNombre);
      const existingProv = proveedores.find((p) => normalizeName(p.nombre) === norm);
      if (existingProv) {
        provId = existingProv.id;
      } else {
        const newProv: Proveedor = { id: uid(), nombre: nuevoProvNombre.trim(), contacto: "", telefono: "", notas: `Importado de ${fileName}` };
        guardarProveedor(newProv);
        provId = newProv.id;
      }
    }
    if (!provId) return;

    // Use document date from PDF if available, else current date
    const fechaOferta = fechaDocumento
      ? new Date(fechaDocumento + "T00:00:00").toISOString()
      : new Date().toISOString();

    // Save PDF archive
    const archivoId = uid();
    guardarArchivoProveedor({
      id: archivoId,
      nombre: fileName,
      proveedorId: provId,
      fechaImportacion: new Date().toISOString(),
      fechaDocumento: fechaDocumento || "",
      condiciones,
      resumenCondiciones,
      base64: pdfBase64,
    });

    let count = 0;
    let skipped = 0;
    const selected = items.filter((it) => it.selected && it.precio > 0);

    for (const it of selected) {
      if (it.tipo === "panel" || it.tipo === "micro") {
        // Match existing product by normalized marca+modelo
        let prodId = "";
        if (it.tipo === "panel") {
          const match = paneles.find((p) =>
            normalizeName(p.marca) === normalizeName(it.marca) &&
            normalizeName(p.modelo) === normalizeName(it.modelo)
          );
          if (match) {
            prodId = match.id;
          } else {
            const newProd: ProductoPanel = { id: uid(), marca: it.marca || "Sin marca", modelo: it.modelo || it.descripcion.slice(0, 40), potencia: it.potencia };
            guardarProductoPanel(newProd);
            prodId = newProd.id;
          }
        } else {
          const match = micros.find((p) =>
            normalizeName(p.marca) === normalizeName(it.marca) &&
            normalizeName(p.modelo) === normalizeName(it.modelo)
          );
          if (match) {
            prodId = match.id;
          } else {
            const newProd: ProductoMicro = { id: uid(), marca: it.marca || "Sin marca", modelo: it.modelo || it.descripcion.slice(0, 40), panelesPorUnidad: it.panelesPorUnidad || 4 };
            guardarProductoMicro(newProd);
            prodId = newProd.id;
          }
        }

        // Dedup: check if an offer already exists with same proveedor + producto + precio
        const existingOffer = ofertas.find((o) =>
          o.proveedorId === provId &&
          o.productoId === prodId &&
          Math.abs(o.precio - it.precio) < 0.001
        );
        if (existingOffer) {
          skipped++;
          continue;
        }

        const oferta: Oferta = {
          id: uid(),
          proveedorId: provId,
          productoId: prodId,
          tipo: it.tipo as "panel" | "micro",
          precio: it.precio,
          precioTiers: it.precioTiers.length > 0 ? it.precioTiers : undefined,
          precioCable: it.tipo === "micro" ? 0 : undefined,
          fecha: fechaOferta,
          notas: [it.descripcion, it.notas, `${it.moneda} ${it.unidad}`, `Importado de ${fileName}`].filter(Boolean).join(" · "),
          archivoOrigenId: archivoId,
        };
        guardarOferta(oferta);
        count++;
      }
    }

    setSavedCount(count);
    setSkippedCount(skipped);
    setStep("done");
  };

  const selectedCount = items.filter((it) => it.selected && it.precio > 0).length;
  const canSave = selectedCount > 0 && (proveedorId || nuevoProvNombre.trim());

  // ── Upload step ──
  if (step === "upload") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-zinc-900 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-emerald-400">Importar precios desde archivo</h3>
        <p className="text-xs text-zinc-500">Sube un PDF o imagen (JPG, PNG) de lista de precios de proveedor. La AI extraerá los productos y precios automáticamente.</p>
        {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            Seleccionar archivo
          </button>
          <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
        </div>
      </div>
    );
  }

  // ── Loading step ──
  if (step === "loading") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-zinc-900 p-8 flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">Analizando <span className="text-zinc-200 font-medium">{fileName}</span>…</p>
        <p className="text-[10px] text-zinc-600">Esto puede tomar unos segundos</p>
      </div>
    );
  }

  // ── Done step ──
  if (step === "done") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-zinc-900 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-emerald-400">Importación completa</h3>
        <p className="text-xs text-zinc-400">
          Se guardaron <span className="text-emerald-400 font-bold">{savedCount}</span> ofertas desde <span className="text-zinc-200">{fileName}</span>
          {skippedCount > 0 && <span className="text-amber-400 ml-1">({skippedCount} duplicadas omitidas)</span>}
        </p>
        {fechaDocumento && <p className="text-[10px] text-zinc-600">Fecha del documento: {fechaDocumento}</p>}
        <button onClick={onDone} className={btnPrimary}>Cerrar</button>
      </div>
    );
  }

  // ── Review step ──
  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-emerald-400">Revisar items extraídos</h3>
          <p className="text-[10px] text-zinc-600">{fileName} — {items.length} items encontrados</p>
        </div>
      </div>

      {/* Proveedor + fecha selector */}
      <div className="px-5 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-3">
        <label className="text-xs text-zinc-400 font-medium">Proveedor:</label>
        <select
          className={`${inputCls} w-auto min-w-[180px]`}
          value={proveedorId}
          onChange={(e) => { setProveedorId(e.target.value); if (e.target.value) setNuevoProvNombre(""); }}
        >
          <option value="">— Crear nuevo —</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        {!proveedorId && (
          <input
            className={`${inputCls} w-auto min-w-[200px]`}
            value={nuevoProvNombre}
            onChange={(e) => setNuevoProvNombre(e.target.value)}
            placeholder="Nombre del nuevo proveedor"
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-zinc-400 font-medium">Fecha precios:</label>
          <input
            type="date"
            className={`${inputCls} w-auto`}
            value={fechaDocumento}
            onChange={(e) => setFechaDocumento(e.target.value)}
          />
          {fechaDocumento && <span className="text-[10px] text-emerald-400/70">extraída del PDF</span>}
        </div>
      </div>

      {/* Condiciones del proveedor */}
      {resumenCondiciones && (
        <div className="px-5 py-3 border-b border-zinc-800">
          <button
            onClick={() => setShowCondiciones(!showCondiciones)}
            className="flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showCondiciones ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            Condiciones del proveedor
          </button>
          <div className="mt-2 text-xs text-zinc-400 whitespace-pre-line leading-relaxed">
            {resumenCondiciones}
          </div>
          {showCondiciones && condiciones && (
            <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 text-[11px] text-zinc-500 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
              {condiciones}
            </div>
          )}
        </div>
      )}

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-800/60 text-zinc-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={items.every((it) => it.selected)}
                  onChange={(e) => setItems((prev) => prev.map((it) => ({ ...it, selected: e.target.checked })))}
                  className="accent-emerald-400"
                />
              </th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Marca</th>
              <th className="px-3 py-2 text-left">Modelo / Descripción</th>
              <th className="px-3 py-2 text-right">Precio</th>
              <th className="px-3 py-2 text-center">Moneda</th>
              <th className="px-3 py-2 text-center">Unidad</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className={`border-t border-zinc-800/50 ${it.selected ? "" : "opacity-40"}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={it.selected} onChange={(e) => updateItem(i, "selected", e.target.checked)} className="accent-emerald-400" />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="bg-transparent border-none text-xs text-zinc-300 outline-none"
                    value={it.tipo}
                    onChange={(e) => updateItem(i, "tipo", e.target.value)}
                  >
                    <option value="panel">Panel</option>
                    <option value="micro">Micro</option>
                    <option value="cable">Cable</option>
                    <option value="ecu">ECU</option>
                    <option value="herramienta">Herramienta</option>
                    <option value="estructura">Estructura</option>
                    <option value="tornilleria">Tornillería</option>
                    <option value="otro">Otro</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="bg-transparent border-none text-xs text-zinc-300 outline-none w-20"
                    value={it.marca}
                    onChange={(e) => updateItem(i, "marca", e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="bg-transparent border-none text-xs text-zinc-300 outline-none w-full"
                    value={it.modelo || it.descripcion}
                    onChange={(e) => updateItem(i, "modelo", e.target.value)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <input
                      type="number"
                      step="0.001"
                      className="bg-transparent border-none text-xs text-zinc-100 font-mono outline-none w-20 text-right"
                      value={it.precio}
                      onChange={(e) => updateItem(i, "precio", Number(e.target.value) || 0)}
                    />
                    {it.precioTiers.length > 0 && (
                      <div className="space-y-px">
                        {it.precioTiers.map((t, ti) => (
                          <div key={ti} className="flex items-center gap-1 text-[10px]">
                            <span className="text-zinc-600">{t.etiqueta}:</span>
                            <span className={`font-mono ${t.precio === it.precio ? "text-emerald-400" : "text-zinc-500"}`}>
                              {t.precio}
                            </span>
                            {t.precio !== it.precio && (
                              <button
                                onClick={() => updateItem(i, "precio", t.precio)}
                                className="text-[9px] text-emerald-400/60 hover:text-emerald-400 transition-colors"
                                title="Usar este precio"
                              >
                                usar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <select
                    className="bg-transparent border-none text-xs text-zinc-400 outline-none"
                    value={it.moneda}
                    onChange={(e) => updateItem(i, "moneda", e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-center">
                  <select
                    className="bg-transparent border-none text-xs text-zinc-400 outline-none"
                    value={it.unidad}
                    onChange={(e) => updateItem(i, "unidad", e.target.value)}
                  >
                    <option value="por_watt">/W</option>
                    <option value="por_unidad">/pza</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {selectedCount} de {items.length} seleccionados
          {selectedCount > 0 && items.filter((it) => it.selected && (it.tipo !== "panel" && it.tipo !== "micro")).length > 0 && (
            <span className="text-amber-400 ml-2">· Solo paneles y micros crean ofertas</span>
          )}
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors ${btnDisabled}`}
          >
            Guardar {selectedCount} ofertas
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ARCHIVO VIEWER MODAL — vista previa PDF/imagen + condiciones
// ══════════════════════════════════════════════════════════════════════════════

function ArchivoViewerModal({ archivo, onClose }: { archivo: ArchivoProveedor; onClose: () => void }) {
  const [tab, setTab] = useState<"preview" | "condiciones">("preview");

  const isPdf = archivo.nombre.toLowerCase().endsWith(".pdf");
  const dataUrl = archivo.base64
    ? isPdf
      ? `data:application/pdf;base64,${archivo.base64}`
      : `data:image/${archivo.nombre.toLowerCase().endsWith(".png") ? "png" : "jpeg"};base64,${archivo.base64}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-5xl h-[90vh] flex flex-col m-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{archivo.nombre}</h3>
            <p className="text-[10px] text-zinc-500">
              Importado {fmtDateTime(archivo.fechaImportacion)}
              {archivo.fechaDocumento && <> · Precios de <span className="text-emerald-400">{archivo.fechaDocumento}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dataUrl && (
              <a
                href={dataUrl}
                download={archivo.nombre}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Descargar
              </a>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none px-2">&times;</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-2 border-b border-zinc-800 shrink-0">
          <button
            onClick={() => setTab("preview")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${tab === "preview" ? "bg-amber-400/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Vista previa
          </button>
          {(archivo.resumenCondiciones || archivo.condiciones) && (
            <button
              onClick={() => setTab("condiciones")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${tab === "condiciones" ? "bg-amber-400/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Condiciones
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === "preview" && dataUrl && (
            isPdf ? (
              <iframe src={dataUrl} className="w-full h-full border-0" title={archivo.nombre} />
            ) : (
              <div className="w-full h-full overflow-auto flex items-start justify-center p-4 bg-zinc-950">
                <img src={dataUrl} alt={archivo.nombre} className="max-w-full h-auto" />
              </div>
            )
          )}
          {tab === "preview" && !dataUrl && (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              No hay vista previa disponible
            </div>
          )}
          {tab === "condiciones" && (
            <div className="overflow-y-auto h-full p-5 space-y-4">
              {archivo.resumenCondiciones && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Puntos clave para la compra</h4>
                  <div className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">{archivo.resumenCondiciones}</div>
                </div>
              )}
              {archivo.condiciones && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Condiciones completas del proveedor</h4>
                  <div className="text-[11px] text-zinc-500 whitespace-pre-line leading-relaxed p-3 rounded-lg bg-zinc-800/50">{archivo.condiciones}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — OFERTAS
// ══════════════════════════════════════════════════════════════════════════════

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
  const [importing, setImporting] = useState(false);
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

  const archivosMap = useMemo(() => {
    const m = new Map<string, ArchivoProveedor>();
    listarArchivosProveedor().forEach((a) => m.set(a.id, a));
    return m;
  }, [ofertas]); // re-compute when offers change (new import)

  const [viewingArchivo, setViewingArchivo] = useState<ArchivoProveedor | null>(null);

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
        {!adding && !editing && !importing && (
          <>
            <button onClick={() => setImporting(true)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Importar precios
            </button>
            <button onClick={() => setAdding(true)} className={btnPrimary}><IconPlus /> Nueva oferta</button>
          </>
        )}
      </div>

      {importing && <ImportadorPDF proveedores={proveedores} paneles={paneles} micros={micros} ofertas={ofertas} onDone={() => { setImporting(false); reload(); }} onCancel={() => setImporting(false)} />}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${o.tipo === "panel" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>
                        {o.tipo === "panel" ? "Panel" : "Micro"}
                      </span>
                      {o.archivoOrigenId && archivosMap.has(o.archivoOrigenId) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewingArchivo(archivosMap.get(o.archivoOrigenId!)!); }}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/70 hover:text-emerald-400 transition-colors truncate max-w-[150px]"
                          title={archivosMap.get(o.archivoOrigenId)?.nombre}
                        >
                          PDF: {archivosMap.get(o.archivoOrigenId)?.nombre}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="hidden sm:block text-sm text-zinc-400 truncate">{provMap.get(o.proveedorId) || "?"}</p>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-amber-400 font-mono">
                      ${o.tipo === "panel" ? fmt3(o.precio) + "/W" : fmt2(o.precio)}
                    </p>
                    {o.precioCable != null && o.precioCable > 0 && (
                      <p className="text-xs text-zinc-500 font-mono">+${fmt2(o.precioCable)} cable</p>
                    )}
                    {o.precioTiers && o.precioTiers.length > 0 && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {o.precioTiers.map((t) => `${t.etiqueta}: $${o.tipo === "panel" ? fmt3(t.precio) : fmt2(t.precio)}`).join(" · ")}
                      </p>
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

      {/* Modal: ver archivo de origen */}
      {viewingArchivo && (
        <ArchivoViewerModal archivo={viewingArchivo} onClose={() => setViewingArchivo(null)} />
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
    consolidarProveedores();
    consolidarProductos();
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
