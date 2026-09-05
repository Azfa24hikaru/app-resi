/**
 * Menjalankan PostgreSQL embedded (tanpa install PostgreSQL terpisah).
 *   npm run db:start
 *
 * Data cluster disimpan di folder `.pgdata`. Dengan `persistent: true`,
 * server tetap berjalan setelah script ini keluar.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = path.resolve(".pgdata");
const DB_NAME = "resiku";
const PORT = Number(process.env.PGPORT || 5432);

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
  console.log(`Menyiapkan cluster PostgreSQL di ${DATA_DIR} ...`);
  await pg.initialise();
  console.log("Cluster siap.");
}

console.log(`Menjalankan PostgreSQL di localhost:${PORT} ...`);
await pg.start();

try {
  await pg.createDatabase(DB_NAME);
  console.log(`Database '${DB_NAME}' berhasil dibuat.`);
} catch {
  console.log(`Database '${DB_NAME}' sudah ada.`);
}

console.log(
  `PostgreSQL berjalan (persistent). Lanjutkan dengan:\n` +
    `  npm run db:migrate   (prisma migrate dev)\n` +
    `  node prisma/seed.js  (data demo)\n` +
    `  npm run dev`
);
