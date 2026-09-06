# ResiKu — Inventory & Shipping Label App

Aplikasi full-stack **Pencatat Barang & Generator Resi Pengiriman** (sesuai PRD resi.md) yang dibangun dengan:

- **Next.js 16 (App Router) + TypeScript + React 19**
- **Tailwind CSS v4** (mobile-first)
- **Prisma ORM + PostgreSQL** (embedded lokal / Neon.tech / Supabase)
- **jsPDF** untuk export PDF (label resi thermal 100×150 mm & rekap laporan A4)
- **Docker** (multi-stage build, siap deploy)

## Menjalankan

```bash
npm install
cp .env.example .env   # isi DATABASE_URL (lokal / Neon / Supabase)
npm run db:start       # PostgreSQL embedded lokal (port 5432)
npm run db:migrate     # buat tabel via Prisma migrate
node prisma/seed.js    # (opsional) data demo
npm run dev
```

Buka http://localhost:3000

## Menjalankan dengan Docker

Cara paling cepat — menjalankan 3 service sekaligus (db + migrate + app):

```bash
docker compose up --build
```

| Service | Deskripsi |
| --- | --- |
| `db` | PostgreSQL 16 (data persistent di volume `pgdata`, port host `5433`) |
| `migrate` | `prisma migrate deploy` sekali sebelum app start |
| `app` | Aplikasi Next.js di http://localhost:3000 |

Bisa juga memakai database eksternal (Neon/Supabase): isi `DATABASE_URL` di file `.env`, lalu jalankan `docker compose up app`.

## Fitur

| Halaman | Fitur |
| --- | --- |
| `/` Dashboard | Ringkasan stok menipis, transaksi hari ini, resi terbaru |
| `/resi` | Form resi: nomor auto-generate, validasi HP Indonesia, **cascading dropdown wilayah Indonesia (38 provinsi)** (Provinsi → Kota/Kab → Kecamatan → Desa via [wilayah.id](https://wilayah.id) di-proxy lewat `/api/wilayah` dengan cache in-memory + localStorage), data pengirim otomatis dari **Profil**, 12 ekspedisi lokal, preview label thermal, **Cetak langsung**, **Download PDF**, riwayat resi dengan aksi **Edit / Unduh / Cetak / Hapus**, serta **Export Batch PDF**: centang beberapa resi lalu unduh/cetak semua label sekaligus dalam **satu file PDF multi-halaman** (1 label thermal 100×150 mm per halaman) |
| `/inventory` | CRUD Master Barang, transaksi Stok Masuk/Keluar dengan validasi stok (pembaruan stok atomik), Riwayat + filter (rentang tanggal, tipe, kata kunci SKU/nama), **Export Rekap PDF** & **CSV** |
| `/profile` | Profil nama toko / nama pengirim / alamat / no. telepon — otomatis tercetak di bagian "DARI" label resi (PDF & pratinjau) |

## Catatan Arsitektur

- Frontend berkomunikasi dengan backend via `src/lib/api-client.ts` (fetch ke Next.js API Routes), sehingga seluruh data tersimpan di **PostgreSQL** (bukan localStorage).
- Data wilayah di-fetch dari API publik [wilayah.id](https://wilayah.id) (di-proxy via `/api/wilayah`) dan di-cache agar pemanggilan berulang < 300 ms (PRD §6.2).
- PDF di-generate di client via `jspdf` (`src/lib/pdf-receipt.ts`, `src/lib/pdf-report.ts`) dengan dynamic import agar bundle awal tetap ringan.
- Update stok atomik: transaksi IN/OUT dijalankan dalam `prisma.$transaction` dan diverifikasi ulang di level database agar stok tidak pernah minus (PRD §6.4).

## Struktur Proyek

```
├── prisma/                  # Schema, migrasi, dan seed database
├── scripts/                 # Start/stop PostgreSQL embedded lokal
├── src/
│   ├── app/
│   │   ├── api/             # API Routes (items, transactions, receipts, profile)
│   │   ├── inventory/       # Halaman master barang & transaksi stok
│   │   ├── resi/            # Halaman generator resi
│   │   ├── profile/         # Halaman profil pengirim/toko
│   │   └── page.tsx         # Dashboard
│   ├── components/          # Komponen UI (AppShell, sections, ui)
│   └── lib/                 # api-client, validasi, db, wilayah, PDF, dll.
├── Dockerfile               # Multi-stage build (Next.js standalone + Prisma)
└── docker-compose.yml       # db + migrate + app
```

## Skrip NPM

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan development server |
| `npm run build` / `npm start` | Build production / jalankan production server |
| `npm run db:start` | Start PostgreSQL embedded (persistent, port 5432) + buat database `resiku` bila belum ada |
| `npm run db:stop` | Stop PostgreSQL embedded |
| `npm run db:migrate` | `prisma migrate dev` (buat/terapkan migrasi) |
| `npm run db:deploy` | `prisma migrate deploy` (terapkan migrasi, untuk production) |
| `npm run db:studio` | Prisma Studio (GUI database) |
| `npm run db:generate` | Generate Prisma Client |

---

## Backend & Database (sesuai PRD §1 & §4)

Backend memakai **Next.js API Routes + Prisma ORM + PostgreSQL** (embedded lokal / free tier Neon.tech / Supabase), dengan `prisma.$transaction` untuk menjaga konsistensi stok (PRD §6.4).

### Troubleshooting (Windows)

> Jika muncul `P1001: Can't reach database server`, pastikan
> (1) `DATABASE_URL` memakai `127.0.0.1` (bukan `localhost` — resolusi IPv6 Prisma
> kadang gagal di Windows), dan (2) tidak ada variabel lingkungan global
> `DATABASE_URL` yang menimpa `.env`.
>
> **Penting:** Next.js memprioritaskan `.env.local` di atas `.env`. Pastikan
> `DATABASE_URL` di kedua file menunjuk ke database yang sama (lokal:
> `postgresql://postgres:postgres@localhost:5432/resiku?schema=public`);
> jika tidak, dev server dan Prisma CLI akan memakai database berbeda.
>
> Jika PostgreSQL embedded crash berulang (`could not reserve shared memory
> region`, error 487), pastikan `.pgdata/postgresql.conf` berisi
> `shared_memory_type = windows` (`npm run db:start` menerapkan ini otomatis
> saat inisialisasi cluster baru). Bila WAL rusak akibat crash sebelumnya,
> hentikan server (`npm run db:stop`), hapus folder `.pgdata/`, lalu ulangi
> `npm run db:start` + `npm run db:migrate` + `node prisma/seed.js`.
>
> Jika `npm run db:start` tampak berhenti (tidak kembali ke prompt), server
> biasanya tetap sudah berjalan — cek dengan `npx prisma migrate status` atau
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
| GET | `/api/receipts?q=&limit=&offset=` | Daftar resi + pencarian (nomor, HP, wilayah, ekspedisi, pengirim) & paginasi |
| POST | `/api/receipts` | Simpan resi; nomor resi auto-generated `RSI-YYYYMMDD-NNNN` bila tidak dikirim |
| GET | `/api/receipts/[id]` | Detail resi |
| PUT | `/api/receipts/[id]` | Edit resi |
| DELETE | `/api/receipts/[id]` | Hapus resi |
| GET | `/api/profile` | Profil pengirim/toko |
| PUT | `/api/profile` | Simpan profil |
| GET | `/api/wilayah/*` | Proxy ke [wilayah.id](https://wilayah.id) via rewrite di `next.config.ts` (API wilayah.id tidak mengirim header CORS) |

### Catatan Schema

`prisma/schema.prisma` mengikuti schema PRD §4, dengan beberapa kolom tambahan superset agar mendukung UI yang sudah ada:

- `InventoryTransaction`: snapshot `sku`, `itemName`, `unit` — riwayat tetap utuh meski master barang berubah/dihapus.
- `Receipt`: snapshot pengirim (`storeName`, `senderName`, `senderPhone`, `senderAddress`) dan ID wilayah (`provinceId`..`villageId`) agar resi lama tetap valid dan bisa dimuat ulang ke form.
- `Profile`: model tambahan untuk data pengirim/toko (halaman `/profile`).

Error response konsisten: `{ "error": "pesan", "errors": { field: "pesan" } }` dengan status 400/404/409/422/500.
