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
  // Fecha (y≈727 label → value at y≈720)
  txt(195, 720, hoy);

  // ═══ I. DATOS DEL SOLICITANTE (cliente) ═══
  // Nombre (label y≈700 → value y≈690)
  txt(42, 688, data.nombreSolicitante);

  // Calle (label y≈675 → value y≈663)
  txt(42, 662, data.calle || "");
  txt(250, 662, data.numeroExterior || "");
  txt(400, 662, data.numeroInterior || "");
  txt(530, 662, data.codigoPostal || "");

  // Colonia, Municipio, Estado (label y≈655 → value y≈647)
  txt(42, 646, data.colonia || "");
  txt(290, 646, data.municipio || "");
  txt(500, 646, data.estado || "");

  // Teléfono, Email (label y≈638 → value y≈630)
  txt(42, 630, data.telefono || "");
  txt(290, 630, data.email || "");

  // ═══ II. DATOS DE CONTACTO (empresa instaladora) ═══
  // Nombre (y≈597 → value y≈593)
  txt(42, 593, emp.nombre);
  txt(370, 593, emp.puesto || "");

  // Calle (y≈572 → value y≈567)
  txt(42, 567, emp.calle || "");
  txt(250, 567, emp.numeroExterior || "");
  // Num interior: skip
  txt(530, 567, emp.codigoPostal || "");

  // Colonia, Municipio, Estado (y≈553 → value y≈548)
  txt(42, 548, emp.colonia || "");
  txt(290, 548, emp.municipio || "");
  txt(500, 548, emp.estado || "");

  // Teléfono, Email (y≈535 → value y≈530)
  txt(42, 530, emp.telefono || "");
  txt(290, 530, emp.email || "");

  // ═══ III. MODALIDAD ═══
  // Baja Tensión (x≈340, y≈498) / Media Tensión (x≈490, y≈498)
  if (bajaTension) {
    check(340, 496);
  } else {
    check(490, 496);
  }

  // ═══ IV. UTILIZACIÓN ═══
  // "Consumo de Centros de Carga" checkbox (x≈140, y≈472)
  check(140, 470);

  // ═══ V. DATOS DEL SERVICIO ═══
  // RPU (y≈440 → value y≈434)
  txt(42, 434, data.rpu);
  // Nivel de tensión (x≈330)
  txt(335, 434, bajaTension ? `Baja Tension (${data.tarifa})` : `Media Tension (${data.tarifa})`);

  // ═══ VI. CENTRAL ELÉCTRICA ═══
  // Fecha operación (y≈406 → value y≈398)
  txt(42, 397, data.fechaOperacion || "");
  // Capacidad Bruta Instalada (x≈260)
  txt(268, 397, data.capacidadKW.toFixed(2));
  // Generación Promedio Mensual (x≈490)
  txt(498, 397, data.generacionMensualKWh.toFixed(0));

  // ═══ VII. ESPECIFICACIONES TÉCNICAS ═══
  // Solar checkbox (x≈68, y≈325)
  check(68, 321);

  // No de unidades (y≈300 → value y≈296)
  txt(42, 296, String(data.cantidadPaneles), szSm);
  txt(245, 296, "N/A (Solar)", szSm);
  txt(455, 296, "N/A", szSm);

  // ═══ FIRMA ═══
  // Nombre solicitante (y≈97)
  txt(165, 95, data.nombreSolicitante, szSm);
  // Fecha (y≈78)
  txt(165, 76, hoy, szSm);

  const filledBytes = await doc.save();
  return new Blob([filledBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}
