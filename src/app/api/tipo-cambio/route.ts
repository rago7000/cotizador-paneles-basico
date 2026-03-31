import { NextResponse } from "next/server";

const BANXICO_TOKEN = process.env.BANXICO_TOKEN;

function parseBanxicoValue(raw: string): number | null {
  const valor = parseFloat(String(raw).replace(",", "."));
  return isNaN(valor) ? null : valor;
}

async function fetchBanxico() {
  if (!BANXICO_TOKEN) return null;

  // Fetch last 2 data points to get both "today's DOF" and "tomorrow's DOF"
  const res = await fetch(
    "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/ult/2?mediaType=json",
    { headers: { "Bmx-Token": BANXICO_TOKEN } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const datos = data?.bmx?.series?.[0]?.datos;
  if (!datos || datos.length === 0) return null;

  // Filter valid entries
  const valid = datos
    .map((d: { fecha: string; dato: string }) => ({
      fecha: d.fecha,
      valor: parseBanxicoValue(d.dato),
    }))
    .filter((d: { valor: number | null }) => d.valor !== null);

  if (valid.length === 0) return null;

  // Banxico returns chronologically: [older, newer]
  // The older one = published in today's DOF (for today's payments)
  // The newer one = will be published in tomorrow's DOF (determined today)
  const hoy = valid[0];
  const manana = valid.length > 1 ? valid[1] : null;

  const result: Record<string, unknown> = {
    tipoCambio: hoy.valor,
    fecha: hoy.fecha,
    fuente: "Banxico FIX — publicado en DOF",
    etiqueta: "DOF hoy (para pagos de hoy)",
  };

  if (manana && manana.valor !== hoy.valor) {
    result.tipoCambioAlt = manana.valor;
    result.fechaAlt = manana.fecha;
    result.etiquetaAlt = "DOF mañana (determinado hoy)";
  }

  return result;
}

async function fetchExchangeRateAPI() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error("Error al obtener tipo de cambio");

  const data = await res.json();
  const mxn = data.rates?.MXN;
  if (!mxn) throw new Error("No se encontró tasa MXN");

  const fecha = new Date(data.time_last_update_utc).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    tipoCambio: mxn,
    fecha,
    fuente: "ExchangeRate API (referencia de mercado)",
  };
}

export async function GET() {
  try {
    const banxico = await fetchBanxico();
    if (!banxico) {
      console.warn("[tipo-cambio] Banxico no disponible (BANXICO_TOKEN=%s), usando fallback", BANXICO_TOKEN ? "set" : "MISSING");
    }
    const result = banxico || (await fetchExchangeRateAPI());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener tipo de cambio",
      },
      { status: 500 }
    );
  }
}
