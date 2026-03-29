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
    </nav>
  );
}
