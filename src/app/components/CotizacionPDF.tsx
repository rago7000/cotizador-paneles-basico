"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { LineItem, TipoCambioData } from "../lib/types";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 9, color: "#666", textAlign: "center", marginBottom: 20 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", backgroundColor: "#f0f0f0", padding: 6, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, paddingHorizontal: 6 },
  rowBorder: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: "#ccc" },
  label: { flex: 1 },
  value: { width: 100, textAlign: "right", fontWeight: "bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 6, borderTopWidth: 2, borderTopColor: "#333", marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: "bold" },
  totalValue: { fontSize: 14, fontWeight: "bold", width: 120, textAlign: "right" },
  partidaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 6 },
  partidaLabel: { fontSize: 11, fontWeight: "bold" },
  partidaValue: { fontSize: 11, fontWeight: "bold", width: 100, textAlign: "right" },
  detailRow: { flexDirection: "row", paddingVertical: 1, paddingHorizontal: 12 },
  detailName: { flex: 1, color: "#555" },
  detailQty: { width: 40, textAlign: "center", color: "#555" },
  detailPrice: { width: 70, textAlign: "right", color: "#555" },
  detailSubt: { width: 80, textAlign: "right", color: "#333" },
  tcBox: { flexDirection: "row", justifyContent: "space-between", padding: 6, backgroundColor: "#f8f8f8", marginBottom: 16, borderWidth: 1, borderColor: "#ddd" },
  tcLabel: { fontSize: 9, color: "#666" },
  tcValue: { fontSize: 10, fontWeight: "bold" },
  nombreCot: { fontSize: 12, fontWeight: "bold", textAlign: "center", marginBottom: 2 },
});

const fmt = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function sumItems(items: LineItem[]) {
  return items.reduce((sum, item) => {
    return sum + (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0);
  }, 0);
}

function DetailLines({ items, moneda }: { items: LineItem[]; moneda: string }) {
  return (
    <>
      {items.map((item, i) => {
        const qty = Number(item.cantidad) || 0;
        const price = Number(item.precioUnitario) || 0;
        const sub = qty * price;
        if (qty === 0) return null;
        return (
          <View key={i} style={s.detailRow}>
            <Text style={s.detailName}>{item.nombre}</Text>
            <Text style={s.detailQty}>{qty}</Text>
            <Text style={s.detailPrice}>{fmt(price)}</Text>
            <Text style={s.detailSubt}>{fmt(sub)} {moneda}</Text>
          </View>
        );
      })}
    </>
  );
}

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

export default function CotizacionPDF(props: Props) {
  const {
    nombreCotizacion, cantidad, potencia, precioPorWatt,
    fletePaneles, garantiaPaneles,
    precioMicroinversor, precioCable, precioECU, incluyeECU,
    precioHerramienta, incluyeHerramienta,
    precioEndCap, incluyeEndCap, fleteMicros,
    aluminio, fleteAluminio, tornilleria, generales, tc,
  } = props;

  const tcVal = tc.tipoCambio;
  const panelesPorMicro = 4;
  const cantidadMicros = cantidad > 0 ? Math.ceil(cantidad / panelesPorMicro) : 0;

  // Partida 1: Paneles
  const costoPanel = potencia * precioPorWatt;
  const totalPanelesUSD = costoPanel * cantidad + fletePaneles + garantiaPaneles;
  const partidaPanelesMXN = totalPanelesUSD * tcVal;

  // Partida 2: Inversores
  const costoMicrosUSD = cantidadMicros * precioMicroinversor;
  const costoCablesUSD = cantidadMicros * precioCable;
  const costoECUUSD = incluyeECU ? precioECU : 0;
  const costoHerramientaUSD = incluyeHerramienta ? precioHerramienta : 0;
  const costoEndCapUSD = incluyeEndCap ? precioEndCap * cantidadMicros : 0;
  const totalInversoresUSD = costoMicrosUSD + costoCablesUSD + costoECUUSD + costoHerramientaUSD + costoEndCapUSD + fleteMicros;
  const partidaInversoresMXN = totalInversoresUSD * tcVal;

  // Partida 3: Estructura
  const costoAluminioMXN = sumItems(aluminio);
  const fleteAluminioSinIVA = fleteAluminio / 1.16;
  const partidaEstructuraMXN = costoAluminioMXN + fleteAluminioSinIVA;

  // Partida 4: Tornilleria
  const partidaTornilleriaMXN = sumItems(tornilleria);

  // Partida 5: Generales
  const partidaGeneralesMXN = sumItems(generales);

  // Totales
  const subtotalMXN = partidaPanelesMXN + partidaInversoresMXN + partidaEstructuraMXN + partidaTornilleriaMXN + partidaGeneralesMXN;
  const ivaMXN = subtotalMXN * 0.16;
  const totalMXN = subtotalMXN + ivaMXN;

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <Text style={s.title}>Cotización de Paneles Solares</Text>
        {nombreCotizacion && <Text style={s.nombreCot}>{nombreCotizacion}</Text>}
        <Text style={s.subtitle}>Fecha: {new Date().toLocaleDateString("es-MX")}</Text>

        {/* Tipo de cambio */}
        <View style={s.tcBox}>
          <Text style={s.tcLabel}>Tipo de cambio FIX (DOF): {fmt(tcVal)} MXN/USD</Text>
          <Text style={s.tcLabel}>{tc.fuente} — {tc.fecha}</Text>
        </View>

        {/* PANELES */}
        <View style={s.section}>
          <View style={s.sectionTitle}><Text>PANELES</Text></View>
          {cantidad > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>{cantidad} paneles x {potencia}W x {fmt(precioPorWatt)}/W</Text>
              <Text style={s.detailSubt}>{fmt(costoPanel * cantidad)} USD</Text>
            </View>
          )}
          {fletePaneles > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>Servicio de logistica (Flete)</Text>
              <Text style={s.detailSubt}>{fmt(fletePaneles)} USD</Text>
            </View>
          )}
          {garantiaPaneles > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>Garantia contra danos de mercancia</Text>
              <Text style={s.detailSubt}>{fmt(garantiaPaneles)} USD</Text>
            </View>
          )}
          <View style={s.partidaRow}>
            <Text style={s.partidaLabel}>PANELES</Text>
            <Text style={s.partidaValue}>{fmt(partidaPanelesMXN)}</Text>
          </View>
        </View>

        {/* INVERSORES */}
        <View style={s.section}>
          <View style={s.sectionTitle}><Text>INVERSORES</Text></View>
          {costoMicrosUSD > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>{cantidadMicros} microinversores DS3D x {fmt(precioMicroinversor)}</Text>
              <Text style={s.detailSubt}>{fmt(costoMicrosUSD)} USD</Text>
            </View>
          )}
          {costoCablesUSD > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>{cantidadMicros} cables troncales x {fmt(precioCable)}</Text>
              <Text style={s.detailSubt}>{fmt(costoCablesUSD)} USD</Text>
            </View>
          )}
          {costoECUUSD > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>ECU-R Sistema de monitoreo</Text>
              <Text style={s.detailSubt}>{fmt(costoECUUSD)} USD</Text>
            </View>
          )}
          {costoHerramientaUSD > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>Herramienta desconectora APS</Text>
              <Text style={s.detailSubt}>{fmt(costoHerramientaUSD)} USD</Text>
            </View>
          )}
          {costoEndCapUSD > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>End Cap APS ({cantidadMicros} pzas)</Text>
              <Text style={s.detailSubt}>{fmt(costoEndCapUSD)} USD</Text>
            </View>
          )}
          {fleteMicros > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>Flete microinversores</Text>
              <Text style={s.detailSubt}>{fmt(fleteMicros)} USD</Text>
            </View>
          )}
          <View style={s.partidaRow}>
            <Text style={s.partidaLabel}>INVERSORES</Text>
            <Text style={s.partidaValue}>{fmt(partidaInversoresMXN)}</Text>
          </View>
        </View>

        {/* ESTRUCTURA */}
        <View style={s.section}>
          <View style={s.sectionTitle}><Text>ESTRUCTURA</Text></View>
          <DetailLines items={aluminio} moneda="MXN" />
          {fleteAluminio > 0 && (
            <View style={s.detailRow}>
              <Text style={s.detailName}>Flete (IVA incluido)</Text>
              <Text style={s.detailSubt}>{fmt(fleteAluminio)} MXN</Text>
            </View>
          )}
          <View style={s.partidaRow}>
            <Text style={s.partidaLabel}>ESTRUCTURA</Text>
            <Text style={s.partidaValue}>{fmt(partidaEstructuraMXN)}</Text>
          </View>
        </View>

        {/* TORNILLERIA */}
        <View style={s.section}>
          <View style={s.sectionTitle}><Text>TORNILLERIA</Text></View>
          <DetailLines items={tornilleria} moneda="MXN" />
          <View style={s.partidaRow}>
            <Text style={s.partidaLabel}>TORNILLERIA</Text>
            <Text style={s.partidaValue}>{fmt(partidaTornilleriaMXN)}</Text>
          </View>
        </View>

        {/* GENERALES */}
        <View style={s.section}>
          <View style={s.sectionTitle}><Text>GENERALES</Text></View>
          <DetailLines items={generales} moneda="MXN" />
          <View style={s.partidaRow}>
            <Text style={s.partidaLabel}>GENERALES</Text>
            <Text style={s.partidaValue}>{fmt(partidaGeneralesMXN)}</Text>
          </View>
        </View>

        {/* TOTALES */}
        <View style={s.rowBorder}>
          <Text style={s.label}>Subtotal</Text>
          <Text style={s.value}>{fmt(subtotalMXN)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>IVA (16%)</Text>
          <Text style={s.value}>{fmt(ivaMXN)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>{fmt(totalMXN)} MXN</Text>
        </View>
      </Page>
    </Document>
  );
}
