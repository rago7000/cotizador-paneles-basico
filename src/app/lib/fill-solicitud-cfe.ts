import { PDFDocument, StandardFonts } from "pdf-lib";

export interface SolicitudCFEData {
  // I. Datos del Solicitante
  nombreSolicitante: string;
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  codigoPostal?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  telefono?: string;
  email?: string;

  // V. Datos del Servicio
  rpu: string;
  tarifa: string;

  // VI. Central Eléctrica
  capacidadKW: number;
  generacionMensualKWh: number;
  cantidadPaneles: number;
  fechaOperacion?: string;
}

/**
 * Fills the official CFE interconnection request PDF with provided data.
 * Uses pdf-lib to write text at exact coordinates on the original form.
 * Returns a Blob ready to open in a new tab.
 */
export async function fillSolicitudCFE(
  pdfBytes: ArrayBuffer,
  data: SolicitudCFEData,
): Promise<Blob> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPage(0);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const sz = 9; // font size for field values
  const szSm = 8;

  // Helper: draw text at (x, y) — y is from BOTTOM of page (pdf-lib convention)
  function txt(x: number, y: number, text: string, size = sz) {
    if (!text) return;
    page.drawText(text, { x, y, size, font });
  }

  function txtBold(x: number, y: number, text: string, size = sz) {
    if (!text) return;
    page.drawText(text, { x, y, size, font: fontBold });
  }

  // Check mark for checkboxes
  function check(x: number, y: number) {
    txtBold(x + 2, y + 1, "X", 8);
  }

  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const bajaTension = data.capacidadKW < 25;

  // ═══ HEADER ═══
  // Fecha: ~y=727, after "Fecha" label which ends ~x=190
  txt(195, 727, hoy);

  // ═══ I. DATOS DEL SOLICITANTE ═══
  // Nombre (y≈693)
  txt(42, 693, data.nombreSolicitante);

  // Domicilio line (y≈680) — not filled, use Calle line instead

  // Calle (y≈668), Número exterior (x≈248, y≈668), Número Interior (x≈380, y≈668), Código Postal (x≈510, y≈668)
  txt(42, 668, data.calle || "");
  txt(248, 668, data.numeroExterior || "");
  txt(385, 668, data.numeroInterior || "");
  txt(515, 668, data.codigoPostal || "");

  // Colonia (y≈652), Delegación/Municipio (x≈270, y≈652), Estado (x≈480, y≈652)
  txt(42, 652, data.colonia || "");
  txt(275, 652, data.municipio || "");
  txt(485, 652, data.estado || "");

  // Teléfono (y≈636), Correo (x≈270, y≈636)
  txt(42, 636, data.telefono || "");
  txt(275, 636, data.email || "");

  // ═══ II. DATOS DE CONTACTO (same data) ═══
  // Nombre (y≈600)
  txt(42, 600, data.nombreSolicitante);

  // Calle (y≈575), Num ext (x≈248), Num int (x≈380), CP (x≈510)
  txt(42, 575, data.calle || "");
  txt(248, 575, data.numeroExterior || "");
  txt(385, 575, data.numeroInterior || "");
  txt(515, 575, data.codigoPostal || "");

  // Colonia (y≈555), Municipio (x≈270), Estado (x≈480)
  txt(42, 555, data.colonia || "");
  txt(275, 555, data.municipio || "");
  txt(485, 555, data.estado || "");

  // Teléfono (y≈537), Correo (x≈270)
  txt(42, 537, data.telefono || "");
  txt(275, 537, data.email || "");

  // ═══ III. MODALIDAD ═══
  // Baja Tensión checkbox: ~x=310, y≈497
  // Media Tensión checkbox: ~x=470, y≈497
  if (bajaTension) {
    check(310, 497);
  } else {
    check(470, 497);
  }

  // ═══ IV. UTILIZACIÓN ═══
  // "Consumo de Centros de Carga" checkbox: ~x=128, y≈472
  check(128, 472);

  // ═══ V. DATOS DEL SERVICIO ═══
  // RPU (y≈438)
  txt(42, 438, data.rpu);
  // Nivel de tensión (x≈320, y≈438)
  txt(325, 438, bajaTension ? `Baja Tension (${data.tarifa})` : `Media Tension (${data.tarifa})`);

  // ═══ VI. CENTRAL ELÉCTRICA ═══
  // Fecha operación (y≈405)
  txt(42, 405, data.fechaOperacion || "");
  // Capacidad Bruta Instalada (x≈248, y≈405)
  txt(260, 405, data.capacidadKW.toFixed(2));
  // Generación Promedio Mensual (x≈470, y≈405)
  txt(475, 405, data.generacionMensualKWh.toFixed(0));

  // ═══ VII. ESPECIFICACIONES TÉCNICAS ═══
  // Solar checkbox: ~x=68, y≈325
  check(68, 325);

  // No de unidades de generación (y≈300)
  txt(42, 300, String(data.cantidadPaneles), szSm);
  // Combustible principal (x≈230, y≈300)
  txt(235, 300, "N/A (Solar)", szSm);
  // Combustible secundario (x≈430, y≈300)
  txt(435, 300, "N/A", szSm);

  // ═══ FIRMA ═══
  // Nombre (y≈97)
  txt(165, 97, data.nombreSolicitante, szSm);
  // Fecha (y≈78)
  txt(165, 78, hoy, szSm);

  const filledBytes = await doc.save();
  return new Blob([filledBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}
