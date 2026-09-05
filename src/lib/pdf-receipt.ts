import type { Receipt } from "./types";

/** Alamat lengkap satu baris untuk label */
export function fullAddress(r: Pick<Receipt, "detailAddress" | "village" | "district" | "city" | "province">): string {
  return [r.detailAddress, r.village, r.district, r.city, r.province].filter(Boolean).join(", ");
}

/** Barcode visual deterministik dari string (untuk tampilan label) */
export function barcodeWidths(seed: string, count: number): number[] {
  const widths: number[] = [];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < count; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    widths.push(0.3 + (Math.abs(h) % 10) / 10 * 0.7); // 0.3 – 1.0 mm
  }
  return widths;
}

/** Bangun dokumen PDF label resi 100 x 150 mm */
export async function buildReceiptDoc(r: Receipt) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [100, 150] });
  drawReceiptLabel(doc, r);
  return doc;
}

/** Gambar satu label resi pada halaman aktif dokumen */
function drawReceiptLabel(doc: import("jspdf").jsPDF, r: Receipt): void {
  const W = 100;
  const m = 6;

  // Header ekspedisi
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(r.courierName.toUpperCase(), W / 2, m + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("LABEL PENGIRIMAN", W / 2, m + 8.5, { align: "center" });
  doc.setLineWidth(0.4);
  doc.line(m, m + 11, W - m, m + 11);

  // Barcode + nomor resi
  const widths = barcodeWidths(r.receiptNumber, 42);
  const totalW = widths.reduce((a, b) => a + b, 0);
  let x = (W - totalW) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(r.receiptNumber, W / 2, m + 17, { align: "center" });
  widths.forEach((w, i) => {
    if (i % 2 === 0) doc.rect(x, m + 19, w, 9, "F");
    x += w;
  });

  // Pengirim (dari Profil) — blok hanya dicetak bila ada datanya
  let y = m + 33.5;
  const senderLine = [r.storeName, r.senderName].filter(Boolean).join(" — ");
  if (senderLine || r.senderPhone || r.senderAddress) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("DARI:", m, y);
    if (senderLine) {
      doc.setFontSize(8);
      doc.text(senderLine, m, y + 4.3);
    }
    y += 4.3;
    if (r.senderPhone) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`Telp: ${r.senderPhone}`, m, y + 3.8);
      y += 3.8;
    }
    if (r.senderAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const senderAddrLines = (doc.splitTextToSize(r.senderAddress, W - 2 * m) as string[]).slice(0, 2);
      senderAddrLines.forEach((line: string) => {
        doc.text(line, m, y + 3.8);
        y += 3.8;
      });
    }
    y += 5.5;
  } else {
    y = m + 34;
  }

  // Penerima
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("KEPADA:", m, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Telp: ${r.phoneNumber}`, m, y + 4.5);

  const addrLines = doc.splitTextToSize(fullAddress(r), W - 2 * m) as string[];
  let ay = y + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  addrLines.forEach((line: string) => {
    doc.text(line, m, ay);
    ay += 4.2;
  });

  // Footer
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(m, 150 - m - 6, W - m, 150 - m - 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(90);
  doc.text(`Dibuat: ${new Date(r.createdAt).toLocaleString("id-ID")}`, m, 150 - m - 2);
  doc.setTextColor(0);
}

/** Bangun dokumen PDF berisi banyak label resi (1 halaman per label, thermal 100 x 150 mm) */
export async function buildBatchReceiptsDoc(receipts: Receipt[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [100, 150] });
  receipts.forEach((r, i) => {
    if (i > 0) doc.addPage([100, 150], "portrait");
    drawReceiptLabel(doc, r);
  });
  return doc;
}

/** Download satu label resi ukuran thermal 100 x 150 mm (A6) */
export async function downloadReceiptPdf(r: Receipt): Promise<void> {
  const doc = await buildReceiptDoc(r);
  doc.save(`resi-${r.receiptNumber}.pdf`);
}

/** Download banyak label resi ke dalam satu file PDF (1 halaman per label) */
export async function downloadBatchReceiptsPdf(receipts: Receipt[]): Promise<void> {
  const doc = await buildBatchReceiptsDoc(receipts);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`resi-batch-${receipts.length}-label-${stamp}.pdf`);
}

/** Buka PDF resi di tab baru untuk pratinjau & cetak langsung */
export async function printReceiptPdf(r: Receipt): Promise<void> {
  const doc = await buildReceiptDoc(r);
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url as unknown as string, "_blank");
}

/** Buka PDF batch (banyak label) di tab baru untuk pratinjau & cetak langsung */
export async function printBatchReceiptsPdf(receipts: Receipt[]): Promise<void> {
  const doc = await buildBatchReceiptsDoc(receipts);
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url as unknown as string, "_blank");
}

