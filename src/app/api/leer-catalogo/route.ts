import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `Eres un extractor de datos de listas de precios de proveedores de energía solar.

Analiza este documento (PDF de un proveedor) y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con esta estructura:

{
  "proveedor": "nombre del proveedor tal como aparece (sin abreviar, con espacios y mayúsculas originales), o vacío",
  "fechaDocumento": "fecha de la lista de precios en formato YYYY-MM-DD (busca en el documento: mes/año de vigencia, fecha de emisión, periodo de validez, etc). Si no la encuentras, usa vacío",
  "condiciones": "texto completo de las condiciones, notas importantes, términos legales, etc. tal como aparecen en el documento. Incluye TODO: condiciones de pago, disponibilidad, tipo de cambio, garantías, entregas, etc. Si no hay, usa vacío",
  "resumenCondiciones": "resumen en 3-5 bullets de los puntos MÁS IMPORTANTES para alguien que va a COMPRAR: condiciones de pago, tipo de cambio, disponibilidad, tiempos de entrega, garantías, restricciones. Sé conciso y directo. Si no hay condiciones, usa vacío",
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
- "fechaDocumento": busca en el documento cualquier indicación de fecha: "precios de febrero 2026", "vigencia: enero-marzo 2026", "actualizado al 15/02/2026", etc. Extrae la fecha más relevante en formato YYYY-MM-DD. Si solo dice mes y año, usa el día 1. Si no encuentras ninguna fecha, deja "".
- Responde SOLO con el JSON, absolutamente nada más.`;

/**
 * Attempt to repair truncated JSON by closing open strings, arrays and objects.
 * This handles the case where Claude's response is cut off mid-JSON.
 */
function repairTruncatedJSON(json: string): string {
  let s = json.trimEnd();

  // Remove trailing comma
  s = s.replace(/,\s*$/, "");

  // If we're inside an unterminated string, close it
  // Count unescaped quotes to see if we're inside a string
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) {
      inString = !inString;
    }
  }
  if (inString) {
    s += '"';
  }

  // Remove any trailing key without value like `"key":`  or `"key": `
  s = s.replace(/,?\s*"[^"]*"\s*:\s*$/, "");

  // Count open brackets/braces and close them
  let openBraces = 0;
  let openBrackets = 0;
  inString = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (s[i] === '{') openBraces++;
    else if (s[i] === '}') openBraces--;
    else if (s[i] === '[') openBrackets++;
    else if (s[i] === ']') openBrackets--;
  }

  // Remove trailing comma before we close
  s = s.replace(/,\s*$/, "");

  for (let i = 0; i < openBrackets; i++) s += "]";
  for (let i = 0; i < openBraces; i++) s += "}";

  return s;
}

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

  // Detect file type for Claude API
  const mime = file.type || "application/pdf";
  const isImage = mime.startsWith("image/");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    // Build content block: document for PDFs, image for images
    const fileBlock = isImage
      ? {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        }
      : {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        };

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16384,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: PROMPT,
            },
          ],
        },
      ],
    });

    // Check if response was truncated
    if (response.stop_reason === "max_tokens") {
      console.warn("[leer-catalogo] Response truncated (max_tokens reached)");
    }

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    const jsonStr = text
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      // If JSON is truncated, try to repair it by closing open structures
      const repaired = repairTruncatedJSON(jsonStr);
      data = JSON.parse(repaired);
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[leer-catalogo]", err);
    let msg = err instanceof Error ? err.message : "Error procesando el archivo";
    // Friendly messages for common API errors
    if (msg.includes("Overloaded") || msg.includes("529")) {
      msg = "El servicio de IA está saturado en este momento. Intenta de nuevo en unos segundos.";
    } else if (msg.includes("rate") || msg.includes("429")) {
      msg = "Demasiadas solicitudes. Espera un momento e intenta de nuevo.";
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
