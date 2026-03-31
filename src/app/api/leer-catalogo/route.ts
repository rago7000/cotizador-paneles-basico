import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `Eres un extractor de datos de listas de precios de proveedores de energía solar.

Analiza este documento (PDF de un proveedor) y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con esta estructura:

{
  "proveedor": "nombre del proveedor si aparece en el documento, o vacío",
  "items": [
    {
      "tipo": "panel" | "micro" | "cable" | "ecu" | "herramienta" | "estructura" | "tornilleria" | "otro",
      "marca": "marca del producto",
      "modelo": "modelo exacto",
      "descripcion": "descripción completa tal como aparece",
      "potencia": 0,
      "panelesPorUnidad": 0,
      "precio": 0,
      "precioTiers": [
        {"etiqueta": "1 panel", "precio": 0.159},
        {"etiqueta": "1 pallet (36 pzas)", "precio": 0.156},
        {"etiqueta": "+5 pallets", "precio": 0.153}
      ],
      "moneda": "USD" | "MXN",
      "unidad": "por_watt" | "por_unidad",
      "notas": ""
    }
  ]
}

REGLAS:
- Clasifica cada producto según su tipo:
  - "panel": paneles solares / módulos fotovoltaicos
  - "micro": microinversores
  - "cable": cables troncales, conectores
  - "ecu": ECU, sistema de monitoreo
  - "herramienta": herramientas de instalación (desconectora APS, etc)
  - "estructura": perfiles de aluminio, rieles, clamps
  - "tornilleria": tornillos, tuercas, anclas
  - "otro": fletes, garantías, servicios, cualquier otra cosa
- "potencia" solo para paneles (en Watts). Para otros tipos usa 0.
- "panelesPorUnidad" solo para microinversores. Para otros tipos usa 0.
- "precio" debe ser el precio más común o el de menor volumen (ej: precio por 1 unidad/panel). Siempre como número.
- "precioTiers": si hay múltiples precios por volumen/cantidad, extráelos TODOS como array. Cada tier tiene "etiqueta" (descripción de la cantidad) y "precio" (número). Si solo hay un precio, deja precioTiers como array vacío [].
- "unidad": usa "por_watt" solo para paneles cuyo precio esté expresado por Watt. Para todo lo demás usa "por_unidad".
- Si el precio es por Watt, pon el precio por Watt (no el total del panel).
- Todos los valores numéricos deben ser números, no strings.
- Si un campo no está disponible, usa "" para strings o 0 para números.
- Extrae TODOS los productos y precios que encuentres en el documento.
- Responde SOLO con el JSON, absolutamente nada más.`;

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
      max_tokens: 4096,
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

    const jsonStr = text
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    const data = JSON.parse(jsonStr);
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[leer-catalogo]", err);
    const msg = err instanceof Error ? err.message : "Error procesando el PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
