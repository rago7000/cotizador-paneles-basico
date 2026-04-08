import { PDFDocument, StandardFonts } from "pdf-lib";

export interface DatosEmpresa {
  nombre: string;
  calle?: string;
  numeroExterior?: string;
  colonia?: string;
  codigoPostal?: string;
  municipio?: string;
  estado?: string;
  telefono?: string;
  email?: string;
  puesto?: string;
}

export interface SolicitudCFEData {
  // I. Datos del Solicitante (cliente)
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

  // II. Datos de Contacto (empresa instaladora)
  empresa: DatosEmpresa;

  // V. Datos del Servicio
  rpu: string;
  tarifa: string;

  // VI. Central Eléctrica
  capacidadKW: number;
  generacionMensualKWh: number;
  cantidadPaneles: number;
  fechaOperacion?: string;
}

// Default empresa data
export const EMPRESA_DEFAULT: DatosEmpresa = {
  nombre: "Francisco Rafael Castillo Gonzalez",
  calle: "Blvd. Rufino Tamayo",
  numeroExterior: "304-A",
  colonia: "Alpes Nte.",
  codigoPostal: "25270",
  municipio: "Saltillo",
  estado: "Coahuila",
  telefono: "8441744037",
  email: "rafaelgonzalez.haus@gmail.com",
  puesto: "Representante",
};

/**
 * Fills the official CFE interconnection request PDF with provided data.
 * Writes text at exact coordinates on the original form using pdf-lib.
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

  const sz = 9;
  const szSm = 8;

  function txt(x: number, y: number, text: string, size = sz) {
    if (!text) return;
    page.drawText(text, { x, y, size, font });
  }

  function txtBold(x: number, y: number, text: string, size = sz) {
    if (!text) return;
    page.drawText(text, { x, y, size, font: fontBold });
  }

  function check(x: number, y: number) {
    txtBold(x + 2, y + 1, "X", 8);
  }

  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const bajaTension = data.capacidadKW < 25;
  const emp = data.empresa;

  // ═══ HEADER ═══
  txt(195, 722, hoy);

  // ═══ I. DATOS DEL SOLICITANTE (cliente) ═══
  txt(42, 685, data.nombreSolicitante);

  // Calle, Num ext, Num int, CP
  txt(42, 667, data.calle || "");
  txt(260, 667, data.numeroExterior || "");
  txt(390, 667, data.numeroInterior || "");
  txt(540, 667, data.codigoPostal || "");

  // Colonia, Municipio, Estado
  txt(42, 651, data.colonia || "");
  txt(300, 651, data.municipio || "");
  txt(510, 651, data.estado || "");

  // Teléfono, Email
  txt(42, 635, data.telefono || "");
  txt(300, 635, data.email || "");

  // ═══ II. DATOS DE CONTACTO (empresa instaladora) ═══
  txt(42, 596, emp.nombre);
  txt(380, 596, emp.puesto || "");

  // Calle, Num ext, CP
  txt(42, 572, emp.calle || "");
  txt(260, 572, emp.numeroExterior || "");
  txt(540, 572, emp.codigoPostal || "");

  // Colonia, Municipio, Estado
  txt(42, 554, emp.colonia || "");
  txt(300, 554, emp.municipio || "");
  txt(510, 554, emp.estado || "");

  // Teléfono, Email
  txt(42, 536, emp.telefono || "");
  txt(300, 536, emp.email || "");

  // ═══ III. MODALIDAD ═══
  // Baja Tensión checkbox ~x=310, Media Tensión ~x=460
  if (bajaTension) {
    check(305, 498);
  } else {
    check(460, 498);
  }

  // ═══ IV. UTILIZACIÓN ═══
  check(130, 473);

  // ═══ V. DATOS DEL SERVICIO ═══
  txt(42, 438, data.rpu);
  txt(340, 438, bajaTension ? `Baja Tension (${data.tarifa})` : `Media Tension (${data.tarifa})`);

  // ═══ VI. CENTRAL ELÉCTRICA ═══
  txt(42, 400, data.fechaOperacion || "");
  txt(275, 400, data.capacidadKW.toFixed(2));
  txt(505, 400, data.generacionMensualKWh.toFixed(0));

  // ═══ VII. ESPECIFICACIONES TÉCNICAS ═══
  check(70, 324);

  // No de unidades, combustible
  txt(42, 298, String(data.cantidadPaneles), szSm);
  txt(250, 298, "N/A (Solar)", szSm);
  txt(460, 298, "N/A", szSm);

  // ═══ FIRMA ═══
  txt(170, 96, data.nombreSolicitante, szSm);
  txt(170, 78, hoy, szSm);

  const filledBytes = await doc.save();
  return new Blob([filledBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}
