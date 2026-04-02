"use client";

import { useState } from "react";
import type { LineItem } from "../lib/types";

export const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtUSD = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtUSD3 = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15";

export function SectionCard({
  num,
  title,
  badge,
  children,
  defaultCollapsed = false,
}: {
  num: string;
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 w-full text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold shrink-0">
          {num}
        </span>
        <h2 className="font-semibold text-zinc-100 text-base">{title}</h2>
        {badge && (
          <span className="ml-auto text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        <svg className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${collapsed ? "" : "rotate-180"} ${badge ? "" : "ml-auto"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {!collapsed && <div className="p-6 space-y-5">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

export function NumInput({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: number;
}) {
  return (
    <input
      type="number"
      min={0}
      step={step ?? 1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`h-5 w-9 rounded-full transition-colors ${checked ? "bg-amber-400" : "bg-zinc-700"}`}
        />
        <div
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </div>
      <div>
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

export function LineItemTable({
  items,
  onChange,
  currency,
}: {
  items: LineItem[];
  onChange: (i: number, field: keyof LineItem, val: string) => void;
  currency: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      {/* header */}
      <div className="grid grid-cols-[1fr_72px_100px_88px] gap-2 px-3 py-2 bg-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wide">
        <span>Concepto</span>
        <span className="text-center">Cant.</span>
        <span className="text-right">Precio unit.</span>
        <span className="text-right">Subtotal</span>
      </div>
      {items.map((item, i) => {
        const sub = (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0);
        return (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_72px_100px_88px] gap-2 px-3 py-2.5 border-t border-zinc-800/60 items-center hover:bg-zinc-800/30 transition-colors"
          >
            <div>
              <p className="text-xs text-zinc-300 leading-tight">{item.nombre}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{item.unidad}</p>
            </div>
            <input
              type="number"
              min={0}
              value={item.cantidad}
              onChange={(e) => onChange(i, "cantidad", e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-center text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={item.precioUnitario}
              onChange={(e) => onChange(i, "precioUnitario", e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-right text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            />
            <p className="text-xs text-right font-mono text-zinc-200">
              ${fmt(sub)}
            </p>
          </div>
        );
      })}
      <div className="flex justify-between items-center px-3 py-2.5 border-t border-zinc-700 bg-zinc-800/40">
        <span className="text-xs text-zinc-500">Total</span>
        <span className="text-sm font-semibold text-zinc-100 font-mono">
          ${fmt(items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0))}{" "}
          <span className="text-zinc-500 font-normal">{currency}</span>
        </span>
      </div>
    </div>
  );
}

export function PartidaRow({ label, value }: { label: string; value: number }) {
  const conIva = value * 1.16;
  const isZero = value === 0;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0">
      <span className={`text-xs font-medium tracking-wide uppercase ${isZero ? "text-zinc-600" : "text-zinc-400"}`}>{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold font-mono ${isZero ? "text-zinc-700" : "text-zinc-100"}`}>
          {isZero ? "—" : `$${fmt(conIva)}`}
        </span>
        {!isZero && <p className="text-[10px] text-zinc-600 font-mono">${fmt(value)} + IVA</p>}
      </div>
    </div>
  );
}

export function TcCustomRow({
  tcGlobal,
  value,
  onChange,
}: {
  tcGlobal: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const isCustom = Number(value) > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-zinc-700 bg-zinc-800/30">
      <button
        onClick={() => onChange(isCustom ? "" : String(tcGlobal || ""))}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 ${
          isCustom ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors ${
          isCustom ? "border-amber-400 bg-amber-400" : "border-zinc-600"
        }`}>
          {isCustom && (
            <svg className="w-2.5 h-2.5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        TC personalizado
      </button>

      {isCustom ? (
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs text-zinc-500">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-28 rounded border border-amber-400/50 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 font-mono outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            autoFocus
          />
          <span className="text-xs text-zinc-500">MXN/USD</span>
          {tcGlobal > 0 && (
            <span className="text-xs text-zinc-600 ml-1">
              (DOF: ${tcGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })})
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-zinc-600">
          Usando DOF{tcGlobal > 0 ? `: $${tcGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "…"}
        </span>
      )}
    </div>
  );
}

export function SaveToCatalogBanner({
  label,
  onSave,
  onDismiss,
}: {
  label: string;
  onSave: (marca: string, modelo: string) => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 bg-zinc-800/30">
        <span className="text-xs text-zinc-400">{label}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Sí, guardar
          </button>
          <button onClick={onDismiss} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            No
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-400/30 bg-zinc-800/40 p-3 space-y-2.5">
      <p className="text-xs font-medium text-zinc-300">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400"
          placeholder="Marca"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400"
          placeholder="Modelo"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { if (marca.trim() && modelo.trim()) onSave(marca.trim(), modelo.trim()); }}
          disabled={!marca.trim() || !modelo.trim()}
          className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Guardar en catálogo
        </button>
        <button onClick={onDismiss} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-2">
          Cancelar
        </button>
      </div>
    </div>
  );
}
