"use client";

import { useState, useMemo } from "react";
import { TIPO_LABELS } from "../lib/storage";
import type { TipoOferta } from "../lib/types";
import {
  useConvexCatalogo,
  ofertasPorProducto,
  mejorOferta,
  type ProductoPanel,
  type ProductoMicro,
  type ProductoGeneral,
  type Oferta,
} from "../lib/useConvexCatalogo";
import {
  uid,
  fmt2,
  fmt3,
  inputCls,
  labelCls,
  btnPrimary,
  btnSecondary,
  btnDisabled,
  IconPlus,
  IconEdit,
  IconTrash,
  EmptyState,
  SearchInput,
} from "./_shared";

type CatalogoCtx = ReturnType<typeof useConvexCatalogo>;

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

export default function TabProductos({
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
