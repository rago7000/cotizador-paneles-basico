"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SolicitudCFEProps {
  // I. Datos del Solicitante
  nombreSolicitante: string;
  domicilio: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  codigoPostal?: string;
  telefono?: string;
  email?: string;

  // V. Datos del Servicio
  rpu: string;
  tarifa: string;

  // VI. Central Eléctrica
  capacidadKW: number;
  generacionMensualKWh: number;
  cantidadPaneles: number;
  fechaOperacion?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#111",
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLabel: { fontSize: 8, fontWeight: "bold" },
  headerValue: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    minWidth: 140,
    paddingBottom: 2,
    fontSize: 9,
  },
  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8e8e8",
    borderWidth: 0.5,
    borderColor: "#999",
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 10,
    marginBottom: 0,
  },
  sectionNum: { fontSize: 9, fontWeight: "bold", marginRight: 8 },
  sectionTitle: { fontSize: 9, fontWeight: "bold" },
  // Table
  table: {
    borderWidth: 0.5,
    borderColor: "#999",
    borderTopWidth: 0,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    minHeight: 18,
  },
  cell: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    justifyContent: "center",
  },
  cellLabel: {
    fontSize: 7.5,
    color: "#444",
  },
  cellValue: {
    fontSize: 9,
    color: "#000",
  },
  cellBorder: {
    borderRightWidth: 0.5,
    borderRightColor: "#ccc",
  },
  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 16,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 0.5,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  checkMark: { fontSize: 7, fontWeight: "bold" },
  checkLabel: { fontSize: 8 },
  // Signature
  signBlock: {
    borderWidth: 0.5,
    borderColor: "#999",
    padding: 10,
    marginTop: 8,
    minHeight: 60,
  },
  signLabel: { fontSize: 7, color: "#666", marginBottom: 4 },
  signLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    marginTop: 20,
    marginBottom: 2,
  },
  // Footer text
  legalText: {
    fontSize: 6.5,
    color: "#555",
    lineHeight: 1.4,
    marginTop: 8,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionNum}>{num}.</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function FieldRow({
  fields,
}: {
  fields: Array<{ label: string; value?: string; flex?: number }>;
}) {
  return (
    <View style={s.row}>
      {fields.map((f, i) => (
        <View
          key={i}
          style={[
            s.cell,
            { flex: f.flex ?? 1 },
            i < fields.length - 1 ? s.cellBorder : {},
          ]}
        >
          <Text style={s.cellLabel}>{f.label}</Text>
          {f.value ? <Text style={s.cellValue}>{f.value}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={s.checkboxRow}>
      <View style={s.checkbox}>
        {checked && <Text style={s.checkMark}>X</Text>}
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SolicitudCFEPDF(props: SolicitudCFEProps) {
  const {
    nombreSolicitante,
    domicilio,
    colonia,
    municipio,
    estado,
    codigoPostal,
    telefono,
    email,
    rpu,
    tarifa,
    capacidadKW,
    generacionMensualKWh,
    cantidadPaneles,
    fechaOperacion,
  } = props;

  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const bajaTension = capacidadKW < 25;

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ── Header: Fecha + Número de Solicitud ── */}
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={s.headerLabel}>Fecha</Text>
            <Text style={s.headerValue}>{hoy}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={s.headerLabel}>Numero de Solicitud</Text>
            <Text style={[s.headerValue, { minWidth: 80 }]}> </Text>
          </View>
        </View>

        {/* ── I. Datos del Solicitante ── */}
        <SectionHead num="I" title="Datos del Solicitante" />
        <View style={s.table}>
          <FieldRow
            fields={[
              {
                label: "Nombre, Denominacion o Razon Social",
                value: nombreSolicitante,
                flex: 4,
              },
            ]}
          />
          <FieldRow
            fields={[{ label: "Domicilio", value: domicilio, flex: 4 }]}
          />
          <FieldRow
            fields={[
              { label: "Calle", value: domicilio, flex: 2 },
              { label: "Numero exterior", flex: 1 },
              { label: "Numero Interior", flex: 1 },
              { label: "Codigo Postal", value: codigoPostal, flex: 1 },
            ]}
          />
          <FieldRow
            fields={[
              { label: "Colonia/Poblacion", value: colonia, flex: 2 },
              { label: "Delegacion/Municipio", value: municipio, flex: 1 },
              { label: "Estado", value: estado, flex: 1 },
            ]}
          />
          <FieldRow
            fields={[
              { label: "Telefono", value: telefono, flex: 1 },
              { label: "Correo Electronico", value: email, flex: 2 },
              { label: "Fax", flex: 1 },
            ]}
          />
        </View>

        {/* ── II. Datos de Contacto ── */}
        <SectionHead num="II" title="Datos de Contacto" />
        <View style={s.table}>
          <FieldRow
            fields={[
              { label: "Nombre", value: nombreSolicitante, flex: 3 },
              { label: "Puesto", flex: 1 },
            ]}
          />
          <FieldRow
            fields={[{ label: "Domicilio", value: domicilio, flex: 4 }]}
          />
          <FieldRow
            fields={[
              { label: "Calle", value: domicilio, flex: 2 },
              { label: "Numero exterior", flex: 1 },
              { label: "Numero Interior", flex: 1 },
              { label: "Codigo Postal", value: codigoPostal, flex: 1 },
            ]}
          />
          <FieldRow
            fields={[
              { label: "Colonia/Poblacion", value: colonia, flex: 2 },
              { label: "Delegacion/Municipio", value: municipio, flex: 1 },
              { label: "Estado", value: estado, flex: 1 },
            ]}
          />
          <FieldRow
            fields={[
              { label: "Telefono", value: telefono, flex: 1 },
              { label: "Correo Electronico", value: email, flex: 2 },
              { label: "Fax", flex: 1 },
            ]}
          />
        </View>

        {/* ── III. Datos de la Solicitud ── */}
        <SectionHead num="III" title="Datos de la Solicitud" />
        <View style={s.table}>
          <View style={s.row}>
            <View style={[s.cell, { flex: 1 }]}>
              <Text style={s.cellLabel}>Modalidad de la Solicitud</Text>
            </View>
            <View
              style={[
                s.cell,
                s.cellBorder,
                { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
              ]}
            >
              <Checkbox checked={bajaTension} label="Baja Tension" />
            </View>
            <View
              style={[
                s.cell,
                { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
              ]}
            >
              <Checkbox checked={!bajaTension} label="Media Tension" />
            </View>
          </View>
        </View>

        {/* ── IV. Utilización de la Energía Eléctrica Producida ── */}
        <SectionHead num="IV" title="Utilizacion de la Energia Electrica Producida" />
        <View style={s.table}>
          <View style={[s.row, { paddingVertical: 4, paddingHorizontal: 6, gap: 12 }]}>
            <Checkbox checked={true} label="Consumo de Centros de Carga" />
            <Checkbox checked={false} label="Consumo de Centros de Carga y Venta de Excedentes" />
            <Checkbox checked={false} label="Venta Total" />
          </View>
        </View>

        {/* ── V. Datos del Servicio Suministro Actual ── */}
        <SectionHead num="V" title="Datos del Servicio Suministro Actual" />
        <View style={s.table}>
          <FieldRow
            fields={[
              {
                label: "Registro Publico de Usuario (RPU)",
                value: rpu,
                flex: 2,
              },
              {
                label: "Nivel de Tension de Suministro",
                value: bajaTension ? `Baja Tension (${tarifa})` : `Media Tension (${tarifa})`,
                flex: 2,
              },
            ]}
          />
        </View>

        {/* ── VI. Central Eléctrica ── */}
        <SectionHead num="VI" title="Central Electrica" />
        <View style={s.table}>
          <FieldRow
            fields={[
              {
                label: "Fecha estimada de Operacion Normal (DD/MM/AAAA)",
                value: fechaOperacion || "",
                flex: 1,
              },
              {
                label: "Capacidad Bruta Instalada (Kw)",
                value: capacidadKW.toFixed(2),
                flex: 1,
              },
              {
                label: "Capacidad a Incrementar (kw) (Opcional)",
                flex: 1,
              },
              {
                label: "Generacion Promedio Mensual Estimada (kwh/Mes)",
                value: generacionMensualKWh.toFixed(0),
                flex: 1,
              },
            ]}
          />
        </View>

        {/* ── VII. Manifestación de Cumplimiento ── */}
        <SectionHead num="VII" title="Manifestacion de Cumplimiento de las Especificaciones Tecnicas Generales" />
        <View style={s.table}>
          <View style={[s.row, { paddingHorizontal: 6, paddingVertical: 4 }]}>
            <Text style={[s.cellLabel, { flex: 4 }]}>
              Manifiesto bajo protesta de decir la verdad que la Central Electrica cumple con las
              Especificaciones tecnicas requeridas de acuerdo las disposiciones aplicables.
            </Text>
          </View>

          {/* Tecnología */}
          <View style={[s.row, { paddingHorizontal: 6, paddingVertical: 4 }]}>
            <Text style={[s.cellLabel, { marginBottom: 4 }]}>
              Tecnologia para generacion de energia electrica
            </Text>
          </View>
          <View style={[s.row, { paddingHorizontal: 12, paddingVertical: 3, gap: 20, flexWrap: "wrap" }]}>
            <Checkbox checked={true} label="Solar" />
            <Checkbox checked={false} label="Biomasa" />
            <Checkbox checked={false} label="Otro" />
            <Checkbox checked={false} label="Eolico" />
            <Checkbox checked={false} label="Cogeneracion" />
          </View>

          {/* No. unidades y combustible */}
          <FieldRow
            fields={[
              {
                label: "No de unidades de generacion",
                value: String(cantidadPaneles),
                flex: 1,
              },
              { label: "Combustible principal", value: "N/A (Solar)", flex: 1 },
              { label: "Combustible secundario", value: "N/A", flex: 1 },
            ]}
          />

          {/* Coordenadas UTM (empty) */}
          <View style={[s.row, { paddingHorizontal: 6, paddingVertical: 3 }]}>
            <Text style={s.cellLabel}>Coordenadas UTM</Text>
          </View>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <View key={n} style={s.row}>
              <View style={[s.cell, s.cellBorder, { width: 30 }]}>
                <Text style={s.cellLabel}>{n}</Text>
              </View>
              <View style={[s.cell, s.cellBorder, { flex: 1 }]}>
                <Text style={s.cellLabel}>X</Text>
              </View>
              <View style={[s.cell, { flex: 1 }]}>
                <Text style={s.cellLabel}>Y</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Legal text ── */}
        <Text style={s.legalText}>
          (Representante Legal o El Solicitante) (El Solicitante) certifica que la Informacion
          proporcionada en la presente solicitud es apropiada, precisa y veridica. El solicitante
          acepta que los datos proporcionados sean utilizados para llevar a cabo los Estudios de
          Interconexion para garantizar la confiabilidad del Sistema Electrico Nacional con la
          Interconexion de la Central Electrica del solicitante al amparo de la Ley de la Industria
          Electrica y su Reglamento, en caso de ser requeridos.
        </Text>
        <Text style={s.legalText}>
          El solicitante entiende que los datos proporcionados, se anadiran a las bases de datos del
          suministrador cuando se firme un contrato de interconexion respectivo.
        </Text>

        {/* ── Firma ── */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <View style={[s.signBlock, { flex: 1 }]}>
            <Text style={s.signLabel}>Firma de Conformidad</Text>
            <View style={s.signLine} />
            <Text style={{ fontSize: 7, textAlign: "center", color: "#666" }}>
              Solicitante
            </Text>
            <View style={{ marginTop: 12 }}>
              <Text style={s.cellLabel}>Nombre: {nombreSolicitante}</Text>
              <Text style={s.cellLabel}>Cargo:</Text>
              <Text style={s.cellLabel}>Fecha: {hoy}</Text>
            </View>
          </View>
          <View style={[s.signBlock, { flex: 1, alignItems: "center" }]}>
            <Text style={s.signLabel}>sello y firma</Text>
            <Text style={[s.signLabel, { marginTop: 30 }]}>Centro de Atencion</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
