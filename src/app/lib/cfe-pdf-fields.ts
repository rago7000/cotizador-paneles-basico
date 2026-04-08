/**
 * Centralized coordinate map for the official CFE interconnection PDF form.
 * Template: "Solicitud para la interconexión - Abril 2026.pdf" (Letter, 612×792pt)
 *
 * Coordinates are PDF points from bottom-left origin (pdf-lib convention).
 * Calibrated with 3 rounds of visual crosshair overlays (v1 red, v2 green, v3 blue).
 *
 * To recalibrate: set CFE_CALIBRATE = true, generate a PDF, and compare crosshairs
 * against the original form. Adjust coordinates here, regenerate, repeat.
 */

import type { PDFPage, PDFFont } from "pdf-lib";
import { rgb } from "pdf-lib";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldCoord {
  x: number;
  y: number;
}

export interface CheckboxCoord extends FieldCoord {}

// ─── Calibration flag ─────────────────────────────────────────────────────────

/** Set to true to draw red crosshairs + field names on the generated PDF. */
export const CFE_CALIBRATE = false;

// ─── Field coordinate map ─────────────────────────────────────────────────────

export const CFE_FIELDS = {
  fecha: { x: 200, y: 723 },

  // I. Datos del Solicitante (cliente)
  solicitante: {
    nombre:          { x: 42,  y: 691 },
    calle:           { x: 42,  y: 670 },
    numeroExterior:  { x: 255, y: 670 },
    numeroInterior:  { x: 385, y: 670 },
    codigoPostal:    { x: 515, y: 670 },
    colonia:         { x: 42,  y: 655 },
    municipio:       { x: 285, y: 655 },
    estado:          { x: 480, y: 655 },
    telefono:        { x: 42,  y: 641 },
    email:           { x: 285, y: 641 },
  },

  // II. Datos de Contacto (empresa instaladora)
  contacto: {
    nombre:          { x: 42,  y: 602 },
    puesto:          { x: 350, y: 602 },
    calle:           { x: 42,  y: 573 },
    numeroExterior:  { x: 255, y: 573 },
    numeroInterior:  { x: 385, y: 573 },
    codigoPostal:    { x: 515, y: 573 },
    colonia:         { x: 42,  y: 557 },
    municipio:       { x: 285, y: 557 },
    estado:          { x: 480, y: 557 },
    telefono:        { x: 42,  y: 541 },
    email:           { x: 285, y: 541 },
  },

  // III. Datos de la Solicitud
  solicitud: {
    modalidadBajaTension:  { x: 300, y: 500 },
    modalidadMediaTension: { x: 452, y: 500 },
  },

  // IV. Utilización de la Energía Eléctrica Producida
  usoEnergia: {
    consumoCentrosCarga: { x: 140, y: 473 },
    ventaExcedentes:     { x: 260, y: 473 },
    ventaTotal:          { x: 440, y: 473 },
  },

  // V. Datos del Servicio Suministro Actual
  servicio: {
    rpu:          { x: 42,  y: 441 },
    nivelTension: { x: 350, y: 441 },
  },

  // VI. Central Eléctrica
  central: {
    fechaOperacion:       { x: 42,  y: 398 },
    capacidadBrutaKw:     { x: 270, y: 398 },
    capacidadIncrementarKw: { x: 385, y: 398 },
    generacionMensualKwh: { x: 515, y: 398 },
  },

  // VII. Manifestación de Cumplimiento
  cumplimiento: {
    solar:                 { x: 84,  y: 332 },
    eolico:                { x: 84,  y: 318 },
    biomasa:               { x: 252, y: 332 },
    cogeneracion:          { x: 252, y: 318 },
    otro:                  { x: 432, y: 332 },
    especificar:           { x: 432, y: 318 },
    numeroUnidades:        { x: 42,  y: 300 },
    combustiblePrincipal:  { x: 235, y: 300 },
    combustibleSecundario: { x: 445, y: 300 },
  },

  // Firma de Conformidad
  firma: {
    nombre: { x: 180, y: 92 },
    cargo:  { x: 180, y: 82 },
    fecha:  { x: 180, y: 72 },
  },
} as const;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

export function drawTextAt(
  page: PDFPage,
  coord: FieldCoord,
  text: string,
  font: PDFFont,
  size = 9,
) {
  if (!text) return;
  page.drawText(text, { x: coord.x, y: coord.y, size, font });
}

export function drawCheckAt(
  page: PDFPage,
  coord: CheckboxCoord,
  checked: boolean,
  font: PDFFont,
) {
  if (!checked) return;
  page.drawText("X", { x: coord.x + 2, y: coord.y + 1, size: 9, font });
}

// ─── Calibration overlay ──────────────────────────────────────────────────────

/**
 * Draws red crosshairs and field names at every coordinate in CFE_FIELDS.
 * Only call when CFE_CALIBRATE === true.
 */
export function drawCalibrationOverlay(page: PDFPage, font: PDFFont) {
  const red = rgb(1, 0, 0);

  function mark(name: string, coord: FieldCoord) {
    page.drawLine({ start: { x: coord.x - 5, y: coord.y }, end: { x: coord.x + 5, y: coord.y }, thickness: 0.5, color: red });
    page.drawLine({ start: { x: coord.x, y: coord.y - 5 }, end: { x: coord.x, y: coord.y + 5 }, thickness: 0.5, color: red });
    page.drawText(name, { x: coord.x + 6, y: coord.y - 1, size: 4, font, color: red });
  }

  function walkSection(prefix: string, section: Record<string, FieldCoord>) {
    for (const [key, coord] of Object.entries(section)) {
      mark(`${prefix}.${key}`, coord);
    }
  }

  mark("fecha", CFE_FIELDS.fecha);
  walkSection("I", CFE_FIELDS.solicitante);
  walkSection("II", CFE_FIELDS.contacto);
  walkSection("III", CFE_FIELDS.solicitud);
  walkSection("IV", CFE_FIELDS.usoEnergia);
  walkSection("V", CFE_FIELDS.servicio);
  walkSection("VI", CFE_FIELDS.central);
  walkSection("VII", CFE_FIELDS.cumplimiento);
  walkSection("firma", CFE_FIELDS.firma);
}
