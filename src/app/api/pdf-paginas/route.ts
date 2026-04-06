import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario" }, { status: 400 });
  }

  const file = formData.get("pdf") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(buffer);
    const totalPages = srcDoc.getPageCount();

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copied] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copied);
      const bytes = await newDoc.save();
      const b64 = Buffer.from(bytes).toString("base64");
      pages.push({
        page: i + 1,
        sizeKB: Math.round(bytes.length / 1024),
        base64: b64,
      });
    }

    return NextResponse.json({ totalPages, pages });
  } catch (err: unknown) {
    console.error("[pdf-paginas]", err);
    return NextResponse.json({ error: "Error al analizar el PDF" }, { status: 500 });
  }
}
