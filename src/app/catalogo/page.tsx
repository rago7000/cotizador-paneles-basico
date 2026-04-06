"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import AppNav from "../components/AppNav";
import {
  TIPO_LABELS,
} from "../lib/storage";
import type {
  PrecioTier,
  TipoOferta,
} from "../lib/types";
import {
  useConvexCatalogo,
  ofertasPorProducto,
  mejorOferta,
  tendenciaOferta,
  historialPrecios,
  type Proveedor,
  type ProductoPanel,
  type ProductoMicro,
  type ProductoGeneral,
  type Oferta,
  type ArchivoProveedor,
} from "../lib/useConvexCatalogo";

// ── Convex context type ─────────────────────────────────────────────────────

type CatalogoCtx = ReturnType<typeof useConvexCatalogo>;

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
  onSave: (p: { id?: string; nombre: string; contacto: string; telefono: string; notas: string }) => void;
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

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Buscar..."}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-8 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}

function TabProveedores({
  proveedores,
  reload,
  ctx,
}: {
  proveedores: Proveedor[];
  reload: () => void;
  ctx: CatalogoCtx;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const handleSave = async (p: { id?: string; nombre: string; contacto: string; telefono: string; notas: string }) => {
    await ctx.guardarProveedor(p);
    setAdding(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await ctx.eliminarProveedor(id);
  };

  const q = busqueda.toLowerCase().trim();
  const filtrados = useMemo(() => {
    if (!q) return proveedores;
    return proveedores.filter((p) =>
      `${p.nombre} ${p.contacto} ${p.notas}`.toLowerCase().includes(q)
    );
  }, [proveedores, q]);

  return (
    <div className="space-y-3">
      {!adding && !editing && proveedores.length > 0 && (
        <div className="flex items-center gap-2">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar proveedor..." />
          <button onClick={() => setAdding(true)} className={btnPrimary}>
            <IconPlus /> Nuevo proveedor
          </button>
        </div>
      )}

      {!adding && !editing && proveedores.length === 0 && (
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

      {!adding && !editing && proveedores.length > 0 && filtrados.length === 0 && (
        <p className="text-center text-sm text-zinc-600 py-8">Sin resultados para &ldquo;{busqueda}&rdquo;</p>
      )}

      {!adding && !editing && filtrados.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_140px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Proveedor</span>
            <span>Contacto</span>
            <span>Teléfono</span>
            <span />
          </div>
          {filtrados.map((p, i) => (
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
  onSave: (p: { id?: string; marca: string; modelo: string; potencia: number }) => void;
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
  onSave: (m: { id?: string; marca: string; modelo: string; panelesPorUnidad: number }) => void;
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
  generales,
  ofertas,
  reload,
  ctx,
}: {
  paneles: ProductoPanel[];
  micros: ProductoMicro[];
  generales: ProductoGeneral[];
  ofertas: Oferta[];
  reload: () => void;
  ctx: CatalogoCtx;
}) {
  const [subTab, setSubTab] = useState<"paneles" | "micros" | "otros">("paneles");
  const [addingPanel, setAddingPanel] = useState(false);
  const [editingPanel, setEditingPanel] = useState<ProductoPanel | null>(null);
  const [addingMicro, setAddingMicro] = useState(false);
  const [editingMicro, setEditingMicro] = useState<ProductoMicro | null>(null);

  // Search & filters
  const [busqueda, setBusqueda] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [ordenPaneles, setOrdenPaneles] = useState<"nombre" | "potencia" | "precio">("nombre");

  const marcasPaneles = useMemo(() => [...new Set(paneles.map((p) => p.marca))].sort(), [paneles]);
  const marcasMicros = useMemo(() => [...new Set(micros.map((m) => m.marca))].sort(), [micros]);
  const marcasGenerales = useMemo(() => [...new Set(generales.map((g) => g.marca))].sort(), [generales]);

  const q = busqueda.toLowerCase().trim();

  const panelesFiltrados = useMemo(() => {
    let list = paneles.filter((p) => {
      if (q && !`${p.marca} ${p.modelo} ${(p.aliases || []).join(" ")}`.toLowerCase().includes(q)) return false;
      if (filtroMarca && p.marca !== filtroMarca) return false;
      return true;
    });
    if (ordenPaneles === "potencia") list = [...list].sort((a, b) => b.potencia - a.potencia);
    else if (ordenPaneles === "precio") list = [...list].sort((a, b) => {
      const pa = mejorOferta(a.id, ofertas)?.precio ?? Infinity;
      const pb = mejorOferta(b.id, ofertas)?.precio ?? Infinity;
      return pa - pb;
    });
    else list = [...list].sort((a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`));
    return list;
  }, [paneles, ofertas, q, filtroMarca, ordenPaneles]);

  const microsFiltrados = useMemo(() => {
    let list = micros.filter((m) => {
      if (q && !`${m.marca} ${m.modelo} ${(m.aliases || []).join(" ")}`.toLowerCase().includes(q)) return false;
      if (filtroMarca && m.marca !== filtroMarca) return false;
      return true;
    });
    return list.sort((a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`));
  }, [micros, q, filtroMarca]);

  const handleSavePanel = async (p: { id?: string; marca: string; modelo: string; potencia: number; aliases?: string[] }) => { await ctx.guardarProductoPanel(p); setAddingPanel(false); setEditingPanel(null); };
  const handleDeletePanel = async (id: string) => { await ctx.eliminarProductoPanel(id); };
  const handleSetDefaultPanel = async (id: string) => { await ctx.setDefaultPanel(id); };
  const handleSaveMicro = async (m: { id?: string; marca: string; modelo: string; panelesPorUnidad: number; aliases?: string[] }) => { await ctx.guardarProductoMicro(m); setAddingMicro(false); setEditingMicro(null); };
  const handleDeleteMicro = async (id: string) => { await ctx.eliminarProductoMicro(id); };

  const clearForms = () => { setAddingPanel(false); setEditingPanel(null); setAddingMicro(false); setEditingMicro(null); setBusqueda(""); setFiltroMarca(""); };

  return (
    <div className="space-y-4">
      {/* Sub-tabs for panel / micro / otros */}
      <div className="flex gap-1 border-b border-zinc-800">
        {(["paneles", "micros", "otros"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setSubTab(t); clearForms(); setFiltroMarca(""); }}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              subTab === t ? "border-amber-400 text-amber-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "paneles" ? "Paneles" : t === "micros" ? "Microinversores" : "Otros"}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${subTab === t ? "bg-amber-400/15 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
              {t === "paneles" ? paneles.length : t === "micros" ? micros.length : generales.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      {!addingPanel && !editingPanel && !addingMicro && !editingMicro && (paneles.length > 0 || micros.length > 0 || generales.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar marca o modelo..." />
          <select
            value={filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-amber-400"
          >
            <option value="">Todas las marcas</option>
            {(subTab === "paneles" ? marcasPaneles : subTab === "micros" ? marcasMicros : marcasGenerales).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Sort (paneles only) */}
          {subTab === "paneles" && (
            <select
              value={ordenPaneles}
              onChange={(e) => setOrdenPaneles(e.target.value as "nombre" | "potencia" | "precio")}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-amber-400"
            >
              <option value="nombre">Ordenar: Nombre</option>
              <option value="potencia">Ordenar: Potencia</option>
              <option value="precio">Ordenar: Precio</option>
            </select>
          )}

          {/* Result count */}
          {(busqueda || filtroMarca) && (
            <span className="text-[10px] text-zinc-600">
              {subTab === "paneles" ? panelesFiltrados.length : microsFiltrados.length} resultado{(subTab === "paneles" ? panelesFiltrados.length : microsFiltrados.length) !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

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

          {!addingPanel && !editingPanel && paneles.length > 0 && panelesFiltrados.length === 0 && (
            <p className="text-center text-sm text-zinc-600 py-8">Sin resultados para &ldquo;{busqueda || filtroMarca}&rdquo;</p>
          )}

          {!addingPanel && !editingPanel && panelesFiltrados.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_80px_120px_72px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                <span>Panel</span>
                <span className="text-right">Potencia</span>
                <span className="text-right">Mejor precio</span>
                <span />
              </div>
              {panelesFiltrados.map((p, i) => {
                const best = mejorOferta(p.id, ofertas);
                const isDefault = !!(p as unknown as { esDefault?: boolean }).esDefault;
                return (
                  <div
                    key={p.id}
                    className={`flex sm:grid sm:grid-cols-[1fr_80px_120px_72px] gap-3 items-start sm:items-center px-5 py-4 hover:bg-zinc-800/30 transition-colors ${i > 0 ? "border-t border-zinc-800/60" : ""} ${isDefault ? "bg-amber-400/5" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-100 truncate">{p.marca} — {p.modelo}</p>
                        {isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/25 text-amber-400 font-semibold shrink-0">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-500">
                          {ofertasPorProducto(p.id, ofertas).length} oferta{ofertasPorProducto(p.id, ofertas).length !== 1 ? "s" : ""}
                        </span>
                        {p.aliases && p.aliases.length > 0 && (
                          <span className="text-[10px] text-zinc-600" title={`Nombres fusionados:\n${p.aliases.join("\n")}`}>
                            +{p.aliases.length} alias
                          </span>
                        )}
                      </div>
                      {p.aliases && p.aliases.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {p.aliases.map((a, ai) => (
                            <p key={ai} className="text-[10px] text-zinc-600 truncate">aka: {a}</p>
                          ))}
                        </div>
                      )}
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
                      <button
                        onClick={() => handleSetDefaultPanel(p.id)}
                        className={`p-1.5 rounded-lg transition-colors ${isDefault ? "text-amber-400" : "text-zinc-700 hover:text-amber-400 hover:bg-amber-400/10"}`}
                        title={isDefault ? "Panel default" : "Marcar como default"}
                      >
                        <svg className="w-4 h-4" fill={isDefault ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                      </button>
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

          {!addingMicro && !editingMicro && micros.length > 0 && microsFiltrados.length === 0 && (
            <p className="text-center text-sm text-zinc-600 py-8">Sin resultados para &ldquo;{busqueda || filtroMarca}&rdquo;</p>
          )}

          {!addingMicro && !editingMicro && microsFiltrados.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_80px_120px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                <span>Microinversor</span>
                <span className="text-center">Pan./u.</span>
                <span className="text-right">Mejor precio</span>
                <span />
              </div>
              {microsFiltrados.map((m, i) => {
                const best = mejorOferta(m.id, ofertas);
                return (
                  <div
                    key={m.id}
                    className={`flex sm:grid sm:grid-cols-[1fr_80px_120px_36px] gap-3 items-start sm:items-center px-5 py-4 hover:bg-zinc-800/30 transition-colors ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{m.marca} — {m.modelo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-500">
                          {ofertasPorProducto(m.id, ofertas).length} oferta{ofertasPorProducto(m.id, ofertas).length !== 1 ? "s" : ""}
                        </span>
                        {m.aliases && m.aliases.length > 0 && (
                          <span className="text-[10px] text-zinc-600" title={`Nombres fusionados:\n${m.aliases.join("\n")}`}>
                            +{m.aliases.length} alias
                          </span>
                        )}
                      </div>
                      {m.aliases && m.aliases.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {m.aliases.map((a, ai) => (
                            <p key={ai} className="text-[10px] text-zinc-600 truncate">aka: {a}</p>
                          ))}
                        </div>
                      )}
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

      {/* ── Otros (Generales) ── */}
      {subTab === "otros" && (
        <div className="space-y-3">
          {generales.length === 0 && (
            <EmptyState label="No hay productos generales registrados" onAdd={() => {}} />
          )}

          {generales.length > 0 && (() => {
            const generalesFiltrados = generales.filter((g) => {
              if (q && !`${g.marca} ${g.modelo} ${g.descripcion} ${(g.aliases || []).join(" ")}`.toLowerCase().includes(q)) return false;
              if (filtroMarca && g.marca !== filtroMarca) return false;
              return true;
            }).sort((a, b) => `${a.categoria} ${a.marca} ${a.modelo}`.localeCompare(`${b.categoria} ${b.marca} ${b.modelo}`));

            if (generalesFiltrados.length === 0) {
              return <p className="text-center text-sm text-zinc-600 py-8">Sin resultados para &ldquo;{busqueda || filtroMarca}&rdquo;</p>;
            }

            return (
              <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="hidden sm:grid grid-cols-[100px_1fr_120px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  <span>Tipo</span>
                  <span>Producto</span>
                  <span className="text-right">Mejor precio</span>
                  <span />
                </div>
                {generalesFiltrados.map((g, i) => {
                  const best = mejorOferta(g.id, ofertas);
                  return (
                    <div
                      key={g.id}
                      className={`flex sm:grid sm:grid-cols-[100px_1fr_120px_36px] gap-3 items-start sm:items-center px-5 py-4 hover:bg-zinc-800/30 transition-colors ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
                    >
                      <span className={`text-xs px-1.5 py-0.5 rounded-full self-start ${
                        g.categoria === "monitoreo" ? "bg-cyan-500/15 text-cyan-400" :
                        g.categoria === "cable" ? "bg-orange-500/15 text-orange-400" :
                        g.categoria === "herramienta" ? "bg-pink-500/15 text-pink-400" :
                        g.categoria === "estructura" ? "bg-emerald-500/15 text-emerald-400" :
                        g.categoria === "tornilleria" ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-zinc-500/15 text-zinc-400"
                      }`}>
                        {TIPO_LABELS[g.categoria as TipoOferta] || g.categoria}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{g.marca} — {g.modelo}</p>
                        {g.descripcion && g.descripcion !== g.modelo && (
                          <p className="text-[10px] text-zinc-600 truncate">{g.descripcion}</p>
                        )}
                        <span className="text-xs text-zinc-500">
                          {ofertasPorProducto(g.id, ofertas).length} oferta{ofertasPorProducto(g.id, ofertas).length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="hidden sm:block text-right">
                        {best ? (
                          <p className="text-sm font-semibold text-amber-400 font-mono">${fmt2(best.precio)} USD</p>
                        ) : (
                          <p className="text-sm text-zinc-600">Sin ofertas</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 sm:justify-end">
                        <button onClick={() => { ctx.eliminarProductoGeneral(g.id); }} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Eliminar"><IconTrash /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
  generales,
  onSave,
  onCancel,
}: {
  initial?: Oferta;
  proveedores: Proveedor[];
  paneles: ProductoPanel[];
  micros: ProductoMicro[];
  generales: ProductoGeneral[];
  onSave: (o: { id?: string; proveedorId: string; productoId: string; productoTabla?: string; tipo: TipoOferta; precio: number; precioTiers?: PrecioTier[]; precioCable?: number; fecha: string; notas: string; archivoOrigenId?: string }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    proveedorId: initial?.proveedorId ?? "",
    tipo: initial?.tipo ?? ("panel" as TipoOferta),
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
    : form.tipo === "micro"
    ? micros.map((m) => ({ id: m.id, label: `${m.marca} ${m.modelo} (${m.panelesPorUnidad} pan/u)` }))
    : generales.filter((g) => g.categoria === form.tipo).map((g) => ({ id: g.id, label: `${g.marca} ${g.modelo}` }));

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
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
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
          <label className={labelCls}>{form.tipo === "panel" ? "Precio / watt (USD sin IVA) *" : "Precio / unidad (USD sin IVA) *"}</label>
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
              tipo: form.tipo as TipoOferta,
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

const PROMPT_EXTERNA = `Extrae ABSOLUTAMENTE TODO el contenido de este PDF de proveedor de energía solar. No omitas nada. Quiero ver el PDF completo representado en JSON.

Responde ÚNICAMENTE con un JSON válido, sin markdown, sin texto adicional:

{
  "proveedor": "nombre exacto del proveedor tal como aparece",
  "fechaDocumento": "YYYY-MM-DD (fecha de la lista, vigencia, emisión)",
  "condiciones": "TEXTO COMPLETO de todas las condiciones, términos, notas legales, políticas de pago, garantías, tiempos de entrega, tipo de cambio, mínimos de compra, costos de flete, restricciones, ABSOLUTAMENTE TODO tal como aparece en el documento",
  "resumenCondiciones": "resumen en bullets de los puntos más importantes para un comprador",
  "notasGenerales": "cualquier otro texto, avisos, promociones, leyendas o información que aparezca en el documento y no encaje en los campos anteriores",
  "items": [
    {
      "tipo": "panel",
      "marca": "Canadian Solar",
      "modelo": "CS6R-425MS",
      "descripcion": "descripción COMPLETA tal como aparece en el PDF",
      "potencia": 425,
      "panelesPorUnidad": 0,
      "precio": 0.22,
      "precioTiers": [
        {"etiqueta": "1 panel", "precio": 0.25},
        {"etiqueta": "1 pallet (36 pzas)", "precio": 0.22},
        {"etiqueta": "+5 pallets", "precio": 0.20}
      ],
      "moneda": "USD",
      "unidad": "por_watt",
      "notas": "TODAS las notas, asteriscos, aclaraciones, disponibilidad, tiempo de entrega, garantía, o cualquier texto asociado a este producto específico"
    }
  ]
}

Reglas:
- tipo: panel / micro / monitoreo / cable / herramienta / estructura / tornilleria / otro
- potencia: solo para paneles (Watts), 0 para los demás
- panelesPorUnidad: solo para microinversores, 0 para los demás
- precio: precio base (menor volumen). Solo número
- precioTiers: TODOS los precios por volumen que existan. Array vacío [] si solo hay un precio
- moneda: USD o MXN
- unidad: por_watt (solo paneles con precio por Watt) o por_unidad
- Todos los números como números, no strings
- NO OMITAS NINGÚN PRODUCTO NI NINGÚN TEXTO DEL DOCUMENTO
- Si hay notas al pie, asteriscos, leyendas, o condiciones que aplican a productos específicos, inclúyelas en el campo "notas" de ese producto
- Si hay texto que aplica a todos los productos, va en "condiciones"
- Prefiero que sobre información a que falte`;

function ImportadorPDF({
  proveedores,
  paneles,
  micros,
  generales,
  ofertas,
  onDone,
  onCancel,
  ctx,
}: {
  proveedores: Proveedor[];
  paneles: ProductoPanel[];
  micros: ProductoMicro[];
  generales: ProductoGeneral[];
  ofertas: Oferta[];
  onDone: () => void;
  onCancel: () => void;
  ctx: CatalogoCtx;
}) {
  const [step, setStep] = useState<"upload" | "loading" | "pages" | "processing" | "review" | "done">("upload");
  const [importMode, setImportMode] = useState<"file" | "text" | "json">("file");
  const [textoImport, setTextoImport] = useState("");
  const jsonFileRef = useRef<HTMLInputElement>(null);
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
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [optionalPdf, setOptionalPdf] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const optionalFileRef = useRef<HTMLInputElement>(null);

  // ── Page-by-page state for large PDFs ──
  type PageInfo = { page: number; sizeKB: number; base64: string; selected: boolean; status: "pending" | "processing" | "done" | "error"; itemCount: number; error?: string };
  const [pdfPages, setPdfPages] = useState<PageInfo[]>([]);
  const [processingPage, setProcessingPage] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);

  // Parse AI response into ImportItem[]
  const parseAIResponse = (data: Record<string, unknown>): ImportItem[] => {
    return ((data.items || []) as Record<string, unknown>[]).map((it) => {
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
  };

  // Capture metadata from AI response (proveedor, fecha, condiciones)
  const captureMetadata = (data: Record<string, unknown>) => {
    if (data.fechaDocumento) setFechaDocumento(data.fechaDocumento as string);
    if (data.condiciones) setCondiciones((prev) => prev ? prev + "\n\n" + (data.condiciones as string) : (data.condiciones as string));
    if (data.resumenCondiciones) setResumenCondiciones((prev) => prev || (data.resumenCondiciones as string));
    if (data.proveedor && !proveedorId && !nuevoProvNombre) {
      const norm = normalizeName(data.proveedor as string);
      const match = proveedores.find((p) => normalizeName(p.nombre) === norm);
      if (match) setProveedorId(match.id);
      else setNuevoProvNombre(data.proveedor as string);
    }
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setOptionalPdf(file);
    setError("");

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    // For PDFs, check page count first
    if (isPdf) {
      setStep("loading");
      try {
        const formData = new FormData();
        formData.append("pdf", file);
        const res = await fetch("/api/pdf-paginas", { method: "POST", body: formData });
        const data = await res.json();
        if (data.error) { setError(data.error); setStep("upload"); return; }

        // Small PDF (≤3 pages): process directly as before
        if (data.totalPages <= 3) {
          await processFullFile(file);
          return;
        }

        // Large PDF: show page selector
        setPdfPages(data.pages.map((p: { page: number; sizeKB: number; base64: string }) => ({
          ...p,
          selected: true,
          status: "pending" as const,
          itemCount: 0,
        })));
        setStep("pages");
      } catch {
        setError("Error al analizar el PDF");
        setStep("upload");
      }
      return;
    }

    // Non-PDF (images): process directly
    setStep("loading");
    await processFullFile(file);
  };

  // Process a full file (small PDF or image) in one shot
  const processFullFile = async (file: File) => {
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/leer-catalogo", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("upload"); return; }

      const extracted = parseAIResponse(data);
      if (extracted.length === 0) { setError("No se encontraron productos en el PDF"); setStep("upload"); return; }

      setItems(extracted);
      captureMetadata(data);
      setStep("review");
    } catch {
      setError("Error al procesar el PDF");
      setStep("upload");
    }
  };

  // Process selected pages sequentially
  const processPages = async () => {
    const selected = pdfPages.filter((p) => p.selected);
    if (selected.length === 0) return;

    setStep("processing");
    setProcessingTotal(selected.length);
    setItems([]);
    setCondiciones("");
    setResumenCondiciones("");

    let allItems: ImportItem[] = [];
    let pageIdx = 0;

    for (const pg of pdfPages) {
      if (!pg.selected) continue;
      pageIdx++;
      setProcessingPage(pageIdx);

      // Update page status to processing
      setPdfPages((prev) => prev.map((p) => p.page === pg.page ? { ...p, status: "processing" } : p));

      try {
        const res = await fetch("/api/leer-catalogo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: pg.base64,
            mime: "application/pdf",
            pageLabel: `página ${pg.page} de ${pdfPages.length}`,
          }),
        });
        const data = await res.json();

        if (data.error) {
          setPdfPages((prev) => prev.map((p) => p.page === pg.page ? { ...p, status: "error", error: data.error } : p));
          continue;
        }

        const extracted = parseAIResponse(data);
        allItems = [...allItems, ...extracted];
        captureMetadata(data);

        setPdfPages((prev) => prev.map((p) => p.page === pg.page ? { ...p, status: "done", itemCount: extracted.length } : p));
      } catch {
        setPdfPages((prev) => prev.map((p) => p.page === pg.page ? { ...p, status: "error", error: "Error de conexión" } : p));
      }
    }

    if (allItems.length === 0) {
      setError("No se encontraron productos en las páginas seleccionadas");
      setStep("pages");
      return;
    }

    setItems(allItems);
    setStep("review");
  };

  const handleTexto = async () => {
    if (!textoImport.trim()) return;
    setFileName("Texto pegado");
    setStep("loading");
    setError("");

    try {
      // Always send to AI for validation/normalization, even if JSON
      const res = await fetch("/api/leer-texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoImport }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("upload"); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const extracted: ImportItem[] = (d.items || []).map((it: Record<string, unknown>) => {
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

      if (extracted.length === 0) { setError("No se encontraron productos en el texto"); setStep("upload"); return; }

      setItems(extracted);
      if (d.fechaDocumento) setFechaDocumento(d.fechaDocumento);
      if (d.condiciones) setCondiciones(d.condiciones);
      if (d.resumenCondiciones) setResumenCondiciones(d.resumenCondiciones);
      // Also capture notasGenerales into condiciones if present
      if (d.notasGenerales && !d.condiciones) setCondiciones(d.notasGenerales);
      else if (d.notasGenerales && d.condiciones) setCondiciones(d.condiciones + "\n\n" + d.notasGenerales);
      if (d.proveedor) {
        const norm = normalizeName(d.proveedor);
        const match = proveedores.find((p) => normalizeName(p.nombre) === norm);
        if (match) setProveedorId(match.id);
        else setNuevoProvNombre(d.proveedor);
      }
      setStep("review");
    } catch {
      setError("Error al procesar el texto");
      setStep("upload");
    }
  };

  const handleJsonFile = async (file: File) => {
    setFileName(file.name);
    setStep("loading");
    setError("");

    try {
      const raw = await file.text();
      // Send through AI for validation/normalization, same as pasted text
      const res = await fetch("/api/leer-texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: raw }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("upload"); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const extracted: ImportItem[] = (d.items || []).map((it: Record<string, unknown>) => {
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

      if (extracted.length === 0) { setError("No se encontraron productos en el archivo JSON"); setStep("upload"); return; }

      setItems(extracted);
      if (d.fechaDocumento) setFechaDocumento(d.fechaDocumento);
      if (d.condiciones) setCondiciones(d.condiciones);
      if (d.resumenCondiciones) setResumenCondiciones(d.resumenCondiciones);
      if (d.notasGenerales && !d.condiciones) setCondiciones(d.notasGenerales);
      else if (d.notasGenerales && d.condiciones) setCondiciones(d.condiciones + "\n\n" + d.notasGenerales);
      if (d.proveedor) {
        const norm = normalizeName(d.proveedor);
        const match = proveedores.find((p) => normalizeName(p.nombre) === norm);
        if (match) setProveedorId(match.id);
        else setNuevoProvNombre(d.proveedor);
      }
      setStep("review");
    } catch {
      setError("Error al leer el archivo JSON");
      setStep("upload");
    }
  };

  const updateItem = (i: number, field: keyof ImportItem, value: unknown) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };

  const handleSave = async () => {
    // Resolve proveedor — fuzzy match existing by normalized name
    let provId = proveedorId;
    if (!provId && nuevoProvNombre.trim()) {
      const norm = normalizeName(nuevoProvNombre);
      const existingProv = proveedores.find((p) => normalizeName(p.nombre) === norm);
      if (existingProv) {
        provId = existingProv.id;
      } else {
        provId = await ctx.guardarProveedor({ nombre: nuevoProvNombre.trim(), contacto: "", telefono: "", notas: `Importado de ${fileName}` });
      }
    }
    if (!provId) return;

    // Use document date from PDF if available, else current date
    const fechaOferta = fechaDocumento
      ? new Date(fechaDocumento + "T00:00:00").toISOString()
      : new Date().toISOString();

    // Upload optional PDF to Convex storage
    let storageId: string | undefined;
    if (optionalPdf) {
      storageId = await ctx.subirArchivo(optionalPdf);
    }

    // Save archive record
    const archivoId = await ctx.guardarArchivoProveedor({
      nombre: optionalPdf ? optionalPdf.name : fileName,
      proveedorId: provId,
      fechaImportacion: new Date().toISOString(),
      fechaDocumento: fechaDocumento || "",
      condiciones,
      resumenCondiciones,
      storageId,
    });

    let count = 0;
    let skipped = 0;
    const selected = items.filter((it) => it.selected && it.precio > 0);

    for (const it of selected) {
      // Map legacy "ecu" type to "monitoreo"
      const tipo = (it.tipo === "ecu" ? "monitoreo" : it.tipo) as TipoOferta;

      // Match or create product
      let prodId = "";
      if (tipo === "panel") {
        const match = paneles.find((p) =>
          normalizeName(p.marca) === normalizeName(it.marca) &&
          normalizeName(p.modelo) === normalizeName(it.modelo)
        );
        if (match) {
          prodId = match.id;
        } else {
          prodId = await ctx.guardarProductoPanel({ marca: it.marca || "Sin marca", modelo: it.modelo || it.descripcion.slice(0, 40), potencia: it.potencia });
        }
      } else if (tipo === "micro") {
        const match = micros.find((p) =>
          normalizeName(p.marca) === normalizeName(it.marca) &&
          normalizeName(p.modelo) === normalizeName(it.modelo)
        );
        if (match) {
          prodId = match.id;
        } else {
          prodId = await ctx.guardarProductoMicro({ marca: it.marca || "Sin marca", modelo: it.modelo || it.descripcion.slice(0, 40), panelesPorUnidad: it.panelesPorUnidad || 4 });
        }
      } else {
        // General product: monitoreo, cable, herramienta, estructura, tornilleria, otro
        const match = generales.find((p) =>
          p.categoria === tipo &&
          normalizeName(p.marca) === normalizeName(it.marca) &&
          normalizeName(p.modelo) === normalizeName(it.modelo)
        );
        if (match) {
          prodId = match.id;
        } else {
          prodId = await ctx.guardarProductoGeneral({
            categoria: tipo,
            marca: it.marca || "Sin marca",
            modelo: it.modelo || it.descripcion.slice(0, 40),
            descripcion: it.descripcion,
          });
        }
      }

      // Dedup: solo dentro del MISMO archivo (evitar duplicados si el PDF lista
      // el mismo producto 2 veces). NO comparar contra ofertas anteriores de otros
      // archivos — cada importación es un registro independiente que confirma el
      // precio vigente en esa fecha, aunque el precio sea el mismo.
      const existingInSameFile = ofertas.find((o) =>
        o.proveedorId === provId &&
        o.productoId === prodId &&
        o.archivoOrigenId === archivoId &&
        Math.abs(o.precio - it.precio) < 0.001
      );
      if (existingInSameFile) {
        skipped++;
        continue;
      }

      await ctx.guardarOferta({
        proveedorId: provId,
        productoId: prodId,
        tipo,
        precio: it.precio,
        precioTiers: it.precioTiers.length > 0 ? it.precioTiers : undefined,
        precioCable: tipo === "micro" ? 0 : undefined,
        fecha: fechaOferta,
        notas: [it.descripcion, it.notas, `${it.moneda} ${it.unidad}`, `Importado de ${fileName}`].filter(Boolean).join(" · "),
        archivoOrigenId: archivoId,
      });
      count++;
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
        <h3 className="text-sm font-semibold text-emerald-400">Importar precios</h3>

        {/* Mode toggle */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-zinc-800 w-fit">
          <button
            onClick={() => setImportMode("file")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${importMode === "file" ? "bg-emerald-500 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            PDF / Imagen
          </button>
          <button
            onClick={() => setImportMode("text")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${importMode === "text" ? "bg-emerald-500 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Pegar texto
          </button>
          <button
            onClick={() => setImportMode("json")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${importMode === "json" ? "bg-emerald-500 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Archivo JSON
          </button>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        {importMode === "file" ? (
          <>
            <p className="text-xs text-zinc-500">Sube un PDF o imagen (JPG, PNG) de lista de precios de proveedor. La AI extraerá los productos y precios automáticamente.</p>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Seleccionar archivo
              </button>
              <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
            </div>
          </>
        ) : importMode === "json" ? (
          <>
            <p className="text-xs text-zinc-500">Carga un archivo <span className="text-amber-400 font-medium">.json</span> generado con el prompt de extracción. La AI validará y normalizará los datos.</p>
            <input ref={jsonFileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJsonFile(f); }} />
            {/* Optional PDF attachment */}
            <div className="flex items-center gap-3">
              <input ref={optionalFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setOptionalPdf(f); setFileName(f.name); } }} />
              <button
                onClick={() => optionalFileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                {optionalPdf ? optionalPdf.name : "Adjuntar PDF original (opcional)"}
              </button>
              {optionalPdf && (
                <button onClick={() => { setOptionalPdf(null); setFileName(""); }} className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors">quitar</button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => jsonFileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Seleccionar archivo JSON
              </button>
              <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
            </div>

            {/* Prompt helper — same as text mode */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-zinc-500">¿No tienes el JSON? Copia el prompt, pásalo a otra IA con el PDF</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPrompt ? "Ocultar" : "Ver prompt"}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(PROMPT_EXTERNA); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${promptCopied ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}
                  >
                    {promptCopied ? (
                      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copiado</>
                    ) : (
                      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar prompt</>
                    )}
                  </button>
                </div>
              </div>
              {showPrompt && (
                <pre className="text-[10px] text-zinc-500 bg-zinc-900/80 rounded-md p-3 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">{PROMPT_EXTERNA}</pre>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Prompt helper */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  <span className="text-amber-400 font-medium">Paso 1:</span> Copia este prompt y pégalo en ChatGPT (u otra IA) junto con el PDF
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPrompt ? "Ocultar" : "Ver prompt"}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(PROMPT_EXTERNA); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${promptCopied ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}
                  >
                    {promptCopied ? (
                      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copiado</>
                    ) : (
                      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar prompt</>
                    )}
                  </button>
                </div>
              </div>
              {showPrompt && (
                <pre className="text-[10px] text-zinc-500 bg-zinc-900/80 rounded-md p-3 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">{PROMPT_EXTERNA}</pre>
              )}
            </div>

            <p className="text-xs text-zinc-500">
              <span className="text-amber-400 font-medium">Paso 2:</span> Pega aquí el JSON que te devolvió la otra IA
            </p>
            <textarea
              className={`${inputCls} w-full h-48 font-mono text-[11px] leading-relaxed resize-y`}
              placeholder='{"proveedor": "DM Solar", "fechaDocumento": "2026-03-15", ...}'
              value={textoImport}
              onChange={(e) => setTextoImport(e.target.value)}
            />
            {/* Optional PDF attachment */}
            <div className="flex items-center gap-3">
              <input ref={optionalFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setOptionalPdf(f); setFileName(f.name); } }} />
              <button
                onClick={() => optionalFileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                {optionalPdf ? optionalPdf.name : "Adjuntar PDF original (opcional)"}
              </button>
              {optionalPdf && (
                <button onClick={() => { setOptionalPdf(null); setFileName("Texto pegado"); }} className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors">quitar</button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTexto}
                disabled={!textoImport.trim()}
                className={`flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors ${!textoImport.trim() ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Procesar texto
              </button>
              <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
            </div>
          </>
        )}
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

  // ── Page selector step (large PDFs) ──
  if (step === "pages") {
    const selectedPages = pdfPages.filter((p) => p.selected);
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-emerald-400">Documento de {pdfPages.length} páginas</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">{fileName} — Selecciona las páginas que contienen productos y precios</p>
        </div>

        {error && <p className="mx-5 mt-3 text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="px-5 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {pdfPages.map((pg) => (
              <button
                key={pg.page}
                onClick={() => setPdfPages((prev) => prev.map((p) => p.page === pg.page ? { ...p, selected: !p.selected } : p))}
                className={`relative flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition-all ${
                  pg.selected
                    ? "border-emerald-400/60 bg-emerald-400/5 text-emerald-300"
                    : "border-zinc-700/50 bg-zinc-800/30 text-zinc-600 hover:border-zinc-600"
                }`}
              >
                <svg className="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-semibold">Pág. {pg.page}</span>
                <span className="text-[9px] opacity-60">{pg.sizeKB} KB</span>
                {pg.selected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPdfPages((prev) => prev.map((p) => ({ ...p, selected: true })))}
              className="text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              Todas
            </button>
            <button
              onClick={() => setPdfPages((prev) => prev.map((p) => ({ ...p, selected: false })))}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Ninguna
            </button>
            <span className="text-[10px] text-zinc-600">
              {selectedPages.length} de {pdfPages.length} seleccionadas
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className={btnSecondary}>Cancelar</button>
            <button
              onClick={processPages}
              disabled={selectedPages.length === 0}
              className={`flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors ${btnDisabled}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Procesar {selectedPages.length} página{selectedPages.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Processing pages step ──
  if (step === "processing") {
    const done = pdfPages.filter((p) => p.status === "done").length;
    const errors = pdfPages.filter((p) => p.status === "error").length;
    const totalItems = pdfPages.reduce((s, p) => s + p.itemCount, 0);
    const progressPct = processingTotal > 0 ? (processingPage / processingTotal) * 100 : 0;

    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-emerald-400">Procesando documento</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Página {processingPage} de {processingTotal} — {totalItems} productos encontrados
          </p>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4 pb-2">
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Page status list */}
        <div className="px-5 py-3 space-y-1.5 max-h-64 overflow-y-auto">
          {pdfPages.filter((p) => p.selected).map((pg) => (
            <div key={pg.page} className="flex items-center gap-3 text-xs">
              <div className="w-14 text-zinc-500">Pág. {pg.page}</div>
              {pg.status === "pending" && <span className="text-zinc-600">En espera</span>}
              {pg.status === "processing" && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <div className="w-3 h-3 border-[1.5px] border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Analizando…
                </span>
              )}
              {pg.status === "done" && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  {pg.itemCount} producto{pg.itemCount !== 1 ? "s" : ""}
                </span>
              )}
              {pg.status === "error" && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  {pg.error || "Error"}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Summary when all done */}
        {done + errors === processingTotal && processingTotal > 0 && (
          <div className="px-5 py-3 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-400">
              {done} página{done !== 1 ? "s" : ""} procesada{done !== 1 ? "s" : ""} · {totalItems} productos
              {errors > 0 && <span className="text-red-400 ml-1">· {errors} con error</span>}
            </p>
          </div>
        )}
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
          {fechaDocumento && <span className="text-[10px] text-emerald-400/70">detectada por IA</span>}
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
                    <option value="monitoreo">Monitoreo/ECU</option>
                    <option value="cable">Cable/Protección</option>
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
  // Fetch Convex storage URL if storageId is present
  const storageUrl = useQuery(
    api.archivos.getFileUrl,
    archivo.storageId ? { storageId: archivo.storageId as Id<"_storage"> } : "skip",
  );

  const isPdf = archivo.nombre.toLowerCase().endsWith(".pdf");
  // base64 may be present on legacy records but is not part of the Convex type
  const b64 = (archivo as ArchivoProveedor & { base64?: string }).base64;
  const dataUrl = storageUrl
    ? storageUrl
    : b64
      ? isPdf
        ? `data:application/pdf;base64,${b64}`
        : `data:image/${archivo.nombre.toLowerCase().endsWith(".png") ? "png" : "jpeg"};base64,${b64}`
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
  generales,
  ofertas,
  reload,
  ctx,
}: {
  proveedores: Proveedor[];
  paneles: ProductoPanel[];
  micros: ProductoMicro[];
  generales: ProductoGeneral[];
  ofertas: Oferta[];
  reload: () => void;
  ctx: CatalogoCtx;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Oferta | null>(null);
  const [importing, setImporting] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filterProv, setFilterProv] = useState("");
  const [filterTipo, setFilterTipo] = useState<"" | TipoOferta>("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<"producto" | "proveedor" | "precio" | "fecha" | "tend">("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const provMap = useMemo(() => {
    const m = new Map<string, string>();
    proveedores.forEach((p) => m.set(p.id, p.nombre));
    return m;
  }, [proveedores]);

  const prodMap = useMemo(() => {
    const m = new Map<string, string>();
    paneles.forEach((p) => m.set(p.id, `${p.marca} ${p.modelo} (${p.potencia}W)`));
    micros.forEach((p) => m.set(p.id, `${p.marca} ${p.modelo} (${p.panelesPorUnidad} pan/u)`));
    generales.forEach((p) => m.set(p.id, `${p.marca} ${p.modelo}`));
    return m;
  }, [paneles, micros, generales]);

  const archivosMap = useMemo(() => {
    const m = new Map<string, ArchivoProveedor>();
    ctx.archivos.forEach((a) => m.set(a.id, a));
    return m;
  }, [ctx.archivos]);

  const [viewingArchivo, setViewingArchivo] = useState<ArchivoProveedor | null>(null);

  const bq = busqueda.toLowerCase().trim();
  const filtered = useMemo(() => {
    let list = [...ofertas];
    if (filterProv) list = list.filter((o) => o.proveedorId === filterProv);
    if (filterTipo) list = list.filter((o) => o.tipo === filterTipo);
    if (bq) list = list.filter((o) => {
      const prod = prodMap.get(o.productoId) || "";
      const prov = provMap.get(o.proveedorId) || "";
      return `${prod} ${prov} ${o.notas || ""}`.toLowerCase().includes(bq);
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortCol) {
        case "producto": {
          const pa = (prodMap.get(a.productoId) || "").toLowerCase();
          const pb = (prodMap.get(b.productoId) || "").toLowerCase();
          return pa < pb ? -dir : pa > pb ? dir : 0;
        }
        case "proveedor": {
          const pa = (provMap.get(a.proveedorId) || "").toLowerCase();
          const pb = (provMap.get(b.proveedorId) || "").toLowerCase();
          return pa < pb ? -dir : pa > pb ? dir : 0;
        }
        case "precio":
          return (a.precio - b.precio) * dir;
        case "fecha":
          return a.fecha.localeCompare(b.fecha) * dir;
        case "tend": {
          const ta = tendenciaOferta(a.productoId, a.proveedorId, ofertas);
          const tb = tendenciaOferta(b.productoId, b.proveedorId, ofertas);
          const tVal = (t: string) => t === "up" ? 1 : t === "down" ? -1 : 0;
          return (tVal(ta) - tVal(tb)) * dir;
        }
        default:
          return 0;
      }
    });
    return list;
  }, [ofertas, filterProv, filterTipo, bq, prodMap, provMap, sortCol, sortDir]);

  const handleSave = async (o: { id?: string; proveedorId: string; productoId: string; productoTabla?: string; tipo: string; precio: number; precioTiers?: { etiqueta: string; precio: number }[]; precioCable?: number; fecha: string; notas: string; archivoOrigenId?: string }) => {
    await ctx.guardarOferta(o);
    setAdding(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await ctx.eliminarOferta(id);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar producto o proveedor..." />
        <select className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-amber-400" value={filterProv} onChange={(e) => setFilterProv(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-amber-400" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value as "" | TipoOferta)}>
          <option value="">Todo tipo</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
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

      {importing && <ImportadorPDF proveedores={proveedores} paneles={paneles} micros={micros} generales={generales} ofertas={ofertas} onDone={() => { setImporting(false); }} onCancel={() => setImporting(false)} ctx={ctx} />}
      {adding && <OfertaForm proveedores={proveedores} paneles={paneles} micros={micros} generales={generales} onSave={handleSave} onCancel={() => setAdding(false)} />}
      {editing && <OfertaForm initial={editing} proveedores={proveedores} paneles={paneles} micros={micros} generales={generales} onSave={handleSave} onCancel={() => setEditing(null)} />}

      {!adding && !editing && filtered.length === 0 && (
        <EmptyState label="No hay ofertas registradas" onAdd={() => setAdding(true)} />
      )}

      {!adding && !editing && filtered.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_100px_90px_70px_36px] gap-3 px-5 py-2.5 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {(["producto", "proveedor", "precio", "fecha", "tend"] as const).map((col) => {
              const align = col === "precio" || col === "fecha" ? "text-right" : col === "tend" ? "text-center" : "text-left";
              const label = col === "tend" ? "Tend." : col.charAt(0).toUpperCase() + col.slice(1);
              const active = sortCol === col;
              return (
                <button
                  key={col}
                  className={`flex items-center gap-1 ${align === "text-right" ? "justify-end" : align === "text-center" ? "justify-center" : ""} hover:text-zinc-300 transition-colors ${active ? "text-amber-400" : ""}`}
                  onClick={() => {
                    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
                    else { setSortCol(col); setSortDir(col === "fecha" || col === "precio" ? "desc" : "asc"); }
                  }}
                >
                  {label}
                  {active && (
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {sortDir === "asc"
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />}
                    </svg>
                  )}
                </button>
              );
            })}
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
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        o.tipo === "panel" ? "bg-blue-500/15 text-blue-400" :
                        o.tipo === "micro" ? "bg-purple-500/15 text-purple-400" :
                        o.tipo === "monitoreo" ? "bg-cyan-500/15 text-cyan-400" :
                        o.tipo === "cable" ? "bg-orange-500/15 text-orange-400" :
                        o.tipo === "herramienta" ? "bg-pink-500/15 text-pink-400" :
                        "bg-zinc-500/15 text-zinc-400"
                      }`}>
                        {TIPO_LABELS[o.tipo] || o.tipo}
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
  const ctx = useConvexCatalogo();
  const { proveedores, paneles, micros, generales, ofertas, isLoading } = ctx;

  // No reload needed — Convex is reactive
  const reload = () => {};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500">Cargando catalogo...</p>
      </div>
    );
  }

  const tabDef: { key: Tab; label: string; count: number }[] = [
    { key: "proveedores", label: "Proveedores", count: proveedores.length },
    { key: "productos", label: "Productos", count: paneles.length + micros.length + generales.length },
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

        {tab === "proveedores" && <TabProveedores proveedores={proveedores} reload={reload} ctx={ctx} />}
        {tab === "productos" && <TabProductos paneles={paneles} micros={micros} generales={generales} ofertas={ofertas} reload={reload} ctx={ctx} />}
        {tab === "ofertas" && <TabOfertas proveedores={proveedores} paneles={paneles} micros={micros} generales={generales} ofertas={ofertas} reload={reload} ctx={ctx} />}
      </main>
    </div>
  );
}
