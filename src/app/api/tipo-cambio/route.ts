import { NextResponse } from "next/server";

const BANXICO_TOKEN = process.env.BANXICO_TOKEN;

async function fetchBanxico() {
  if (!BANXICO_TOKEN) return null;

  const res = await fetch(
    "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno?mediaType=json",
    { headers: { "Bmx-Token": BANXICO_TOKEN } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const dato = data?.bmx?.series?.[0]?.datos?.[0];
  if (!dato || dato.dato === "N/E") return null;

  // Banxico sometimes uses comma as decimal separator
  const valor = parseFloat(String(dato.dato).replace(",", "."));
  if (isNaN(valor)) return null;

  return {
    tipoCambio: valor,
    fecha: dato.fecha,
    fuente: "Banxico - Tipo de cambio FIX (DOF)",
  };
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
