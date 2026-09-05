/**
 * Menghentikan PostgreSQL embedded yang berjalan (dibuat via npm run db:start).
 *   npm run db:stop
 */
import path from "node:path";
import { execFileSync } from "node:child_process";

const DATA_DIR = path.resolve(".pgdata");
const PG_CTL = path.resolve(
  "node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe"
);

try {
  const out = execFileSync(
    PG_CTL,
    ["stop", "-D", DATA_DIR, "-m", "fast"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  console.log(out.trim() || "PostgreSQL dihentikan.");
} catch (e) {
  const msg = String(e.stderr || e.stdout || e.message || "");
  if (/not running/i.test(msg)) {
    console.log("PostgreSQL memang tidak sedang berjalan.");
  } else {
    console.error(msg.trim());
    process.exit(1);
  }
}
