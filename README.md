# ResiKu — Inventory & Shipping Label App

Frontend aplikasi **Pencatat Barang & Generator Resi Pengiriman** (sesuai PRD resi.md) yang dibangun dengan:

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS v4** (mobile-first)
- **jsPDF** untuk export PDF (label resi thermal 100×150 mm & rekap laporan A4)

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Fitur

| Halaman | Fitur |
| --- | --- |
| `/` Dashboard | Ringkasan stok menipis, transaksi hari ini, resi terbaru |
| `/resi` | Form resi: nomor auto-generate, validasi HP Indonesia, **cascading dropdown wilayah Indonesia (38 provinsi)** (Provinsi → Kota/Kab → Kecamatan → Desa via [wilayah.id](https://wilayah.id) di-proxy lewat `/api/wilayah` dengan cache in-memory + localStorage), data pengirim otomatis dari **Profil**, 12 ekspedisi lokal, preview label thermal, **Cetak langsung**, **Download PDF**, riwayat resi dengan aksi **Edit / Unduh / Cetak / Hapus**, serta **Export Batch PDF**: centang beberapa resi lalu unduh/cetak semua label sekaligus dalam **satu file PDF multi-halaman** (1 label thermal 100×150 mm per halaman) |
| `/inventory` | CRUD Master Barang, transaksi Stok Masuk/Keluar dengan validasi stok (pembaruan stok atomik), Riwayat + filter (rentang tanggal, tipe, kata kunci SKU/nama), **Export Rekap PDF** & **CSV** |
| `/profile` | Profil nama toko / nama pengirim / alamat / no. telepon — otomatis tercetak di bagian "DARI" label resi (PDF & pratinjau) |

## Catatan Arsitektur

- Lapisan data frontend memakai `localStorage` (`src/lib/storage.ts`) dengan struktur tipe yang mengikuti schema Prisma di PRD (`Item`, `InventoryTransaction`, `Receipt`). Untuk integrasi ke backend, ganti `import ... from "./storage"` menjadi `from "./api-client"` (`src/lib/api-client.ts`) — kontrak fungsinya dibuat mirip, hanya saja async.
- Data wilayah di-fetch dari API publik emsifa dan di-cache agar pemanggilan berulang < 300 ms (PRD §6.2).
- PDF di-generate di client via `jspdf` (`src/lib/pdf-receipt.ts`, `src/lib/pdf-report.ts`) dengan dynamic import agar bundle awal tetap ringan.

---

## Backend (sesuai PRD §1 & §4)

Backend memakai **Next.js API Routes + Prisma ORM + PostgreSQL** (free tier Neon.tech / Supabase), dengan `prisma.$transaction` untuk menjaga konsistensi stok (PRD §6.4).

### Setup Database

```bash
cp .env.example .env      # lalu isi DATABASE_URL (Neon/Supabase/lokal)
npm run db:start          # jalankan PostgreSQL embedded lokal (.pgdata)
npm run db:migrate        # prisma migrate dev --name init (buat tabel)
node prisma/seed.js       # (opsional) data demo
npm run dev
```

Perintah database tambahan:

| Perintah | Fungsi |
| --- | --- |
| `npm run db:start` | Start PostgreSQL embedded (persistent, port 5432) + buat database `resiku` bila belum ada |
| `npm run db:stop` | Stop PostgreSQL embedded |
| `npm run db:studio` | Prisma Studio (GUI database) |

> **Catatan Windows:** jika muncul `P1001: Can't reach database server`, pastikan
> (1) `DATABASE_URL` memakai `127.0.0.1` (bukan `localhost` — resolusi IPv6 Prisma
> kadang gagal di Windows), dan (2) tidak ada variabel lingkungan global
> `DATABASE_URL` yang menimpa `.env`.
>
> Jika `npm run db:start` tampak berhenti (tidak kembali ke prompt), server
> biasanya tetap sudah berjalan — cek dengan `npm run db:migrate status` atau
> buka `http://localhost:5432` (koneksi ditolak = server hidup). `Ctrl+C` aman
> untuk keluar dari script tanpa menghentikan database. Untuk menghentikan:
> `npm run db:stop`.

### Endpoint API

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET | `/api/items?q=` | Daftar barang (opsional pencarian SKU/nama) |
| POST | `/api/items` | Tambah barang (SKU unik, validasi lengkap) |
| GET | `/api/items/[id]` | Detail barang |
| PUT | `/api/items/[id]` | Ubah barang |
| DELETE | `/api/items/[id]` | Hapus barang (+ transaksi terkait, cascade) |
| GET | `/api/transactions?from=&to=&type=&q=&itemId=&limit=&offset=` | Riwayat transaksi + filter sesuai PRD 3.2 |
| POST | `/api/transactions` | Catat IN/OUT — atomik via `$transaction`: insert transaksi (snapshot barang) + update stok; stok OUT diverifikasi di level DB agar tidak pernah minus |
| GET | `/api/transactions/stats?from=&to=` | Ringkasan Total Masuk / Keluar / Net Movement (untuk Rekap PDF) |
| GET | `/api/receipts?q=` | Daftar resi |
| POST | `/api/receipts` | Simpan resi; nomor resi auto-generated `RSI-YYYYMMDD-NNNN` bila tidak dikirim |
| GET | `/api/receipts/[id]` | Detail resi |
| PUT | `/api/receipts/[id]` | Edit resi |
| DELETE | `/api/receipts/[id]` | Hapus resi |
| GET | `/api/profile` | Profil pengirim/toko |
| PUT | `/api/profile` | Simpan profil |

### Catatan Schema

`prisma/schema.prisma` mengikuti schema PRD §4, dengan beberapa kolom tambahan superset agar mendukung UI yang sudah ada:

- `InventoryTransaction`: snapshot `sku`, `itemName`, `unit` — riwayat tetap utuh meski master barang berubah/dihapus.
- `Receipt`: snapshot pengirim (`storeName`, `senderName`, `senderPhone`, `senderAddress`) dan ID wilayah (`provinceId`..`villageId`) agar resi lama tetap valid dan bisa dimuat ulang ke form.
- `Profile`: model tambahan untuk data pengirim/toko (halaman `/profile`).

Error response konsisten: `{ "error": "pesan", "errors": { field: "pesan" } }` dengan status 400/404/409/422/500.

