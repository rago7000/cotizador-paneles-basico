"use client";

import { fillSolicitudCFE, type SolicitudCFEData } from "../lib/fill-solicitud-cfe";

/**
 * Fetches the blank CFE form template, fills it with data using pdf-lib,
 * and opens the result in a new browser tab.
 *
 * This runs 100% client-side — no API calls, no edge requests.
 */
export async function generateSolicitudCFE(data: SolicitudCFEData): Promise<void> {
  // Fetch the blank template from /public
  const res = await fetch("/solicitud-cfe-template.pdf");
  const templateBytes = await res.arrayBuffer();

  // Fill the form
  const blob = await fillSolicitudCFE(templateBytes, data);

  // Open in new tab
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
