import { formatDate, formatDateTime } from "./format";
import type { InventoryTransaction, TransactionType } from "./types";

export interface RekapStats {
  totalIn: number;
  totalOut: number;
  net: number;
}

interface RekapOptions {
  transactions: InventoryTransaction[];
  periodLabel: string;
  stats: RekapStats;
}

const COLS = [
  { key: "no", label: "No", width: 10, align: "center" as const },
  { key: "tanggal", label: "Tanggal", width: 26, align: "left" as const },
  { key: "sku", label: "SKU", width: 28, align: "left" as const },
  { key: "nama", label: "Nama Barang", width: 48, align: "left" as const },
  { key: "tipe", label: "Tipe", width: 16, align: "center" as const },
  { key: "qty", label: "Jumlah", width: 18, align: "right" as const },
  { key: "catatan", label: "Catatan", width: 36, align: "left" as const },
];

function cellValue(tx: InventoryTransaction, key: string): string {
  switch (key) {
    case "no": return "";
    case "tanggal": return formatDateTime(tx.createdAt);
    case "sku": return tx.sku;
    case "nama": return tx.itemName;
    case "tipe": return tx.type === "IN" ? "Masuk" : "Keluar";
    case "qty": return `${tx.quantity} ${tx.unit}`;
    default: return tx.notes ?? "";
  }
}

/** Generate & download Rekap Laporan Stok PDF (A4) sesuai PRD 3.2 */
export async function downloadRekapPdf({ transactions, periodLabel, stats }: RekapOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 12;
  const tableX = m;
  const tableW = COLS.reduce((a, c) => a + c.width, 0);
  let y = m;

  const drawTableHeader = () => {
    doc.setFillColor(49, 46, 129);
    doc.rect(tableX, y, tableW, 8, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    let x = tableX;
    COLS.forEach((c) => {
      const tx = c.align === "right" ? x + c.width - 2 : c.align === "center" ? x + c.width / 2 : x + 2;
      doc.text(c.label, tx, y + 5.5, { align: c.align });
      x += c.width;
    });
    doc.setTextColor(0);
    y += 8;
  };

  // Header laporan: judul, periode, tanggal cetak (PRD 3.2)
  doc.setFillColor(49, 46, 129);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LAPORAN REKAP PERGERAKAN STOK", m, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Periode: ${periodLabel}`, m, 16.5);
  doc.text(`Dicetak: ${formatDateTime(new Date().toISOString())}`, W - m, 16.5, { align: "right" });
  doc.setTextColor(0);
  y = 30;

  // Ringkasan statistik: Total Masuk, Total Keluar, Net Movement
  const boxW = (tableW - 12) / 3;
  const statBoxes: Array<[string, string, [number, number, number]]> = [
    ["Total Masuk", `+${stats.totalIn}`, [22, 163, 74]],
    ["Total Keluar", `-${stats.totalOut}`, [225, 29, 72]],
    ["Net Movement", `${stats.net >= 0 ? "+" : ""}${stats.net}`, [49, 46, 129]],
  ];
  statBoxes.forEach(([label, value, color], i) => {
    const bx = tableX + i * (boxW + 6);
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(bx, y, boxW, 16, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(label, bx + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...color);
    doc.text(value, bx + 4, y + 12.5);
    doc.setTextColor(0);
  });
  y += 22;

  drawTableHeader();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  transactions.forEach((tx, idx) => {
    const notes = doc.splitTextToSize(cellValue(tx, "catatan"), COLS[6].width - 4) as string[];
    const rowH = Math.max(7, notes.length * 4 + 2.5);

    // Page break + ulang header tabel
    if (y + rowH > H - m - 10) {
      doc.addPage();
      y = m;
      drawTableHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(245, 245, 250);
      doc.rect(tableX, y, tableW, rowH, "F");
    }

    let x = tableX;
    COLS.forEach((c) => {
      if (c.key === "no") {
        doc.text(String(idx + 1), x + c.width / 2, y + 5, { align: "center" });
      } else if (c.key === "tipe") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(tx.type === "IN" ? 22 : 190, tx.type === "IN" ? 163 : 20, tx.type === "IN" ? 74 : 60);
        doc.text(tx.type === "IN" ? "Masuk" : "Keluar", x + c.width / 2, y + 5, { align: "center" });
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
      } else if (c.key === "catatan") {
        doc.text(notes, x + 2, y + 5);
      } else {
        const tx2 = c.align === "right" ? x + c.width - 2 : c.align === "center" ? x + c.width / 2 : x + 2;
        doc.text(cellValue(tx, c.key), tx2, y + 5, { align: c.align });
      }
      x += c.width;
    });

    doc.setDrawColor(225);
    doc.setLineWidth(0.1);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
    y += rowH;
  });

  if (transactions.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120);
    doc.text("Tidak ada transaksi pada periode ini.", tableX + tableW / 2, y + 8, { align: "center" });
    doc.setTextColor(0);
  }

  doc.save(`rekap-stok-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** Export transaksi ke CSV (pemisah ";" kompatibel Excel Indonesia) */
export function downloadCsv(filename: string, transactions: InventoryTransaction[]): void {
  const header = ["Tanggal", "SKU", "Nama Barang", "Tipe", "Jumlah", "Satuan", "Catatan"];
  const rows = transactions.map((t) => [
    formatDateTime(t.createdAt),
    t.sku,
    t.itemName,
    t.type === "IN" ? "Masuk" : "Keluar",
    String(t.quantity),
    t.unit,
    t.notes ?? "",
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function computeStats(transactions: InventoryTransaction[]): RekapStats {
  const totalIn = transactions
    .filter((t) => (t.type satisfies TransactionType) === "IN")
    .reduce((a, t) => a + t.quantity, 0);
  const totalOut = transactions.filter((t) => t.type === "OUT").reduce((a, t) => a + t.quantity, 0);
  return { totalIn, totalOut, net: totalIn - totalOut };
}

/** Filter riwayat: rentang tanggal, jenis transaksi, kata kunci SKU/nama (PRD 3.2) */
export function filterTransactions(
  transactions: InventoryTransaction[],
  opts: { from?: string; to?: string; type?: TransactionType | ""; keyword?: string },
): InventoryTransaction[] {
  const kw = opts.keyword?.trim().toLowerCase() ?? "";
  return transactions.filter((t) => {
    const d = new Date(t.createdAt);
    if (opts.from && d < new Date(`${opts.from}T00:00:00`)) return false;
    if (opts.to && d > new Date(`${opts.to}T23:59:59`)) return false;
    if (opts.type && t.type !== opts.type) return false;
    if (kw && !`${t.sku} ${t.itemName}`.toLowerCase().includes(kw)) return false;
    return true;
  });
}


