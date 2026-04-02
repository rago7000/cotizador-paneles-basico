"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import AppNav from "../components/AppNav";

export default function MigrarPage() {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<string[]>([]);

  useEffect(() => setMounted(true), []);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const saveProveedor = useMutation(api.proveedores.save);
  const savePanel = useMutation(api.productos.savePanel);
  const saveMicro = useMutation(api.productos.saveMicro);
  const saveGeneral = useMutation(api.productos.saveGeneral);
  const saveOferta = useMutation(api.ofertas.save);
  const saveArchivo = useMutation(api.archivos.save);
  const saveCotizacion = useMutation(api.cotizaciones.save);
  const saveCotizacionCliente = useMutation(api.cotizaciones.saveCliente);
  const saveSeguimiento = useMutation(api.cotizaciones.saveSeguimiento);

  const log = (msg: string) => setStatus((prev) => [...prev, msg]);

  const handleMigrar = async () => {
    setRunning(true);
    setStatus([]);

    try {
      // ── 1. Proveedores ──
      const proveedoresRaw = JSON.parse(localStorage.getItem("proveedores") || "[]");
      const provIdMap = new Map<string, Id<"proveedores">>();
      log(`Migrando ${proveedoresRaw.length} proveedores...`);
      for (const p of proveedoresRaw) {
        const newId = await saveProveedor({
          nombre: p.nombre || "",
          contacto: p.contacto || "",
          telefono: p.telefono || "",
          notas: p.notas || "",
        });
        provIdMap.set(p.id, newId);
      }
      log(`✓ ${proveedoresRaw.length} proveedores migrados`);

      // ── 2. Productos Paneles ──
      const panelesRaw = JSON.parse(localStorage.getItem("productos_panel") || "[]");
      const panelIdMap = new Map<string, Id<"productosPaneles">>();
      log(`Migrando ${panelesRaw.length} paneles...`);
      for (const p of panelesRaw) {
        const newId = await savePanel({
          marca: p.marca || "",
          modelo: p.modelo || "",
          potencia: p.potencia || 0,
          aliases: p.aliases,
        });
        panelIdMap.set(p.id, newId);
      }
      log(`✓ ${panelesRaw.length} paneles migrados`);

      // ── 3. Productos Micros ──
      const microsRaw = JSON.parse(localStorage.getItem("productos_micro") || "[]");
      const microIdMap = new Map<string, Id<"productosMicros">>();
      log(`Migrando ${microsRaw.length} microinversores...`);
      for (const m of microsRaw) {
        const newId = await saveMicro({
          marca: m.marca || "",
          modelo: m.modelo || "",
          panelesPorUnidad: m.panelesPorUnidad || 4,
          aliases: m.aliases,
        });
        microIdMap.set(m.id, newId);
      }
      log(`✓ ${microsRaw.length} microinversores migrados`);

      // ── 4. Productos Generales ──
      const generalesRaw = JSON.parse(localStorage.getItem("productos_general") || "[]");
      const generalIdMap = new Map<string, Id<"productosGenerales">>();
      log(`Migrando ${generalesRaw.length} productos generales...`);
      for (const g of generalesRaw) {
        const newId = await saveGeneral({
          categoria: g.categoria || "otro",
          marca: g.marca || "",
          modelo: g.modelo || "",
          descripcion: g.descripcion || "",
          aliases: g.aliases,
        });
        generalIdMap.set(g.id, newId);
      }
      log(`✓ ${generalesRaw.length} productos generales migrados`);

      // ── 5. Archivos Proveedor (sin PDF base64 — solo metadata) ──
      const archivosRaw = JSON.parse(localStorage.getItem("archivos_proveedor") || "[]");
      const archivoIdMap = new Map<string, Id<"archivosProveedor">>();
      log(`Migrando ${archivosRaw.length} archivos de proveedor...`);
      for (const a of archivosRaw) {
        const mappedProvId = provIdMap.get(a.proveedorId);
        if (!mappedProvId) {
          log(`  ⚠ Archivo "${a.nombre}" — proveedor no encontrado, saltando`);
          continue;
        }
        const newId = await saveArchivo({
          nombre: a.nombre || "",
          proveedorId: mappedProvId,
          fechaImportacion: a.fechaImportacion || "",
          fechaDocumento: a.fechaDocumento || "",
          condiciones: a.condiciones || "",
          resumenCondiciones: a.resumenCondiciones || "",
        });
        archivoIdMap.set(a.id, newId);
      }
      log(`✓ ${archivoIdMap.size} archivos migrados`);

      // ── 6. Ofertas ──
      const ofertasRaw = JSON.parse(localStorage.getItem("ofertas") || "[]");
      log(`Migrando ${ofertasRaw.length} ofertas...`);
      let ofertasMigradas = 0;
      for (const o of ofertasRaw) {
        const mappedProvId = provIdMap.get(o.proveedorId);
        if (!mappedProvId) {
          log(`  ⚠ Oferta — proveedor "${o.proveedorId}" no encontrado, saltando`);
          continue;
        }

        // Resolve product ID
        let productoId: string = "";
        let productoTabla: string = "";
        if (o.tipo === "panel") {
          const mapped = panelIdMap.get(o.productoId);
          if (mapped) { productoId = mapped; productoTabla = "productosPaneles"; }
        } else if (o.tipo === "micro") {
          const mapped = microIdMap.get(o.productoId);
          if (mapped) { productoId = mapped; productoTabla = "productosMicros"; }
        } else {
          const mapped = generalIdMap.get(o.productoId);
          if (mapped) { productoId = mapped; productoTabla = "productosGenerales"; }
        }

        if (!productoId) {
          log(`  ⚠ Oferta — producto "${o.productoId}" no encontrado, saltando`);
          continue;
        }

        const archivoOrigenId = o.archivoOrigenId ? archivoIdMap.get(o.archivoOrigenId) : undefined;

        await saveOferta({
          proveedorId: mappedProvId,
          productoId,
          productoTabla,
          tipo: o.tipo || "otro",
          precio: o.precio || 0,
          precioTiers: o.precioTiers,
          precioCable: o.precioCable,
          fecha: o.fecha || new Date().toISOString(),
          notas: o.notas || "",
          archivoOrigenId: archivoOrigenId,
        });
        ofertasMigradas++;
      }
      log(`✓ ${ofertasMigradas} ofertas migradas`);

      // ── 7. Cotizaciones ──
      const cotizacionesRaw = JSON.parse(localStorage.getItem("cotizaciones_paneles") || "[]");
      log(`Migrando ${cotizacionesRaw.length} cotizaciones...`);
      for (const c of cotizacionesRaw) {
        const d = c.data || c;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args: any = {
          nombre: c.nombre || "",
          fecha: c.fecha || new Date().toISOString(),
        };
        // Map scalar fields
        const strFields = [
          "tcCustomPaneles","tcCustomMicros","tcSnapshot","cantidad","potencia",
          "precioPorWatt","fletePaneles","garantiaPaneles","precioMicroinversor",
          "precioCable","precioECU","precioHerramienta","fleteMicros","fleteAluminio",
          "panelCatalogoId","microCatalogoId","reciboPDFBase64","minisplitTemporada",
        ];
        for (const k of strFields) if (d[k] != null && d[k] !== "") args[k] = String(d[k]);
        if (d.tcFrozen != null) args.tcFrozen = Boolean(d.tcFrozen);
        if (d.incluyeECU != null) args.incluyeECU = Boolean(d.incluyeECU);
        if (d.incluyeHerramienta != null) args.incluyeHerramienta = Boolean(d.incluyeHerramienta);
        if (d.aluminio?.length) args.aluminio = d.aluminio;
        if (d.tornilleria?.length) args.tornilleria = d.tornilleria;
        if (d.generales?.length) args.generales = d.generales;
        if (d.reciboCFE) args.reciboCFE = d.reciboCFE;
        if (d.minisplits?.length) args.minisplits = d.minisplits;
        if (d.utilidad) args.utilidad = d.utilidad;
        await saveCotizacion(args);
      }
      log(`✓ ${cotizacionesRaw.length} cotizaciones migradas`);

      // ── 8. Cotizaciones Cliente ──
      const cotClienteRaw = JSON.parse(localStorage.getItem("cotizaciones_cliente") || "[]");
      log(`Migrando ${cotClienteRaw.length} cotizaciones cliente...`);
      for (const c of cotClienteRaw) {
        await saveCotizacionCliente({
          cotizacionBase: c.cotizacionBase || "",
          nombre: c.nombre || "",
          fecha: c.fecha || new Date().toISOString(),
          data: JSON.stringify(c),
        });
      }
      log(`✓ ${cotClienteRaw.length} cotizaciones cliente migradas`);

      // ── 9. Seguimiento ──
      const seguimientoRaw = JSON.parse(localStorage.getItem("seguimiento_proyectos") || "[]");
      log(`Migrando ${seguimientoRaw.length} seguimientos...`);
      for (const s of seguimientoRaw) {
        await saveSeguimiento({
          cotizacionNombre: s.cotizacionNombre || "",
          items: JSON.stringify(s.items || []),
          fechaActualizacion: s.fechaActualizacion || new Date().toISOString(),
        });
      }
      log(`✓ ${seguimientoRaw.length} seguimientos migrados`);

      log("");
      log("═══════════════════════════════════");
      log("✓ MIGRACIÓN COMPLETA");
      log("═══════════════════════════════════");
      setDone(true);
    } catch (err) {
      log(`✗ ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  // Check what's in localStorage (only after mount to avoid SSR errors)
  const provCount = mounted ? JSON.parse(localStorage.getItem("proveedores") || "[]").length : 0;
  const panelCount = mounted ? JSON.parse(localStorage.getItem("productos_panel") || "[]").length : 0;
  const microCount = mounted ? JSON.parse(localStorage.getItem("productos_micro") || "[]").length : 0;
  const generalCount = mounted ? JSON.parse(localStorage.getItem("productos_general") || "[]").length : 0;
  const ofertaCount = mounted ? JSON.parse(localStorage.getItem("ofertas") || "[]").length : 0;
  const archivoCount = mounted ? JSON.parse(localStorage.getItem("archivos_proveedor") || "[]").length : 0;
  const cotCount = mounted ? JSON.parse(localStorage.getItem("cotizaciones_paneles") || "[]").length : 0;
  const total = provCount + panelCount + microCount + generalCount + ofertaCount + archivoCount + cotCount;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">☀️</span>
            <span className="hidden sm:block text-sm font-semibold text-zinc-100 tracking-tight">Cotizador Solar</span>
          </div>
          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
          <AppNav />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Migrar datos a Convex</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Transfiere tus datos de localStorage (este navegador) a la base de datos en la nube
          </p>
        </div>

        {total === 0 && !done && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-zinc-400">No hay datos en localStorage de este navegador.</p>
            <p className="text-xs text-zinc-600 mt-1">Abre esta página desde el navegador donde tenías los datos cargados.</p>
          </div>
        )}

        {total > 0 && !done && (
          <div className="rounded-2xl border border-amber-400/30 bg-zinc-900 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-amber-400">Datos encontrados en localStorage:</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Proveedores", count: provCount },
                { label: "Paneles", count: panelCount },
                { label: "Micros", count: microCount },
                { label: "Generales", count: generalCount },
                { label: "Ofertas", count: ofertaCount },
                { label: "Archivos PDF", count: archivoCount },
                { label: "Cotizaciones", count: cotCount },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-zinc-800 p-3 text-center">
                  <p className="text-lg font-bold text-zinc-100 font-mono">{item.count}</p>
                  <p className="text-[10px] text-zinc-500">{item.label}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleMigrar}
              disabled={running}
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {running ? "Migrando..." : `Migrar ${total} registros a Convex`}
            </button>
          </div>
        )}

        {done && (
          <div className="rounded-2xl border border-emerald-400/30 bg-zinc-900 p-6 text-center space-y-3">
            <p className="text-lg font-bold text-emerald-400">Migración completa</p>
            <p className="text-sm text-zinc-400">Tus datos ya están en la nube. Ahora puedes verlos desde cualquier dispositivo.</p>
            <a href="/catalogo" className="inline-block rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-300 transition-colors">
              Ir al catálogo
            </a>
          </div>
        )}

        {status.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="font-mono text-xs space-y-0.5 max-h-80 overflow-y-auto">
              {status.map((line, i) => (
                <p key={i} className={line.startsWith("✓") ? "text-emerald-400" : line.startsWith("✗") ? "text-red-400" : line.startsWith("⚠") || line.includes("⚠") ? "text-amber-400" : line.startsWith("═") ? "text-emerald-400 font-bold" : "text-zinc-400"}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
