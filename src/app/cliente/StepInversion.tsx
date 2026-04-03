"use client";

import { fmt } from "../components/primitives";
import type { PrecioClienteResult, ROIResult } from "../lib/calc-costos";

interface Props {
  precioCliente: PrecioClienteResult;
  roi: ROIResult | null;
  cantidadPaneles: number;
}

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StepInversion({ precioCliente, roi, cantidadPaneles }: Props) {
  const rows = [
    { concepto: "Paneles solares", monto: precioCliente.clientePanelesMXN },
    { concepto: "Microinversores y monitoreo", monto: precioCliente.clienteInversoresMXN },
    { concepto: "Estructura y montaje", monto: precioCliente.clienteEstructuraMXN },
    {
      concepto: "Instalación y materiales",
      monto: precioCliente.clienteTornilleriaMXN + precioCliente.clienteGeneralesMXN,
    },
  ].filter((r) => r.monto > 0);

  const roiAniosInt = roi ? Math.floor(roi.roiAnios) : 0;
  const roiMesesResto = roi ? Math.round((roi.roiAnios - roiAniosInt) * 12) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100 mb-1">Tu inversión</h2>
        <p className="text-sm text-zinc-400">Desglose completo con IVA incluido</p>
      </div>

      {/* Price table */}
      <div className="rounded-xl border border-zinc-700/50 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between bg-zinc-800 px-5 py-3">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Concepto</span>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Importe</span>
        </div>
        {/* Rows */}
        {rows.map((r, i) => (
          <div key={i} className={`flex justify-between px-5 py-3.5 ${i % 2 === 0 ? "bg-zinc-800/30" : "bg-zinc-800/10"}`}>
            <span className="text-sm text-zinc-300">{r.concepto}</span>
            <span className="text-sm font-semibold text-zinc-200">{fmtMXN(r.monto * 1.16)}</span>
          </div>
        ))}
        {/* Total */}
        <div className="flex justify-between px-5 py-4 bg-amber-500/10 border-t-2 border-amber-500/30">
          <span className="text-lg font-bold text-zinc-100">Total</span>
          <span className="text-lg font-bold text-amber-400">{fmtMXN(precioCliente.clienteTotalMXN)}</span>
        </div>
      </div>

      {/* Unit metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-4 text-center">
          <div className="text-xl font-bold text-zinc-100">{fmtMXN(precioCliente.clientePorPanel)}</div>
          <div className="text-xs text-zinc-500 mt-1">por panel</div>
        </div>
        <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-4 text-center">
          <div className="text-xl font-bold text-zinc-100">{fmtMXN(precioCliente.clientePorWatt)}</div>
          <div className="text-xs text-zinc-500 mt-1">por Watt</div>
        </div>
      </div>

      {/* ROI */}
      {roi && roi.ahorroMensualMXN > 0 && (
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-emerald-400 text-center">Retorno de inversión</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-zinc-100">
                {roiAniosInt}<span className="text-base font-normal text-zinc-400">a</span> {roiMesesResto}<span className="text-base font-normal text-zinc-400">m</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">Recuperación</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{fmtMXN(roi.ahorroMensualMXN)}</div>
              <div className="text-xs text-zinc-500 mt-1">Ahorro / mes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{fmtMXN(roi.ahorroAnualMXN)}</div>
              <div className="text-xs text-zinc-500 mt-1">Ahorro / año</div>
            </div>
          </div>
          <p className="text-xs text-zinc-600 text-center">
            Basado en tu costo actual de electricidad: {fmtMXN(roi.costoCFEporKwh)}/kWh
          </p>
        </div>
      )}
    </div>
  );
}
