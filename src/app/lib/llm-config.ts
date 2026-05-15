// ── Configuración de modelos Anthropic ───────────────────────────────────────
// Punto único de cambio para el modelo usado por cada endpoint que toca
// Anthropic. Override por variable de entorno; el caller pasa su fallback
// (string que ya tenía hardcodeado), así migrar a este helper no cambia
// comportamiento. Si más adelante se quiere unificar, basta cambiar el
// fallback en un solo lugar (o setear las env vars).
//
// Variables soportadas:
//   ANTHROPIC_MODEL_CHAT     → /api/chat (streaming conversacional)
//   ANTHROPIC_MODEL_EXTRACT  → /api/leer-recibo, /api/leer-catalogo,
//                              /api/leer-texto (extracción JSON estructurada)

export type LLMPurpose = "chat" | "extract";

const ENV_VAR_BY_PURPOSE: Record<LLMPurpose, string> = {
  chat: "ANTHROPIC_MODEL_CHAT",
  extract: "ANTHROPIC_MODEL_EXTRACT",
};

/**
 * Devuelve el modelo Anthropic configurado para el propósito indicado.
 * Si la env var correspondiente no está definida, regresa `fallback`.
 */
export function getAnthropicModel(purpose: LLMPurpose, fallback: string): string {
  return process.env[ENV_VAR_BY_PURPOSE[purpose]] || fallback;
}
