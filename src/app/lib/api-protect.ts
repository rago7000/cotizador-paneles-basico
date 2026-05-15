// ── Protección básica para endpoints que consumen Anthropic ──────────────────
// NO es auth real (eso es trabajo de Convex auth en Fase futura). Es un primer
// escudo contra:
//   1) Scripts externos descubriendo /api/* y vaciando la cuota de Anthropic.
//   2) Bursts abusivos desde una sola IP.
//
// No protege contra un usuario que ya tiene acceso al frontend y abusa desde
// el browser. Para eso hace falta sesión Convex.
//
// Implementación deliberadamente simple y stateless-friendly:
//   - Origin/Referer check contra el host del request.
//   - Token-bucket in-memory por IP (best-effort; en serverless multi-instance
//     cada cold-start tiene su propio Map, pero igual frena ráfagas locales).

import { NextRequest, NextResponse } from "next/server";

// ── Origin check ────────────────────────────────────────────────────────────

/**
 * Devuelve `null` si el request viene del mismo origen del deploy, o una
 * NextResponse 403 si viene de un origin distinto / desconocido.
 *
 * Acepta también requests sin Origin/Referer (curl directo se bloquea solo
 * por rate limit). El objetivo es bloquear cross-origin desde un browser.
 */
export function verifySameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  if (!host) return null; // sin host no podemos comparar; dejamos pasar

  const expected = `://${host}`;
  const candidate = origin || referer || "";
  if (!candidate) return null; // server-to-server / curl: que decida rate limit

  if (!candidate.includes(expected)) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin request blocked" },
      { status: 403 },
    );
  }
  return null;
}

// ── Rate limit in-memory ────────────────────────────────────────────────────

interface Bucket {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const buckets = new Map<string, Bucket>();

function clientKey(req: NextRequest): string {
  // En Vercel viene poblado por la edge. Fallback a "unknown".
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Devuelve `null` si está dentro del límite, o NextResponse 429 si excedió
 * MAX_REQUESTS dentro de WINDOW_MS para esa IP.
 */
export function rateLimit(req: NextRequest): NextResponse | null {
  const key = clientKey(req);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    const retryAfterSec = Math.ceil(
      (WINDOW_MS - (now - bucket.windowStart)) / 1000,
    );
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }
  return null;
}

// ── Combinado ───────────────────────────────────────────────────────────────

/**
 * Corre origin check + rate limit en orden. Devuelve la primera respuesta de
 * error si alguno falla, o `null` para continuar.
 *
 * Uso típico en una route:
 *   const blocked = protectLLMEndpoint(req);
 *   if (blocked) return blocked;
 */
export function protectLLMEndpoint(req: NextRequest): NextResponse | null {
  return verifySameOrigin(req) ?? rateLimit(req);
}
