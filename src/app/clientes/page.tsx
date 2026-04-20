"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AppNav from "../components/AppNav";

// Etapa → color (mismo lenguaje que PanelCliente)
const ETAPA_CLS: Record<string, string> = {
  prospecto: "bg-zinc-700 text-zinc-300",
  cotizado: "bg-blue-600/70 text-blue-200",
  negociacion: "bg-amber-600/70 text-amber-200",
  cerrado_ganado: "bg-emerald-600/70 text-emerald-200",
  cerrado_perdido: "bg-red-600/70 text-red-200",
  instalado: "bg-green-600/70 text-green-200",
};

const ETAPA_LABEL: Record<string, string> = {
  prospecto: "Prospecto",
  cotizado: "Cotizado",
  negociacion: "Negociación",
  cerrado_ganado: "Ganado",
  cerrado_perdido: "Perdido",
  instalado: "Instalado",
};

function fmtFecha(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClientesPage() {
  const router = useRouter();
  const clientes = useQuery(api.clientes.listWithProyectos, { incluirArchivados: false });
  const [expandido, setExpandido] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const toggleExpand = (id: string) => {
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const abrirCotizacion = (nombre: string) => {
    router.push(`/?load=${encodeURIComponent(nombre)}`);
  };

  const q = query.trim().toLowerCase();
  const filtrados = !q
    ? clientes ?? []
    : (clientes ?? []).filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.telefono?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.ubicacion?.toLowerCase().includes(q),
      );

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">☀️</span>
            <span className="hidden sm:block text-sm font-semibold text-zinc-100 tracking-tight">Cotizador Solar</span>
          </div>
          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Clientes</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {clientes === undefined
                ? "Cargando…"
                : `${clientes.length} cliente${clientes.length === 1 ? "" : "s"} · ${clientes.reduce((acc, c) => acc + c.proyectos.reduce((a, p) => a + p.cotizaciones.length, 0), 0)} cotización(es)`}
            </p>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, tel, email, ciudad…"
            className="w-64 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400"
          />
        </div>

        {clientes === undefined && (
          <p className="text-sm text-zinc-500 animate-pulse">Cargando clientes…</p>
        )}

        {clientes && clientes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
            <p className="text-sm text-zinc-400">Todavía no hay clientes registrados.</p>
            <p className="text-xs text-zinc-600 mt-2">
              Los clientes se crean automáticamente al guardar una cotización con nombre.
              Si ya tienes cotizaciones existentes sin vincular, corre{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-amber-400">
                internal.cotizaciones.backfillClientesProyectos
              </code>{" "}
              desde el Convex dashboard.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtrados.map((c) => {
            const totalCot = c.proyectos.reduce((acc, p) => acc + p.cotizaciones.length, 0);
            const isOpen = expandido.has(c._id);

            return (
              <div key={c._id} className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(c._id)}
                  className="flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-zinc-100 truncate">{c.nombre}</h2>
                      <span className="text-[10px] text-zinc-500">
                        {c.proyectos.length} proyecto{c.proyectos.length === 1 ? "" : "s"} · {totalCot} cot.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                      {c.telefono && <span>{c.telefono}</span>}
                      {c.email && <span className="truncate">{c.email}</span>}
                      {c.ubicacion && <span>{c.ubicacion}</span>}
                      {!c.telefono && !c.email && !c.ubicacion && (
                        <span className="italic text-zinc-600">Sin contacto</span>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-600 shrink-0">
                    Actualizado {fmtFecha(c.actualizadoEn)}
                  </span>
                  <svg
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800 px-5 py-3 bg-zinc-950/40 space-y-3">
                    {c.proyectos.length === 0 && (
                      <p className="text-xs text-zinc-600 italic">Sin proyectos todavía.</p>
                    )}
                    {c.proyectos.map((p) => (
                      <div key={p._id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <span className="text-xs font-medium text-zinc-300">{p.nombre}</span>
                          {p.ubicacion && <span className="text-[10px] text-zinc-500">· {p.ubicacion}</span>}
                          {p.reciboCFE && (
                            <span className="text-[10px] text-emerald-500/70">· recibo CFE</span>
                          )}
                        </div>

                        {p.cotizaciones.length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic pl-5">Sin cotizaciones.</p>
                        ) : (
                          <ul className="space-y-1 pl-5">
                            {p.cotizaciones
                              .sort((a, b) => (b.actualizadoEn ?? "").localeCompare(a.actualizadoEn ?? ""))
                              .map((cot) => (
                                <li key={cot._id}>
                                  <button
                                    type="button"
                                    onClick={() => abrirCotizacion(cot.nombre)}
                                    className="flex items-center gap-2 w-full text-left rounded px-2 py-1 hover:bg-zinc-800/50 transition-colors"
                                  >
                                    <span className="text-xs text-zinc-200 flex-1 truncate">{cot.nombre}</span>
                                    {cot.etapa && (
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${ETAPA_CLS[cot.etapa] ?? "bg-zinc-700 text-zinc-300"}`}>
                                        {ETAPA_LABEL[cot.etapa] ?? cot.etapa}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-zinc-600 shrink-0">
                                      {fmtFecha(cot.actualizadoEn)}
                                    </span>
                                  </button>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
