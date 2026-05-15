"use client";

// ── Helpers + estilos compartidos entre los tabs del catálogo ────────────────
// Extraído de catalogo/page.tsx (Fase B.1). Nada de lógica de negocio aquí;
// solo formatters, clases CSS reutilizables y átomos visuales.

// ── helpers ──────────────────────────────────────────────────────────────────

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt3 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const fmtDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "Sin fecha";
  }
};

export const toLocalInput = (iso?: string) => {
  try {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
};

// ── estilos compartidos ──────────────────────────────────────────────────────

export const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15";

export const labelCls = "block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide";

export const btnPrimary =
  "flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors";

export const btnSecondary =
  "rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors";

export const btnDisabled = "disabled:opacity-30 disabled:cursor-not-allowed";

// ── icons ────────────────────────────────────────────────────────────────────

export function IconPlus({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function IconEdit({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

export function IconTrash({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export function IconTrend({ dir }: { dir: "up" | "down" | "stable" | "new" }) {
  if (dir === "up") return <span className="text-red-400 text-xs font-bold" title="Subió">▲</span>;
  if (dir === "down") return <span className="text-green-400 text-xs font-bold" title="Bajó">▼</span>;
  if (dir === "stable") return <span className="text-zinc-500 text-xs" title="Igual">—</span>;
  return <span className="text-blue-400 text-xs" title="Nueva">●</span>;
}

// ── átomos visuales ──────────────────────────────────────────────────────────

export function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
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

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
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
