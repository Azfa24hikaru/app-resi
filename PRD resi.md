# 📄 Product Requirement Document (PRD)

## 1. Document Overview
* **Nama Produk:** Inventory & Shipping Label App (Aplikasi Pencatat Barang & Generator Resi)
* **Status:** Draft v1.1
* **Target Pengguna:** Pengelola Toko Online / Admin Gudang Small-Medium Enterprise (SME)
* **Tech Stack:**
  * **Frontend & UI:** Next.js (App Router), Tailwind CSS, React
  * **Backend & API:** Next.js Server Actions / API Routes
  * **PDF Generation Engine:** `@react-pdf/renderer` / `jspdf` + `html2canvas`
  * **Database:** PostgreSQL (Free Tier: Neon.tech / Supabase) via Prisma ORM
  * **Version Control & Hosting:** GitHub, Vercel

---

## 2. Executive Summary & Goals
Aplikasi ini bertujuan untuk menyederhanakan dua operasional harian merchant/toko online:
1. **Mempermudah pembuatan, pencetakan, dan pengunduhan label resi pengiriman (PDF)** yang disesuaikan dengan format wilayah Indonesia (Provinsi hingga Desa/Kelurahan) dan pilihan ekspedisi lokal.
2. **Mencatat serta memantau stok barang masuk dan keluar** secara akurat dan real-time, dilengkapi dengan fitur **export rekap laporan berformat PDF**.

---

## 3. Key Features & Functional Requirements

### 3.1. Fitur 1: Template & Generator Resi Pengiriman
* **Form Input Data Pengiriman:**
  * **Nomor Resi / Transaksi:** Auto-generated atau manual input.
  * **Nomor HP Penerima:** Field input dengan validasi format nomor Indonesia.
  * **Pilihan Wilayah Indonesia (Cascading Dropdown):**
    * Dropdown Provinsi
    * Dropdown Kota / Kabupaten (terfilter otomatis berdasarkan Provinsi)
    * Dropdown Kecamatan (terfilter otomatis berdasarkan Kota/Kabupaten)
    * Dropdown Desa / Kelurahan (terfilter otomatis berdasarkan Kecamatan)
  * **Detail Alamat:** Textarea untuk RT/RW, nama jalan, nomor rumah, dan patokan.
  * **Ekspedisi:** Dropdown pilihan ekspedisi Indonesia (JNE, J&T, SiCepat, Pos Indonesia, Shopee Xpress, Ninja Xpress, Anteraja, dll.).
* **Generasi, Cetak & Export PDF Resi:**
  * **Preview & Direct Print:** Tampilan resi ramah *thermal printer* (ukuran A6 / 10x15 cm) maupun A4.
  * **Export Resi ke PDF:** Tombol **"Download PDF Resi"** untuk mengunduh label resi tunggal maupun batch ke dalam format `.pdf` yang presisi dan siap cetak.

### 3.2. Fitur 2: Pencatat Barang Keluar / Masuk & Export Rekap (Inventory Management)
* **Master Data Barang (Items):**
  * Menambah, mengubah, dan menghapus item barang (`SKU`, `Nama Barang`, `Stok Saat Ini`, `Satuan`).
* **Pencatatan Transaksi Stok:**
  * **Stok Masuk (Stock IN):** Menambah jumlah stok barang beserta catatan (misal: "Restock dari Supplier A").
  * **Stok Keluar (Stock OUT):** Memotong jumlah stok barang beserta catatan (misal: "Dikirim via Resi #123").
* **Otomasi Stok:** Sistem secara otomatis memperbarui angka `Stok Saat Ini` di tabel Master Data Barang setiap kali ada transaksi masuk/keluar (*Database Transaction*).
* **Riwayat Transaksi & Filter:** Tabel log historis berisi tanggal, kode barang, tipe transaksi (Masuk/Keluar), jumlah, dan catatan dengan filter rentang tanggal, jenis transaksi, dan kata kunci SKU/nama.
* **Export Rekap Laporan Stok (PDF & CSV):**
  * Tombol **"Export Rekap PDF"** pada halaman riwayat transaksi.
  * Dokumen PDF Rekap berisi Header Laporan (Logo, Periode Tanggal, Tanggal Cetak), Ringkasan Statistik (Total Masuk, Total Keluar, Net Movement), serta Tabel Detail Transaksi yang rapi.

---

## 4. Architecture & Data Model Schema

### Database Schema (Prisma ORM)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Item {
  id           String                 @id @default(uuid())
  sku          String                 @unique
  name         String
  stock        Int                    @default(0)
  unit         String                 // e.g., "pcs", "box"
  transactions InventoryTransaction[]
  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt
}

enum TransactionType {
  IN
  OUT
}

model InventoryTransaction {
  id        String          @id @default(uuid())
  itemId    String
  item      Item            @relation(fields: [itemId], references: [id])
  type      TransactionType
  quantity  Int
  notes     String?
  createdAt DateTime        @default(now())
}

model Receipt {
  id            String   @id @default(uuid())
  receiptNumber String   @unique
  phoneNumber   String
  province      String
  city          String
  district      String
  village       String
  detailAddress String
  courierName   String
  createdAt     DateTime @default(now())
}
```

---

## 5. System Workflows & Diagrams

### 5.1. Alur Pembuatan & Export Resi Pengiriman

```
[Mulai]
   │
   ▼
[Buka Form Buat Resi]
   │
   ▼
[Input Nomor HP, Ekspedisi, & Detail Alamat]
   │
   ▼
[Pilih Provinsi] ───► Fetch Data Kota/Kabupaten via API
   │
   ▼
[Pilih Kota/Kabupaten] ───► Fetch Data Kecamatan via API
   │
   ▼
[Pilih Kecamatan] ───► Fetch Data Desa/Kelurahan via API
   │
   ▼
[Pilih Desa/Kelurahan]
   │
   ▼
[Klik "Simpan & Generate Resi"]
   │
   ▼
[Simpan Data Resi ke PostgreSQL]
   │
   ├───► [Pilihan A: Preview & Cetak Langsung]
   └───► [Pilihan B: Export PDF Resi (A6 / Thermal Size)]
   │
   ▼
[Selesai]
```

---

### 5.2. Alur Transaksi Barang & Export Rekap PDF

```
[Mulai]
   │
   ▼
[Pilih Jenis Transaksi: Stock IN / Stock OUT]
   │
   ▼
[Pilih Barang & Input Qty + Catatan]
   │
   ▼
[Execute DB Transaction via Prisma]
   ├── 1. Add Record to `InventoryTransaction`
   └── 2. Update `stock` in `Item` Table
   │
   ▼
[Lihat Tabel Riwayat Transaksi]
   │
   ▼
[Atur Filter Rentang Tanggal / SKU / Tipe]
   │
   ▼
[Klik "Export Rekap PDF"]
   │
   ▼
[Generate & Auto Download File PDF Rekap Laporan]
   │
   ▼
[Selesai]
```

---

## 6. Technical & Non-Functional Specifications
1. **PDF Engine Integration:** Menggunakan `@react-pdf/renderer` untuk meng-generate PDF secara konsisten di client/server side dengan ukuran custom (seperti ukuran resi thermal A6: 100x150mm).
2. **Performance:** Cascading dropdown wilayah menggunakan caching API agar pemanggilan data wilayah Indonesia berjalan sangat cepat (< 300ms).
3. **Responsiveness:** Tampilan UI mobile-first menggunakan Tailwind CSS.
4. **Data Integrity:** Menggunakan `prisma.$transaction` untuk menjamin konsistensi stok barang keluar/masuk.
