import { pdf } from "@react-pdf/renderer";

/**
 * Renders a react-pdf Document element to a blob and opens it in a new browser tab.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function openPDFInNewWindow(document: any) {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  // Clean up after a delay (browser needs time to load)
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
