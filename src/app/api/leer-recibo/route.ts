import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `Eres un extractor de datos de recibos de CFE (Comisión Federal de Electricidad de México).

Analiza este recibo y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional, sin explicaciones) con exactamente esta estructura:

{
  "nombre": "nombre completo del titular del servicio",
  "direccion": "dirección completa del servicio (calle, colonia, ciudad)",
  "noServicio": "número de servicio tal como aparece en el recibo",
  "tarifa": "clave de tarifa (ej: 1A, DAC, 2, 3, PDBT, GDBT...)",
  "periodoInicio": "fecha de inicio del período facturado en formato DD MMM AA",
  "periodoFin": "fecha de fin del período facturado en formato DD MMM AA",
  "diasPeriodo": número total de días del período,
  "consumoKwh": kWh consumidos en el período actual (número),
  "consumoMensualPromedio": promedio de kWh por mes calculado del historial completo (número, 0 si no hay historial),
  "totalFacturado": importe total a pagar en MXN (número, sin símbolo de peso),
  "historico": [
    {"periodo": "descripción corta ej: Jul-Sep 24", "kwh": número, "importe": número}
  ]
}

REGLAS:
- Todos los valores numéricos deben ser números, no strings
- Si un campo no está disponible, usa "" para strings o 0 para números
- El historial debe incluir TODOS los períodos mostrados en la tabla de consumo histórico
- consumoMensualPromedio: si el período es bimestral (~60 días), divide cada kWh entre 2 para obtener mensual, luego promedia
- No incluyas el símbolo $ en valores numéricos
- Responde SOLO con el JSON, absolutamente nada más`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario" }, { status: 400 });
  }

  const file = formData.get("pdf") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: PROMPT,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Strip markdown fences if model wraps the JSON
    const jsonStr = text
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    const data = JSON.parse(jsonStr);
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[leer-recibo]", err);
    const msg = err instanceof Error ? err.message : "Error procesando el recibo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
