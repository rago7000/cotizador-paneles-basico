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

  // Coordinates from fine grid calibration (10pt grid + 50pt labels)
  // Field values sit ~3pt below the label text baseline

  // ═══ HEADER ═══
  txt(200, 718, hoy);

  // ═══ I. DATOS DEL SOLICITANTE (cliente) ═══
  // "Nombre, Denominación o Razón Social" label at y≈690
  txt(42, 682, data.nombreSolicitante);

  // "Calle" label at y≈672, fields: Calle | Num ext (x≈250) | Num int (x≈395) | CP (x≈530)
  txt(42, 664, data.calle || "");
  txt(255, 664, data.numeroExterior || "");
  txt(400, 664, data.numeroInterior || "");
  txt(535, 664, data.codigoPostal || "");

  // "Colonia" label at y≈658, fields: Colonia | Deleg/Mun (x≈290) | Estado (x≈500)
  txt(42, 650, data.colonia || "");
  txt(295, 650, data.municipio || "");
  txt(510, 650, data.estado || "");

  // "Teléfono" label at y≈642, fields: Tel | Correo (x≈290)
  txt(42, 634, data.telefono || "");
  txt(295, 634, data.email || "");

  // ═══ II. DATOS DE CONTACTO (empresa) ═══
  // "Nombre" label at y≈600, fields: Nombre | Puesto (x≈350)
  txt(42, 592, emp.nombre);
  txt(360, 592, emp.puesto || "");

  // "Calle" label at y≈573, fields: Calle | Num ext (x≈250) | Num int (x≈395) | CP (x≈530)
  txt(42, 565, emp.calle || "");
  txt(255, 565, emp.numeroExterior || "");
  txt(535, 565, emp.codigoPostal || "");

  // "Colonia" label at y≈555, fields: Colonia | Deleg/Mun (x≈290) | Estado (x≈500)
  txt(42, 547, emp.colonia || "");
  txt(295, 547, emp.municipio || "");
  txt(510, 547, emp.estado || "");

  // "Teléfono" label at y≈538, fields: Tel | Correo (x≈290)
  txt(42, 530, emp.telefono || "");
  txt(295, 530, emp.email || "");

  // ═══ III. MODALIDAD ═══
  // Checkboxes at y≈498: Baja Tensión box at x≈290, Media Tensión box at x≈435
  if (bajaTension) {
    check(292, 496);
  } else {
    check(437, 496);
  }

  // ═══ IV. UTILIZACIÓN ═══
  // "Consumo de Centros de Carga" checkbox at x≈125, y≈470
  check(127, 468);

  // ═══ V. DATOS DEL SERVICIO ═══
  // RPU at y≈443, Nivel Tensión at x≈350
  txt(42, 435, data.rpu);
  txt(355, 435, bajaTension ? `Baja Tension (${data.tarifa})` : `Media Tension (${data.tarifa})`);

  // ═══ VI. CENTRAL ELÉCTRICA ═══
  // Labels at y≈405: Fecha | Capacidad (x≈280) | Cap Increm (x≈390) | Generación (x≈500)
  txt(42, 393, data.fechaOperacion || "");
  txt(290, 393, data.capacidadKW.toFixed(2));
  txt(520, 393, data.generacionMensualKWh.toFixed(0));

  // ═══ VII. ESPECIFICACIONES TÉCNICAS ═══
  // Solar checkbox at x≈80, y≈330
  check(82, 328);

  // No de unidades at y≈300, Combustible principal (x≈230), secundario (x≈440)
  txt(42, 293, String(data.cantidadPaneles), szSm);
  txt(235, 293, "N/A (Solar)", szSm);
  txt(445, 293, "N/A", szSm);

  // ═══ FIRMA ═══
  // Nombre at y≈95, Fecha at y≈80
  txt(175, 90, data.nombreSolicitante, szSm);
  txt(175, 80, hoy, szSm);

  const filledBytes = await doc.save();
  return new Blob([filledBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}
