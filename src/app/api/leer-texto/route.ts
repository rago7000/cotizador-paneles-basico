import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT_FREETEXT = `Eres un extractor y normalizador de datos de listas de precios de proveedores de energía solar.

El usuario pegó texto que obtuvo pre-procesando un PDF de proveedor (posiblemente con otra IA, o copiado a mano). El texto puede estar en cualquier formato: tablas, TSV, CSV, JSON, texto libre, listas, etc.

Tu trabajo es INTERPRETAR ese texto y devolver ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con esta estructura:

{
  "proveedor": "nombre del proveedor si lo encuentras, o vacío",
  "fechaDocumento": "fecha de la lista de precios en formato YYYY-MM-DD si la encuentras, o vacío",
  "condiciones": "texto de condiciones, términos, notas importantes si las hay, o vacío",
  "resumenCondiciones": "resumen en 3-5 bullets de los puntos más importantes para un comprador, o vacío",
  "items": [
    {
      "tipo": "panel" | "micro" | "monitoreo" | "cable" | "herramienta" | "estructura" | "tornilleria" | "otro",
      "marca": "marca del producto",
      "modelo": "modelo exacto",
      "descripcion": "descripción completa",
      "potencia": 0,
      "panelesPorUnidad": 0,
      "precio": 0,
      "precioTiers": [
        {"etiqueta": "1 panel", "precio": 0.159},
        {"etiqueta": "1 pallet (36 pzas)", "precio": 0.156}
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
  - "cable": cables troncales, conectores, cable fotovoltaico, protecciones
  - "monitoreo": ECU, sistemas de monitoreo, comunicación WiFi/4G, dongles
  - "herramienta": herramientas de instalación (desconectora APS, etc), conectores
  - "estructura": perfiles de aluminio, rieles, clamps
  - "tornilleria": tornillos, tuercas, anclas
  - "otro": fletes, garantías, servicios, cualquier otra cosa
- "potencia" solo para paneles (en Watts). Para otros tipos usa 0.
- "panelesPorUnidad" solo para microinversores. Para otros tipos usa 0.
- "precio" debe ser el precio más común o el de menor volumen (ej: precio por 1 unidad/panel). Siempre como número.
- "precioTiers": si hay múltiples precios por volumen/cantidad, extráelos TODOS. Si solo hay un precio, deja precioTiers como array vacío [].
- "unidad": usa "por_watt" solo para paneles cuyo precio esté expresado por Watt. Para todo lo demás usa "por_unidad".
- Si el precio es por Watt, pon el precio por Watt (no el total del panel).
- Todos los valores numéricos deben ser números, no strings.
- Si un campo no está disponible, usa "" para strings o 0 para números.
- Extrae TODOS los productos y precios que encuentres.
- Sé inteligente interpretando el formato: puede venir como tabla con tabs, CSV, JSON parcial, texto libre, o cualquier combinación.
- Si ves encabezados como PROVEEDOR:, FECHA:, CONDICIONES:, extrae esa metadata.
- Si ves columnas separadas por tabs o comas, interpreta cada fila como un producto.
- Responde SOLO con el JSON, absolutamente nada más.`;

const PROMPT_JSON_VALIDATE = `Eres un validador y normalizador de datos de listas de precios de proveedores de energía solar.

El usuario te pasa un JSON que ya fue pre-procesado por otra IA. Tu trabajo es VALIDAR y CORREGIR los datos, NO reescribir todo el JSON.

Revisa cada item y corrige si es necesario:
- Que "tipo" sea uno de: "panel", "micro", "monitoreo", "cable", "herramienta", "estructura", "tornilleria", "otro"
- Que "potencia" solo tenga valor para paneles (en Watts), 0 para los demás
- Que "panelesPorUnidad" solo tenga valor para microinversores, 0 para los demás
- Que "precio" sea número, no string
- Que "precioTiers" sea un array de objetos {etiqueta, precio} o [] si solo hay un precio
- Que "moneda" sea "USD" o "MXN"
- Que "unidad" sea "por_watt" o "por_unidad"
- Que no falten campos obligatorios

Si todo está bien, devuelve el JSON tal cual (sin markdown). Si hay errores, corrígelos.
Devuelve ÚNICAMENTE el JSON corregido, sin markdown, sin explicaciones.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
  }

  let body: { texto: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el cuerpo de la solicitud" }, { status: 400 });
  }

  const texto = body.texto?.trim();
  if (!texto) {
    return NextResponse.json({ error: "No se recibió texto para procesar" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Detect if input is already valid JSON with expected structure
  let isPreformatted = false;
  let parsedInput: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(texto);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
      isPreformatted = true;
      parsedInput = parsed;
    }
  } catch {
    // Not JSON — will use freetext prompt
  }

  // If already valid JSON with items, use lighter validation prompt
  const prompt = isPreformatted ? PROMPT_JSON_VALIDATE : PROMPT_FREETEXT;

  try {
    // For pre-formatted JSON, we can try to skip AI if structure looks correct
    if (isPreformatted && parsedInput) {
      // Quick local validation — check if all items have required fields
      const items = parsedInput.items as Record<string, unknown>[];
      const validTypes = ["panel", "micro", "monitoreo", "cable", "herramienta", "estructura", "tornilleria", "otro"];
      const allValid = items.every((it) =>
        validTypes.includes(String(it.tipo || "")) &&
        typeof it.precio === "number" &&
        typeof it.marca === "string" &&
        typeof it.modelo === "string"
      );

      if (allValid) {
        // Still send to AI but with validation-only prompt (much shorter response)
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 32768,
          messages: [
            {
              role: "user",
              content: `${prompt}\n\n--- JSON A VALIDAR ---\n${texto}`,
            },
          ],
        });

        const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
        const jsonStr = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

        try {
          const data = JSON.parse(jsonStr);
          return NextResponse.json(data);
        } catch {
          // AI response was truncated or bad — fall back to using the original parsed input
          // The original JSON was valid, so just return it directly
          return NextResponse.json(parsedInput);
        }
      }
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 32768,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\n--- DATOS DEL USUARIO ---\n${texto}`,
        },
      ],
    });

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
      // Try to repair truncated JSON
      let s = jsonStr.trimEnd().replace(/,\s*$/, "");
      let inString = false;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) inString = !inString;
      }
      if (inString) s += '"';
      s = s.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
      let openBraces = 0, openBrackets = 0;
      inString = false;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) { inString = !inString; continue; }
        if (inString) continue;
        if (s[i] === '{') openBraces++;
        else if (s[i] === '}') openBraces--;
        else if (s[i] === '[') openBrackets++;
        else if (s[i] === ']') openBrackets--;
      }
      s = s.replace(/,\s*$/, "");
      for (let i = 0; i < openBrackets; i++) s += "]";
      for (let i = 0; i < openBraces; i++) s += "}";
      data = JSON.parse(s);
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[leer-texto]", err);
    let msg = err instanceof Error ? err.message : "Error procesando el texto";
    if (msg.includes("Overloaded") || msg.includes("529")) {
      msg = "El servicio de IA está saturado. Intenta de nuevo en unos segundos.";
    } else if (msg.includes("rate") || msg.includes("429")) {
      msg = "Demasiadas solicitudes. Espera un momento e intenta de nuevo.";
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
