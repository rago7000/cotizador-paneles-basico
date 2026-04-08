"use client";

// ── StagingActions ────────────────────────────────────────────────────────
// Batch action bar for staging review.
// Phase 4 UI — Step 3: Accept auto-matched, discard pending.

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface StagingActionsProps {
  runId: Id<"importRuns">;
  autoMatchableCount: number;
  pendingCount: number;
}

export default function StagingActions({
  runId,
  autoMatchableCount,
  pendingCount,
}: StagingActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const acceptAllAuto = useMutation(api.importRowStaging.acceptAllAuto);
  const discardAllPending = useMutation(api.importRowStaging.discardAllPending);

  const handleAcceptAuto = async () => {
    setLoading("accept");
    try {
      const result = await acceptAllAuto({ importRunId: runId });
      setFeedback(`${result.accepted} filas aceptadas`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      console.error("Error accepting auto:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleDiscardPending = async () => {
    setLoading("discard");
    setShowDiscardConfirm(false);
    try {
      const result = await discardAllPending({ importRunId: runId });
      setFeedback(`${result.discarded} filas descartadas`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      console.error("Error discarding:", err);
    } finally {
      setLoading(null);
    }
  };

  if (autoMatchableCount === 0 && pendingCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Accept all auto-matched */}
      {autoMatchableCount > 0 && (
        <button
          onClick={handleAcceptAuto}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-300 transition-colors disabled:opacity-50"
        >
          {loading === "accept" ? (
            <span className="w-3 h-3 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>✓</span>
          )}
          Aceptar automáticos ({autoMatchableCount})
        </button>
      )}

      {/* Discard all pending */}
      {pendingCount > 0 && (
        <>
          {showDiscardConfirm ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-1.5">
              <span className="text-xs text-red-400">
                ¿Descartar {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}?
              </span>
              <button
                onClick={handleDiscardPending}
                disabled={loading !== null}
                className="rounded px-2 py-0.5 text-xs font-medium bg-red-400/20 text-red-400 hover:bg-red-400/30 transition-colors disabled:opacity-50"
              >
                Sí, descartar
              </button>
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDiscardConfirm(true)}
              disabled={loading !== null}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Descartar pendientes ({pendingCount})
            </button>
          )}
        </>
      )}

      {/* Feedback toast */}
      {feedback && (
        <span className="text-xs text-emerald-400 font-medium animate-pulse">
          {feedback}
        </span>
      )}
    </div>
  );
}
