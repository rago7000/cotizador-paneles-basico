"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CotizacionRow, Etapa } from "../_lib/types-shared";
import { ORIGEN_LABEL } from "../_lib/types-shared";
import { fmtMXN, fmtDate, fmtRelative } from "../_lib/derive";
import EtapaPill from "./EtapaPill";

interface Props {
  row: CotizacionRow | null;
  onClose: () => void;
  onCargar: (row: CotizacionRow) => void;
  onDuplicar: (row: CotizacionRow) => void;
  onEliminar: (row: CotizacionRow) => void;
  onChangeEtapa: (row: CotizacionRow, etapa: Etapa) => void;
}

export default function CotizacionDrawer({ row, onClose, onCargar, onDuplicar, onEliminar, onChangeEtapa }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row, onClose]);

  if (!row) return null;

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
      <aside
        className="relative z-10 ml-auto flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <EtapaPill etapa={row.etapa} editable size="sm" onChange={(e) => onChangeEtapa(row, e)} />
              <span className="text-[11px] text-zinc-500">· {fmtRelative(row.actualizadoEn)}</span>
            </div>
            <h2 className="mt-1.5 truncate text-base font-semibold text-zinc-100">{row.nombre}</h2>
            <p className="text-[11px] text-zinc-500">
              Creada {fmtDate(row.creadoEn)} · Actualizada {fmtDate(row.actualizadoEn)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <Section title="Sistema">
            <Row2 label="Paneles">
              {row.cantidadPaneles > 0 ? `${row.cantidadPaneles} × ${row.potenciaW}W` : "—"}
            </Row2>
            <Row2 label="Potencia total">{row.kWp > 0 ? `${row.kWp.toFixed(2)} kWp` : "—"}</Row2>
            <Row2 label="Recibo CFE">
              {row.hasReciboCFE ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">Cargado</span>
              ) : (
                <span className="text-zinc-600">Sin recibo</span>
              )}
            </Row2>
          </Section>

          <Section title="Precios">
            <Row2 label="Costo total">{fmtMXN(row.totalMXN)}</Row2>
            <Row2 label="Precio cliente" highlight>
              {fmtMXN(row.totalClienteMXN)}
            </Row2>
            <Row2 label="Utilidad">
              {row.utilidadNetaMXN != null ? (
                <span>
                  {fmtMXN(row.utilidadNetaMXN)}
                  {row.utilidadNetaPct != null && (
                    <span className="ml-1.5 text-[11px] text-emerald-400/80">({row.utilidadNetaPct.toFixed(0)}%)</span>
                  )}
                </span>
              ) : (
                "—"
              )}
            </Row2>
          </Section>

          <Section title="Cliente">
            <Row2 label="Teléfono">
              {row.clienteTelefono ? (
                <a href={`tel:${row.clienteTelefono}`} className="text-sky-400 hover:underline">{row.clienteTelefono}</a>
              ) : "—"}
            </Row2>
            <Row2 label="Email">
              {row.clienteEmail ? (
                <a href={`mailto:${row.clienteEmail}`} className="text-sky-400 hover:underline">{row.clienteEmail}</a>
              ) : "—"}
            </Row2>
            <Row2 label="Ubicación">{row.clienteUbicacion || "—"}</Row2>
            {row.clienteNotas && (
              <div className="mt-2 rounded-md bg-zinc-800/60 p-2.5 text-[12px] text-zinc-300 whitespace-pre-wrap">
                {row.clienteNotas}
              </div>
            )}
          </Section>

          <Section title="Pipeline">
            <Row2 label="Probabilidad">
              {row.probabilidadCierre != null ? `${row.probabilidadCierre}%` : "—"}
            </Row2>
            <Row2 label="Cierre estimado">{fmtDate(row.fechaCierre)}</Row2>
            <Row2 label="Instalación">{fmtDate(row.fechaInstalacion)}</Row2>
            {row.valorPonderadoMXN > 0 && (
              <Row2 label="Valor ponderado">{fmtMXN(row.valorPonderadoMXN)}</Row2>
            )}
          </Section>

          <Section title="Origen">
            <Row2 label="Canal">{row.origen ? ORIGEN_LABEL[row.origen] : "—"}</Row2>
            {row.origenDetalle && <Row2 label="Detalle">{row.origenDetalle}</Row2>}
          </Section>

          {(row.tags?.length ?? 0) > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {row.tags!.map((t) => (
                  <span key={t} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                    {t}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              href={`/comparativa?cot=${encodeURIComponent(row.nombre)}`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m0 0v-4a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Comparativa
            </Link>
            <Link
              href="/compras"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Compras
            </Link>
          </div>
        </div>

        <footer className="border-t border-zinc-800 px-5 py-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-zinc-300">
                ¿Eliminar «{row.nombre}»?
              </p>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onEliminar(row)}
                className="rounded-md bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-md p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                title="Eliminar"
                aria-label="Eliminar"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDuplicar(row)}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
              >
                Duplicar
              </button>
              <button
                type="button"
                onClick={() => onCargar(row)}
                className="ml-auto flex-1 rounded-md bg-amber-400 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300"
              >
                Cargar en cotizador
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row2({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12px]">
      <span className="text-zinc-500">{label}</span>
      <span className={`text-right ${highlight ? "text-base font-semibold text-amber-300" : "text-zinc-200"}`}>{children}</span>
    </div>
  );
}
