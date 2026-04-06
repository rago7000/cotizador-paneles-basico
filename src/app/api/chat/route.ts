import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

// ── System prompts ──────────────────────────────────────────────────────────

function buildCotizacionPrompt(cotizacion: Record<string, unknown>) {
  return `Eres un asistente experto en energía solar para una empresa instaladora de paneles solares en México.
Estás integrado directamente en el cotizador. El usuario está trabajando en una cotización EN ESTE MOMENTO y tú puedes ver todos los datos en tiempo real.

Siempre respondes en español. Sé conciso, directo y útil. Responde en 2-4 oraciones cuando sea posible. Usa bullets para listas.

## La cotización actual que el usuario está editando:

${JSON.stringify(cotizacion, null, 2)}

## Campos clave que entiendes:
- nombre: nombre del cliente/proyecto
- cantidad/potencia: paneles × watts por panel = sistema total
- precioPorWatt: costo USD/W de paneles (proveedor)
- precioMicroinversor: costo USD del micro
- aluminio/tornilleria/generales: partidas de estructura e instalación (MXN)
- utilidad: markup al cliente (globalPct = porcentaje de utilidad)
- reciboCFE: consumo eléctrico del cliente (kWh, $, historial bimestral)
- tcSnapshot: tipo de cambio USD→MXN usado
- etapa: estado en pipeline comercial
- origen: canal de captación del cliente

## Qué puedes hacer:
1. **Analizar costos**: desglosar y calcular totales, comparar partidas
2. **Optimizar precio**: sugerir ajustes de utilidad, precio competitivo por watt al cliente
3. **Evaluar sizing**: ¿el sistema propuesto cubre el consumo del recibo CFE?
4. **Calcular ROI**: payback period, ahorro mensual/anual estimado
5. **Dar recomendaciones**: basadas en los datos reales que estás viendo
6. **Responder dudas técnicas**: sobre paneles, micros, estructura, interconexión CFE

Cuando hagas cálculos, muestra los números. Usa $MXN o $USD explícitamente.`;
}

function buildAnalisisPrompt(cotizaciones: Record<string, unknown>[]) {
  return `Eres un analista de negocio experto para una empresa de instalación de paneles solares en México.
Siempre respondes en español. Eres conciso, profesional y orientado a datos.

Tienes acceso a ${cotizaciones.length} cotizaciones del sistema.

## Capacidades de análisis:
- Pipeline: distribución por etapa, valor del pipeline
- Márgenes y utilidad: porcentajes, comparación entre cotizaciones
- Precios: tendencias de precio por watt, costos
- Dimensionamiento: kW por proyecto, paneles promedio
- Canales de captación: efectividad por origen
- ROI: ahorro estimado, payback
- Tendencias temporales: volumen por mes

Cuando hagas cálculos, muestra los números. Usa formato $MXN o $USD.
Si no hay datos suficientes, dilo claramente.

## Datos (JSON):
${JSON.stringify(cotizaciones, null, 0)}`;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages, cotizacion, cotizaciones, mode } = await req.json();

  const system = mode === "cotizacion" && cotizacion
    ? buildCotizacionPrompt(cotizacion)
    : buildAnalisisPrompt(cotizaciones ?? []);

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514" as string),
    system,
    messages,
  });

  return result.toTextStreamResponse();
}
