"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav() {
  const path = usePathname();

  return (
    <nav className="flex gap-1">
      <Link
        href="/"
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          path === "/"
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        }`}
      >
        Cotizador
      </Link>
      <Link
        href="/cotizaciones"
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          path === "/cotizaciones"
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        }`}
      >
        Cotizaciones
      </Link>
      <Link
        href="/clientes"
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          path === "/clientes"
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        }`}
      >
        Clientes
      </Link>
      <Link
        href="/catalogo"
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          path === "/catalogo"
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        }`}
      >
        Catálogo
      </Link>
      <Link
        href="/comparativa"
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          path === "/comparativa"
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        }`}
      >
        Comparativa
      </Link>
      <Link
        href="/compras"
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          path === "/compras"
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            : "text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/10"
        }`}
      >
        Compras
      </Link>
      <Link
        href="/analisis"
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          path === "/analisis"
            ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
            : "text-violet-500/70 hover:text-violet-400 hover:bg-violet-500/10"
        }`}
      >
        Analisis
      </Link>
      <Link
        href="/cliente"
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          path === "/cliente"
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            : "text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10"
        }`}
      >
        Cliente
      </Link>
    </nav>
  );
}
