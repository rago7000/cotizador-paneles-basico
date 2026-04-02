import type { StructureRowInput, StructureTotals } from "./types";
import { calculateStructure } from "./calculate-structure";

// ── Public types ────────────────────────────────────────────────────────────

export interface Arrangement {
  rows: StructureRowInput[];
  totalPaneles: number;
  totalMaterial: number; // sum of ángulos + unicanales + clips (for comparison)
  totals: StructureTotals;
}

export interface ArrangementResult {
  optimo: Arrangement; // least material
  conservador: Arrangement; // most material
  todas: Arrangement[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_H = 6;
const MAX_V = 2;
const MAX_ROWS = 4;

/** All valid (H, V) pairs and their panel count, sorted descending by panels */
const ROW_OPTIONS: { h: number; v: number; panels: number }[] = [];
for (let h = 1; h <= MAX_H; h++) {
  for (let v = 1; v <= MAX_V; v++) {
    ROW_OPTIONS.push({ h, v, panels: h * v });
  }
}
ROW_OPTIONS.sort((a, b) => b.panels - a.panels);

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Canonical key for deduplication: sorted (H,V) pairs descending by panels */
function arrangementKey(rows: StructureRowInput[]): string {
  return [...rows]
    .sort((a, b) => {
      const pa = a.horizontal * a.vertical;
      const pb = b.horizontal * b.vertical;
      if (pb !== pa) return pb - pa;
      if (b.horizontal !== a.horizontal) return b.horizontal - a.horizontal;
      return b.vertical - a.vertical;
    })
    .map((r) => `${r.horizontal}x${r.vertical}`)
    .join("|");
}

// ── Core: enumerate combinations via backtracking ───────────────────────────

function findCombinations(
  remaining: number,
  maxRows: number,
  current: StructureRowInput[],
  startIdx: number,
  results: StructureRowInput[][],
): void {
  if (remaining === 0) {
    results.push([...current]);
    return;
  }
  if (maxRows === 0 || remaining < 0) return;

  for (let i = startIdx; i < ROW_OPTIONS.length; i++) {
    const opt = ROW_OPTIONS[i];
    if (opt.panels > remaining) continue;

    current.push({ horizontal: opt.h, vertical: opt.v });
    // Allow reuse of same option (startIdx = i), enforces non-ascending order
    findCombinations(remaining - opt.panels, maxRows - 1, current, i, results);
    current.pop();
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export function generateArrangements(
  cantidadPaneles: number,
): ArrangementResult | null {
  if (cantidadPaneles <= 0) return null;

  // 1. Generate all unique row combinations that sum to cantidadPaneles
  const rawCombinations: StructureRowInput[][] = [];
  findCombinations(cantidadPaneles, MAX_ROWS, [], 0, rawCombinations);

  if (rawCombinations.length === 0) return null;

  // 2. Deduplicate by canonical key
  const seen = new Set<string>();
  const uniqueCombinations: StructureRowInput[][] = [];

  for (const combo of rawCombinations) {
    const key = arrangementKey(combo);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCombinations.push(combo);
    }
  }

  // 3. Calculate material for each combination
  const arrangements: Arrangement[] = [];

  for (const rows of uniqueCombinations) {
    // Sort rows descending by panels-per-row for consistent presentation
    const sorted = [...rows].sort(
      (a, b) => b.horizontal * b.vertical - a.horizontal * a.vertical,
    );

    const result = calculateStructure(sorted);
    const { totals } = result;

    const totalMaterial =
      totals.totalAngulosCompra +
      totals.totalUnicanalesCompra +
      totals.clipsConDesperdicio;

    arrangements.push({
      rows: sorted,
      totalPaneles: totals.totalPaneles,
      totalMaterial,
      totals,
    });
  }

  // 4. Sort: fewer rows first, then by material ascending
  arrangements.sort((a, b) => {
    if (a.rows.length !== b.rows.length) return a.rows.length - b.rows.length;
    return a.totalMaterial - b.totalMaterial;
  });

  // 5. Return optimal (least material) and conservative (most material)
  const byMaterial = [...arrangements].sort(
    (a, b) => a.totalMaterial - b.totalMaterial,
  );

  return {
    optimo: byMaterial[0],
    conservador: byMaterial[byMaterial.length - 1],
    todas: arrangements,
  };
}
