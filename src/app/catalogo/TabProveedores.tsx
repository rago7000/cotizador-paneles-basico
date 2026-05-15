"use client";

import { useState, useMemo } from "react";
import {
  useConvexCatalogo,
  type Proveedor,
} from "../lib/useConvexCatalogo";
import {
  uid,
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

export default function TabProveedores({
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
