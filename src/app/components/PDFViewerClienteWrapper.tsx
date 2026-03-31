"use client";

import { PDFViewer } from "@react-pdf/renderer";
import CotizacionClientePDF from "./CotizacionClientePDF";
import type { CotizacionClientePDFProps } from "./CotizacionClientePDF";

export default function PDFViewerClienteWrapper(props: CotizacionClientePDFProps) {
  return (
    <PDFViewer width="100%" height={600} showToolbar={true}>
      <CotizacionClientePDF {...props} />
    </PDFViewer>
  );
}
