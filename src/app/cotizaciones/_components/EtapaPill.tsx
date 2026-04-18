"use client";

import { useEffect, useRef, useState } from "react";
import { ETAPAS, ETAPA_LABEL, ETAPA_COLOR, type Etapa } from "../_lib/types-shared";

interface Props {
  etapa: Etapa;
  size?: "sm" | "md";
  editable?: boolean;
  onChange?: (next: Etapa) => void;
  className?: string;
}

export default function EtapaPill({ etapa, size = "md", editable = false, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const colors = ETAPA_COLOR[etapa];
  const base = `inline-flex items-center gap-1.5 rounded-full ring-1 font-medium whitespace-nowrap ${colors.bg} ${colors.text} ${colors.ring}`;
  const sizing = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  const content = (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {ETAPA_LABEL[etapa]}
    </>
  );

  if (!editable || !onChange) {
    return <span className={`${base} ${sizing} ${className}`}>{content}</span>;
  }

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`${base} ${sizing} hover:brightness-125 transition`}
        aria-label={`Cambiar etapa: ${ETAPA_LABEL[etapa]}`}
      >
        {content}
        <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {ETAPAS.map((e) => {
            const c = ETAPA_COLOR[e];
            const active = e === etapa;
            return (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (e !== etapa) onChange(e);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-zinc-800 ${active ? "bg-zinc-800/60" : ""}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                <span className={c.text}>{ETAPA_LABEL[e]}</span>
                {active && (
                  <svg className="ml-auto h-3 w-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
