"use client";

import { useCallback } from "react";
import { fmt } from "../components/primitives";
import type { PrecioClienteResult, ROIResult } from "../lib/calc-costos";
import type { ReciboCFEData } from "../lib/cotizacion-state";

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  nombreCliente: string;
  cantidadPaneles: number;
  panelW: number;
  kWpSistema: number;
  generacionMensualKwh: number;
  precioCliente: PrecioClienteResult;
  roi: ROIResult | null;
  reciboCFE: ReciboCFEData;
  coberturaPct: number;
}

export default function StepPropuesta({
  nombreCliente, cantidadPaneles, panelW,
  kWpSistema, generacionMensualKwh,
  precioCliente, roi, reciboCFE, coberturaPct,
}: Props) {

  const handlePDF = useCallback(async () => {
    const [{ pdf }, { default: CotizacionClientePDF }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("../components/CotizacionClientePDF"),
    ]);
    const doc = CotizacionClientePDF({
      nombreCotizacion: "",
      clienteNombre: nombreCliente,
      cantidadPaneles,
      potenciaW: panelW,
      kWp: kWpSistema,
      generacionMensualKwh,
      partidas: {
        paneles: precioCliente.clientePanelesMXN * 1.16,
        inversores: precioCliente.clienteInversoresMXN * 1.16,
        estructura: precioCliente.clienteEstructuraMXN * 1.16,
        tornilleria: (precioCliente.clienteTornilleriaMXN + precioCliente.clienteGeneralesMXN) * 1.16,
        generales: 0,
        montoFijo: 0,
      },
      subtotal: precioCliente.clienteSubtotalMXN,
      iva: precioCliente.clienteIvaMXN,
      total: precioCliente.clienteTotalMXN,
      porPanel: precioCliente.clientePorPanel,
      porWatt: precioCliente.clientePorWatt,
      vigenciaDias: 15,
      notas: "",
    });
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, [nombreCliente, cantidadPaneles, panelW, kWpSistema, generacionMensualKwh, precioCliente]);

  const roiAniosInt = roi ? Math.floor(roi.roiAnios) : 0;
  const roiMesesResto = roi ? Math.round((roi.roiAnios - roiAniosInt) * 12) : 0;

  const handleWhatsApp = () => {
    const lines = [
      `☀️ Cotización Solar — ${nombreCliente}`,
      ``,
      `📊 Sistema: ${cantidadPaneles} paneles de ${panelW}W (${kWpSistema.toFixed(1)} kWp)`,
      `⚡ Genera: ${Math.round(generacionMensualKwh).toLocaleString("es-MX")} kWh/mes (${coberturaPct}% de tu consumo)`,
      `💰 Inversión: ${fmtMXN(precioCliente.clienteTotalMXN)} MXN (IVA incluido)`,
    ];
    if (roi && roi.ahorroMensualMXN > 0) {
      lines.push(`💚 Ahorro mensual: ${fmtMXN(roi.ahorroMensualMXN)}`);
      lines.push(`🔄 Recuperación: ${roiAniosInt} años ${roiMesesResto} meses`);
    }
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100 mb-1">Tu propuesta</h2>
        <p className="text-sm text-zinc-400">Resumen de tu sistema solar personalizado</p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-6 space-y-4">
        <div className="text-center">
          <div className="text-sm text-zinc-400 mb-1">{nombreCliente}</div>
          <div className="text-3xl font-bold text-amber-400">{fmtMXN(precioCliente.clienteTotalMXN)}</div>
          <div className="text-xs text-zinc-500 mt-1">IVA incluido</div>
        </div>

        <div className="border-t border-zinc-700/50 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-zinc-100">{cantidadPaneles}</div>
            <div className="text-xs text-zinc-500">Paneles</div>
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-100">{kWpSistema.toFixed(1)}</div>
            <div className="text-xs text-zinc-500">kWp</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400">{coberturaPct}%</div>
            <div className="text-xs text-zinc-500">Cobertura</div>
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-100">{Math.round(generacionMensualKwh).toLocaleString("es-MX")}</div>
            <div className="text-xs text-zinc-500">kWh/mes</div>
          </div>
        </div>

        {roi && roi.ahorroMensualMXN > 0 && (
          <div className="border-t border-zinc-700/50 pt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-400">{fmtMXN(roi.ahorroMensualMXN)}</div>
              <div className="text-xs text-zinc-500">Ahorro/mes</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">{fmtMXN(roi.ahorroAnualMXN)}</div>
              <div className="text-xs text-zinc-500">Ahorro/año</div>
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-100">{roiAniosInt}a {roiMesesResto}m</div>
              <div className="text-xs text-zinc-500">Recuperación</div>
            </div>
          </div>
        )}
      </div>

      {/* Conditions */}
      <div className="rounded-xl bg-zinc-800/20 border border-zinc-700/30 p-4">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Incluye</h4>
        <ul className="space-y-1.5 text-xs text-zinc-500">
          <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Suministro e instalación completa</li>
          <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Garantía de paneles: 25 años</li>
          <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Garantía de microinversores: 25 años</li>
          <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Garantía de instalación: 5 años</li>
          <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Monitoreo en tiempo real</li>
          <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Trámite de interconexión con CFE</li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handlePDF}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold py-3.5 px-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Descargar PDF
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.694-1.228A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.239 0-4.332-.727-6.023-1.96l-.424-.313-2.787.73.748-2.724-.343-.547A9.963 9.963 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
          </svg>
          Compartir por WhatsApp
        </button>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Cotización válida por 15 días a partir de hoy.
      </p>
    </div>
  );
}
