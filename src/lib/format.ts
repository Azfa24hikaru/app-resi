/** Normalisasi nomor HP Indonesia ke format 08xxxxxxxxxx */
export function normalizePhone(value: string): string {
  let p = value.replace(/[\s\-().]/g, "");
  if (p.startsWith("+62")) p = "0" + p.slice(3);
  else if (p.startsWith("62")) p = "0" + p.slice(2);
  return p;
}

/** Validasi format nomor HP Indonesia: 08xx dengan panjang 9–13 digit setelah 08 */
export function isValidPhone(value: string): boolean {
  const p = normalizePhone(value);
  return /^08[1-9][0-9]{7,11}$/.test(p);
}

/** Nomor resi otomatis: RSI-YYYYMMDD-XXXX */
export function genReceiptNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RSI-${ymd}-${rand}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
}

export function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatPeriodLabel(from?: string, to?: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" };
  const f = from ? new Date(`${from}T00:00:00`).toLocaleDateString("id-ID", opts) : "Awal";
  const t = to ? new Date(`${to}T23:59:59`).toLocaleDateString("id-ID", opts) : new Date().toLocaleDateString("id-ID", opts);
  return `${f} s/d ${t}`;
}
