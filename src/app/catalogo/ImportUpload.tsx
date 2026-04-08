"use client";

// ── ImportUpload ──────────────────────────────────────────────────────────
// Upload zone for catalog PDFs with proveedor selection.
// Handles: file drop/pick → /api/leer-catalogo → transform → staging rows → Convex.

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  transformToStagingRows,
  type ExtractionResult,
  type ExtractedItem,
} from "../lib/import-to-staging";
import {
  buildProductIndex,
  type CanonicalProduct,
} from "../lib/import-utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface Proveedor {
  id: string;
  nombre: string;
}

interface ImportUploadProps {
  proveedores: Proveedor[];
  canonicalProducts: CanonicalProduct[];
  onImportStarted: (runId: Id<"importRuns">) => void;
  onImportComplete: (runId: Id<"importRuns">) => void;
  onError: (error: string) => void;
}

type UploadStep =
  | "idle"
  | "uploading"      // Sending to /api/leer-catalogo
  | "extracting"     // Claude processing (multi-page)
  | "saving"         // Writing staging rows to Convex
  | "done";

// ── Component ─────────────────────────────────────────────────────────────

export default function ImportUpload({
  proveedores,
  canonicalProducts,
  onImportStarted,
  onImportComplete,
  onError,
}: ImportUploadProps) {
  const [proveedorId, setProveedorId] = useState("");
  const [step, setStep] = useState<UploadStep>("idle");
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Convex mutations
  const createRun = useMutation(api.importRuns.create);
  const updateProgress = useMutation(api.importRuns.updateProgress);
  const markStaging = useMutation(api.importRuns.markStaging);
  const markFailed = useMutation(api.importRuns.markFailed);
  const createBatch = useMutation(api.importRowStaging.createBatch);
  const saveArchivo = useMutation(api.archivos.save);
  const generateUploadUrl = useMutation(api.archivos.generateUploadUrl);

  const productIndex = buildProductIndex(canonicalProducts);

  // ── File handling ─────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!proveedorId) {
      onError("Selecciona un proveedor antes de subir el archivo");
      return;
    }

    const provId = proveedorId as Id<"proveedores">;

    try {
      setStep("uploading");
      setProgress("Preparando archivo...");

      // 1. Upload PDF to Convex storage
      const uploadUrl = await generateUploadUrl();
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await uploadRes.json();

      // 2. Create archivosProveedor record
      const archivoId = await saveArchivo({
        nombre: file.name,
        proveedorId: provId,
        fechaImportacion: new Date().toISOString(),
        fechaDocumento: "",
        condiciones: "",
        resumenCondiciones: "",
        storageId,
      });

      // 3. Check page count
      setProgress("Analizando PDF...");
      const pagesRes = await fetch("/api/pdf-paginas", {
        method: "POST",
        body: (() => { const fd = new FormData(); fd.append("pdf", file); return fd; })(),
      });
      const pagesData = await pagesRes.json();
      if (pagesData.error) throw new Error(pagesData.error);

      const totalPages: number = pagesData.totalPages ?? 1;

      // 4. Create import run
      const runId = await createRun({
        proveedorId: provId,
        archivoProveedorId: archivoId,
        nombreArchivo: file.name,
        paginasTotal: totalPages,
      });

      onImportStarted(runId);
      setStep("extracting");

      // 5. Extract from PDF (page by page if large, single shot if small)
      let allItems: ExtractedItem[] = [];
      let extractionMetadata: Partial<ExtractionResult> = {};

      if (totalPages <= 3) {
        // Single shot
        setProgress("Extrayendo productos...");
        const fd = new FormData();
        fd.append("pdf", file);
        const res = await fetch("/api/leer-catalogo", { method: "POST", body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        allItems = (data.items ?? []) as ExtractedItem[];
        extractionMetadata = data;

        await updateProgress({
          id: runId,
          paginasProcesadas: totalPages,
          filasExtraidas: allItems.length,
        });
      } else {
        // Page by page
        const pages: { page: number; base64: string }[] = pagesData.pages ?? [];

        for (let i = 0; i < pages.length; i++) {
          const pg = pages[i];
          setProgress(`Procesando página ${i + 1} de ${pages.length}...`);

          try {
            const res = await fetch("/api/leer-catalogo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                base64: pg.base64,
                mime: "application/pdf",
                pageLabel: `página ${pg.page} de ${pages.length}`,
              }),
            });
            const data = await res.json();

            if (!data.error && data.items) {
              const pageItems = (data.items as ExtractedItem[]).map((item) => ({
                ...item,
                // Tag with page number for traceability
              }));
              allItems = [...allItems, ...pageItems];

              // Capture metadata from first successful page
              if (!extractionMetadata.proveedor && data.proveedor) {
                extractionMetadata = data;
              }
            }
          } catch {
            // Continue with other pages even if one fails
          }

          await updateProgress({
            id: runId,
            paginasProcesadas: i + 1,
            filasExtraidas: allItems.length,
          });
        }
      }

      if (allItems.length === 0) {
        await markFailed({ id: runId, errorExtraccion: "No se encontraron productos en el PDF" });
        throw new Error("No se encontraron productos en el PDF");
      }

      // 6. Transform to staging rows with auto-matching
      setStep("saving");
      setProgress(`Guardando ${allItems.length} filas en staging...`);

      const stagingRows = transformToStagingRows(
        allItems,
        runId,
        productIndex,
      );

      // 7. Save staging rows in batches (Convex has transaction limits)
      const BATCH_SIZE = 50;
      for (let i = 0; i < stagingRows.length; i += BATCH_SIZE) {
        const batch = stagingRows.slice(i, i + BATCH_SIZE);
        setProgress(`Guardando filas ${i + 1}–${Math.min(i + BATCH_SIZE, stagingRows.length)} de ${stagingRows.length}...`);
        await createBatch({ rows: batch });
      }

      // 8. Update archivo with metadata
      if (extractionMetadata.fechaDocumento || extractionMetadata.condiciones) {
        await saveArchivo({
          id: archivoId,
          nombre: file.name,
          proveedorId: provId,
          fechaImportacion: new Date().toISOString(),
          fechaDocumento: extractionMetadata.fechaDocumento ?? "",
          condiciones: extractionMetadata.condiciones ?? "",
          resumenCondiciones: extractionMetadata.resumenCondiciones ?? "",
          storageId,
        });
      }

      // 9. Mark import run as ready for review
      await markStaging({
        id: runId,
        filasExtraidas: stagingRows.length,
      });

      setStep("done");
      setProgress(`${stagingRows.length} filas extraídas y listas para revisión`);
      onImportComplete(runId);

      // Auto-reset after 3 seconds
      setTimeout(() => {
        setStep("idle");
        setProgress("");
      }, 3000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al importar";
      onError(msg);
      setStep("idle");
      setProgress("");
    }
  }, [
    proveedorId, productIndex, onImportStarted, onImportComplete, onError,
    createRun, updateProgress, markStaging, markFailed, createBatch,
    saveArchivo, generateUploadUrl,
  ]);

  // ── Drag & drop ───────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // ── Render ────────────────────────────────────────────────────────────

  const isProcessing = step !== "idle" && step !== "done";

  return (
    <div className="space-y-4">
      {/* Proveedor selector */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
          Proveedor
        </label>
        <select
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
          disabled={isProcessing}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 disabled:opacity-50"
        >
          <option value="">Seleccionar proveedor...</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          dragOver
            ? "border-amber-400 bg-amber-400/5"
            : isProcessing
            ? "border-zinc-700 bg-zinc-900/50"
            : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/30"
        } ${isProcessing ? "pointer-events-none" : "cursor-pointer"}`}
        onClick={() => !isProcessing && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />

        <div className="flex flex-col items-center justify-center py-10 px-6">
          {isProcessing ? (
            <>
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-zinc-300 font-medium">{progress}</p>
              <p className="text-xs text-zinc-600 mt-1">
                {step === "uploading" && "Subiendo archivo..."}
                {step === "extracting" && "Claude está analizando el PDF..."}
                {step === "saving" && "Guardando en staging..."}
              </p>
            </>
          ) : step === "done" ? (
            <>
              <span className="text-2xl mb-2">✓</span>
              <p className="text-sm text-emerald-400 font-medium">{progress}</p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-zinc-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-zinc-300">
                Arrastra un PDF de proveedor o{" "}
                <span className="text-amber-400 font-medium">haz clic aquí</span>
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Se extraerán productos y precios automáticamente
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
