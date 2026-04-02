"use client";

import { PDFViewer } from "@react-pdf/renderer";
import CotizacionPDF from "./CotizacionPDF";
import type { LineItem, TipoCambioData } from "../lib/types";

interface Props {
  nombreCotizacion: string;
  cantidad: number;
  potencia: number;
  precioPorWatt: number;
  fletePaneles: number;
  garantiaPaneles: number;
  precioMicroinversor: number;
  precioCable: number;
  precioECU: number;
  incluyeECU: boolean;
  precioHerramienta: number;
  incluyeHerramienta: boolean;
  precioEndCap: number;
  incluyeEndCap: boolean;
  fleteMicros: number;
  aluminio: LineItem[];
  fleteAluminio: number;
  tornilleria: LineItem[];
  generales: LineItem[];
  tc: TipoCambioData;
}

export default function PDFViewerWrapper(props: Props) {
  return (
    <PDFViewer width="100%" height={600} showToolbar={true}>
      <CotizacionPDF {...props} />
    </PDFViewer>
  );
}
