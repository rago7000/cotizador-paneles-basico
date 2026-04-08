"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/60 focus:border-amber-400/60 transition-colors";

const labelCls = "block text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1";

export default function ConfigEmpresaModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const config = useQuery(api.configEmpresa.get);
  const saveMut = useMutation(api.configEmpresa.save);

  const [form, setForm] = useState({
    nombre: "",
    calle: "",
    numeroExterior: "",
    colonia: "",
    codigoPostal: "",
    municipio: "",
    estado: "",
    telefono: "",
    email: "",
    puesto: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load existing config
  useEffect(() => {
    if (config) {
      setForm({
        nombre: config.nombre || "",
        calle: config.calle || "",
        numeroExterior: config.numeroExterior || "",
        colonia: config.colonia || "",
        codigoPostal: config.codigoPostal || "",
        municipio: config.municipio || "",
        estado: config.estado || "",
        telefono: config.telefono || "",
        email: config.email || "",
        puesto: config.puesto || "",
      });
    }
  }, [config]);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveMut({
        nombre: form.nombre,
        calle: form.calle || undefined,
        numeroExterior: form.numeroExterior || undefined,
        colonia: form.colonia || undefined,
        codigoPostal: form.codigoPostal || undefined,
        municipio: form.municipio || undefined,
        estado: form.estado || undefined,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        puesto: form.puesto || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Datos de la empresa</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Se usan en la Solicitud CFE y documentos oficiales</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nombre completo / Razon social</label>
              <input type="text" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre..." className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Puesto</label>
              <input type="text" value={form.puesto} onChange={(e) => set("puesto", e.target.value)} placeholder="Representante, Gerente..." className={inputCls} />
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-3">Domicilio</p>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <label className={labelCls}>Calle</label>
                <input type="text" value={form.calle} onChange={(e) => set("calle", e.target.value)} placeholder="Blvd. Rufino Tamayo" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Num. ext.</label>
                <input type="text" value={form.numeroExterior} onChange={(e) => set("numeroExterior", e.target.value)} placeholder="304-A" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Colonia</label>
                <input type="text" value={form.colonia} onChange={(e) => set("colonia", e.target.value)} placeholder="Alpes Nte." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>C.P.</label>
                <input type="text" value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value)} placeholder="25270" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <input type="text" value={form.estado} onChange={(e) => set("estado", e.target.value)} placeholder="Coahuila" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Municipio</label>
                <input type="text" value={form.municipio} onChange={(e) => set("municipio", e.target.value)} placeholder="Saltillo" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-3">Contacto</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Telefono</label>
                <input type="text" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="8441744037" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Correo electronico</label>
                <input type="text" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="correo@empresa.com" className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={!form.nombre || saving}
            className="px-4 py-1.5 rounded-lg bg-amber-400 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            {saved ? "Guardado" : saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
