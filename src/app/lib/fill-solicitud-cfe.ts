import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  CFE_FIELDS as F,
  CFE_CALIBRATE,
  drawTextAt,
  drawCheckAt,
  drawCalibrationOverlay,
} from "./cfe-pdf-fields";

// ─── Public types (unchanged API) ─────────────────────────────────────────────

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

// ─── PDF fill function (unchanged public API) ─────────────────────────────────

/**
 * Fills the official CFE interconnection request PDF with provided data.
 * Writes text at exact coordinates from cfe-pdf-fields.ts on the original form.
 * Returns a Blob ready to open in a new tab.
 *
 * 100% client-side. Zero API calls. Zero Convex queries.
 */
export async function fillSolicitudCFE(
  pdfBytes: ArrayBuffer,
  data: SolicitudCFEData,
): Promise<Blob> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPage(0);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Shorthand helpers
  const txt = (coord: { x: number; y: number }, text: string, size = 9) =>
    drawTextAt(page, coord, text, font, size);

  const chk = (coord: { x: number; y: number }, checked: boolean) =>
    drawCheckAt(page, coord, checked, fontBold);

  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const bajaTension = data.capacidadKW < 25;
  const emp = data.empresa;

  // ═══ HEADER ═══
  txt(F.fecha, hoy);

  // ═══ I. DATOS DEL SOLICITANTE (cliente) ═══
  txt(F.solicitante.nombre,          data.nombreSolicitante);
  txt(F.solicitante.calle,           data.calle || "");
  txt(F.solicitante.numeroExterior,  data.numeroExterior || "");
  txt(F.solicitante.numeroInterior,  data.numeroInterior || "");
  txt(F.solicitante.codigoPostal,    data.codigoPostal || "");
  txt(F.solicitante.colonia,         data.colonia || "");
  txt(F.solicitante.municipio,       data.municipio || "");
  txt(F.solicitante.estado,          data.estado || "");
  txt(F.solicitante.telefono,        data.telefono || "");
  txt(F.solicitante.email,           data.email || "");

  // ═══ II. DATOS DE CONTACTO (empresa instaladora) ═══
  txt(F.contacto.nombre,          emp.nombre);
  txt(F.contacto.puesto,          emp.puesto || "");
  txt(F.contacto.calle,           emp.calle || "");
  txt(F.contacto.numeroExterior,  emp.numeroExterior || "");
  txt(F.contacto.codigoPostal,    emp.codigoPostal || "");
  txt(F.contacto.colonia,         emp.colonia || "");
  txt(F.contacto.municipio,       emp.municipio || "");
  txt(F.contacto.estado,          emp.estado || "");
  txt(F.contacto.telefono,        emp.telefono || "");
  txt(F.contacto.email,           emp.email || "");

  // ═══ III. MODALIDAD ═══
  chk(F.solicitud.modalidadBajaTension,  bajaTension);
  chk(F.solicitud.modalidadMediaTension, !bajaTension);

  // ═══ IV. UTILIZACIÓN ═══
  chk(F.usoEnergia.consumoCentrosCarga, true);

  // ═══ V. DATOS DEL SERVICIO ═══
  txt(F.servicio.rpu, data.rpu);
  txt(F.servicio.nivelTension,
    bajaTension ? `Baja Tension (${data.tarifa})` : `Media Tension (${data.tarifa})`);

  // ═══ VI. CENTRAL ELÉCTRICA ═══
  txt(F.central.fechaOperacion,       data.fechaOperacion || "");
  txt(F.central.capacidadBrutaKw,     data.capacidadKW.toFixed(2));
  txt(F.central.generacionMensualKwh, data.generacionMensualKWh.toFixed(0));

  // ═══ VII. ESPECIFICACIONES TÉCNICAS ═══
  chk(F.cumplimiento.solar, true);
  txt(F.cumplimiento.numeroUnidades,        String(data.cantidadPaneles), 8);
  txt(F.cumplimiento.combustiblePrincipal,  "N/A (Solar)", 8);
  txt(F.cumplimiento.combustibleSecundario, "N/A", 8);

  // ═══ FIRMA ═══
  txt(F.firma.nombre, data.nombreSolicitante, 8);
  txt(F.firma.fecha,  hoy, 8);

  // ═══ CALIBRATION OVERLAY (dev only) ═══
  if (CFE_CALIBRATE) {
    drawCalibrationOverlay(page, font);
  }

  const filledBytes = await doc.save();
  return new Blob([filledBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}
