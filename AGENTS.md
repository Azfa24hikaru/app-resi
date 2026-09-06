# AGENTS.md — Instruksi untuk AI Coding Agent

ResiKu: Next.js 16 (App Router) + React 19 + Tailwind v4 + Prisma + PostgreSQL + jsPDF.
Bahasa UI & komentar kode: Bahasa Indonesia.

## Perintah utama

```bash
npm run db:start    # PostgreSQL embedded lokal :5432 (persistent, tetap jalan setelah script keluar)
npm run db:migrate  # prisma migrate dev
npm run db:seed     # data demo (idempoten untuk item)
npm run dev         # dev server http://localhost:3000
npm run db:stop     # hentikan PostgreSQL embedded
npx prisma migrate status  # cek DB hidup (lebih andal dari `pg_ctl status`)
```

Urutan setup dari nol: `db:start` → `db:migrate` → `seed` → `dev`.

## Aturan Windows (PowerShell 5.1) — WAJIB

- JANGAN pakai `&&` untuk merangkai perintah. Pakai `;` (atau `cmd1; if ($?) { cmd2 }` bila dependen).
- JANGAN pakai `timeout`, `touch`, `ls -la`, `cat`, `grep`, `sed`. Pakai cmdlet (`Start-Sleep`, `Get-ChildItem`, `Get-Content`, dsb).
- Path ber-spasi (`APP RESI`) wajib dikutip. Untuk tool file: pakai tool Read/Edit/Write/Glob/Grep, bukan shell.
- `npx next dev` / `prisma studio` memblokir terminal — jalankan dengan timeout dan anggap "ready" bila port merespons.

## Database — gotcha yang sudah diketahui

- `.pgdata/postgresql.conf` HARUS berisi `shared_memory_type = windows`, jika tidak server crash (error 487). `scripts/start-db.mjs` menerapkan ini otomatis saat init cluster baru.
- Bila WAL rusak akibat crash: `db:stop` → hapus folder `.pgdata/` → `db:start` → `db:migrate` → `seed`. JANGAN hapus `.pgdata` saat server berjalan.
- Next.js memprioritaskan `.env.local` di atas `.env` — pastikan `DATABASE_URL` di keduanya menunjuk DB yang sama saat dev lokal.
- Jangan commit `.env` / `.env.local` (berisi secret, sudah di `.gitignore`).

## Konvensi kode

- API Routes: bungkus handler dengan `handle()` dari `@/lib/api-response`; error konsisten `{ error, errors? }` (400/404/409/422/500).
- Validasi input terpusat di `@/lib/api-validation`; validasi nomor HP Indonesia via `isValidIndonesianPhone` / `normalizePhone`.
- PrismaClient via singleton `@/lib/db` (jangan `new PrismaClient()` di route).
- Update stok hanya lewat `POST /api/transactions` (atomik `$transaction`, guard `stock >= quantity` untuk OUT).
- Nomor resi auto: `RSI-YYYYMMDD-NNNN` (retry 5x bila tabrakan unik); PDF via dynamic `import("jspdf")` agar bundle ringan.
- Frontend panggil backend via `@/lib/api-client` (bukan fetch mentah); tipe bersama di `@/lib/types`.
- Data wilayah: proxy `/api/wilayah/*` → `wilayah.id` (rewrite di `next.config.ts`), cache in-memory + localStorage.

## Jangan

- Jangan aktifkan `output: standalone` di `next.config.ts` (merusak deploy Vercel — lihat riwayat commit).
- Jangan hapus kolom snapshot (`InventoryTransaction.sku/itemName/unit`, `Receipt` sender+wilayah IDs) — riwayat bergantung padanya.
- Jangan buat file `*.log` / `pg-*.txt` / `pg-server.log` baru di root untuk debugging (langsung tampilkan output saja); file-file itu diabaikan git dan hanya jadi sampah.
- Jangan push secret. `VERCEL_OIDC_TOKEN` di `.env.local` hanya untuk lokal.
