"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#666", textAlign: "center", marginBottom: 4 },
  clienteBox: { padding: 10, backgroundColor: "#f8f8f8", borderWidth: 1, borderColor: "#ddd", marginBottom: 16 },
  clienteLabel: { fontSize: 8, color: "#888", marginBottom: 2 },
  clienteNombre: { fontSize: 13, fontWeight: "bold" },
  sistemaBox: { padding: 10, backgroundColor: "#f0f7f0", borderWidth: 1, borderColor: "#c0d8c0", marginBottom: 16 },
  sistemaTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6 },
  sistemaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  sistemaLabel: { fontSize: 9, color: "#555" },
  sistemaValue: { fontSize: 9, fontWeight: "bold" },
  section: { marginBottom: 2 },
  tableHeader: { flexDirection: "row", backgroundColor: "#333", paddingVertical: 5, paddingHorizontal: 8 },
  tableHeaderText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#eee", backgroundColor: "#fafafa" },
  colConcepto: { flex: 1 },
  colMonto: { width: 100, textAlign: "right" },
  totalesBox: { marginTop: 8 },
  totalesRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 8 },
  totalesLabel: { fontSize: 10, color: "#555" },
  totalesValue: { fontSize: 10, fontWeight: "bold" },
  totalFinal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: "#333", marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: "bold" },
  totalFinalValue: { fontSize: 16, fontWeight: "bold" },
  metricasBox: { flexDirection: "row", marginTop: 16, gap: 0 },
  metrica: { flex: 1, padding: 10, backgroundColor: "#f0f0f0", borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  metricaValor: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  metricaLabel: { fontSize: 8, color: "#666" },
  footer: { marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#ddd" },
  footerTitle: { fontSize: 9, fontWeight: "bold", marginBottom: 6 },
  footerText: { fontSize: 8, color: "#555", lineHeight: 1.5 },
  vigencia: { marginTop: 12, fontSize: 8, color: "#999", textAlign: "center" },
});

const fmt = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface CotizacionClientePDFProps {
  nombreCotizacion: string;
  clienteNombre: string;
  cantidadPaneles: number;
  potenciaW: number;
  kWp: number;
  generacionMensualKwh: number;
  partidas: {
    paneles: number;
    inversores: number;
    estructura: number;
    tornilleria: number;
    generales: number;
    montoFijo: number;
  };
  subtotal: number;
  iva: number;
  total: number;
  porPanel: number;
  porWatt: number;
  vigenciaDias: number;
  notas: string;
}

export default function CotizacionClientePDF(props: CotizacionClientePDFProps) {
  const {
    nombreCotizacion, clienteNombre,
    cantidadPaneles, potenciaW, kWp, generacionMensualKwh,
    partidas, subtotal, iva, total,
    porPanel, porWatt, vigenciaDias, notas,
  } = props;

  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const generacionAnualKwh = generacionMensualKwh * 12;

  const rows = [
    { concepto: "Paneles solares", monto: partidas.paneles },
    { concepto: "Sistema de microinversores", monto: partidas.inversores },
    { concepto: "Estructura de montaje", monto: partidas.estructura },
    { concepto: "Tornilleria y accesorios", monto: partidas.tornilleria },
    { concepto: "Gastos generales e instalacion", monto: partidas.generales },
  ].filter((r) => r.monto > 0);

  if (partidas.montoFijo > 0) {
    rows.push({ concepto: "Servicios adicionales", monto: partidas.montoFijo });
  }

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Cotizacion — Sistema Solar Fotovoltaico</Text>
          {nombreCotizacion && <Text style={s.subtitle}>{nombreCotizacion}</Text>}
          <Text style={s.subtitle}>{fecha}</Text>
        </View>

        {/* Cliente */}
        {clienteNombre && (
          <View style={s.clienteBox}>
            <Text style={s.clienteLabel}>CLIENTE</Text>
            <Text style={s.clienteNombre}>{clienteNombre}</Text>
          </View>
        )}

        {/* Descripcion del sistema */}
        <View style={s.sistemaBox}>
          <Text style={s.sistemaTitle}>Descripcion del sistema</Text>
          <View style={s.sistemaRow}>
            <Text style={s.sistemaLabel}>Paneles solares</Text>
            <Text style={s.sistemaValue}>{cantidadPaneles} unidades de {potenciaW}W</Text>
          </View>
          <View style={s.sistemaRow}>
            <Text style={s.sistemaLabel}>Capacidad del sistema</Text>
            <Text style={s.sistemaValue}>{kWp.toFixed(2)} kWp</Text>
          </View>
          <View style={s.sistemaRow}>
            <Text style={s.sistemaLabel}>Generacion estimada mensual</Text>
            <Text style={s.sistemaValue}>{Math.round(generacionMensualKwh).toLocaleString("es-MX")} kWh</Text>
          </View>
          <View style={s.sistemaRow}>
            <Text style={s.sistemaLabel}>Generacion estimada anual</Text>
            <Text style={s.sistemaValue}>{Math.round(generacionAnualKwh).toLocaleString("es-MX")} kWh</Text>
          </View>
        </View>

        {/* Tabla de precios */}
        <View style={s.section}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colConcepto]}>Concepto</Text>
            <Text style={[s.tableHeaderText, s.colMonto]}>Importe</Text>
          </View>
          {rows.map((r, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.colConcepto}>{r.concepto}</Text>
              <Text style={[s.colMonto, { fontWeight: "bold" }]}>{fmt(r.monto)}</Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={s.totalesBox}>
          <View style={s.totalesRow}>
            <Text style={s.totalesLabel}>Subtotal</Text>
            <Text style={s.totalesValue}>{fmt(subtotal)}</Text>
          </View>
          <View style={s.totalesRow}>
            <Text style={s.totalesLabel}>IVA (16%)</Text>
            <Text style={s.totalesValue}>{fmt(iva)}</Text>
          </View>
          <View style={s.totalFinal}>
            <Text style={s.totalFinalLabel}>Total</Text>
            <Text style={s.totalFinalValue}>{fmt(total)} MXN</Text>
          </View>
        </View>

        {/* Metricas */}
        <View style={s.metricasBox}>
          <View style={[s.metrica, { marginRight: 4 }]}>
            <Text style={s.metricaValor}>{fmt(porPanel)}</Text>
            <Text style={s.metricaLabel}>Precio por panel</Text>
          </View>
          <View style={[s.metrica, { marginLeft: 4 }]}>
            <Text style={s.metricaValor}>{fmt(porWatt)}</Text>
            <Text style={s.metricaLabel}>Precio por Watt</Text>
          </View>
        </View>

        {/* Notas */}
        {notas && (
          <View style={s.footer}>
            <Text style={s.footerTitle}>Observaciones</Text>
            <Text style={s.footerText}>{notas}</Text>
          </View>
        )}

        {/* Condiciones */}
        <View style={s.footer}>
          <Text style={s.footerTitle}>Condiciones</Text>
          <Text style={s.footerText}>- Precios en pesos mexicanos (MXN), IVA incluido</Text>
          <Text style={s.footerText}>- Incluye suministro e instalacion del sistema completo</Text>
          <Text style={s.footerText}>- Garantia de paneles: 25 anios de produccion</Text>
          <Text style={s.footerText}>- Garantia de microinversores: 25 anios</Text>
          <Text style={s.footerText}>- Garantia de instalacion: 5 anios</Text>
          <Text style={s.footerText}>- Tiempo estimado de instalacion: 1-3 dias habiles</Text>
        </View>

        <Text style={s.vigencia}>
          Esta cotizacion tiene una vigencia de {vigenciaDias} dias a partir de la fecha de emision.
        </Text>
      </Page>
    </Document>
  );
}
