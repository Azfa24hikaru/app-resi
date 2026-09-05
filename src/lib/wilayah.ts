/**
 * Data wilayah Indonesia (Provinsi → Kota/Kabupaten → Kecamatan → Desa/Kelurahan)
 * Sumber: wilayah.id (https://wilayah.id) — statis & gratis, tanpa API key.
 * Memuat 38 provinsi termasuk hasil pemekaran Papua 2022
 * (Papua Selatan, Papua Tengah, Papua Pegunungan, Papua Barat Daya).
 * Caching: in-memory + localStorage agar pemanggilan berulang < 300ms (PRD 6.2).
 */

// Lewat proxy Next.js (/api/wilayah → wilayah.id) karena API wilayah.id
// tidak mengirim header Access-Control-Allow-Origin (CORS).
const BASE = "/api/wilayah";
/** Naikkan versi ini bila sumber data berubah agar cache lama di browser dibuang. */
const CACHE_VERSION = "v2";

export interface Region {
  id: string;
  name: string;
}

const memCache = new Map<string, Region[]>();

interface RawRegion {
  id?: string;
  code?: string;
  name: string;
}

/** wilayah.id mengembalikan { data: [{ code, name }] }; normalisasi ke Region[]. */
function normalize(raw: unknown): Region[] {
  const list: RawRegion[] = Array.isArray(raw)
    ? (raw as RawRegion[])
    : (raw as { data?: RawRegion[] }).data ?? [];
  return list.map((r) => ({ id: String(r.code ?? r.id), name: r.name }));
}

function readBrowserCache(path: string): Region[] | null {
  try {
    const raw = window.localStorage.getItem(`wilayah:${CACHE_VERSION}:${path}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Region[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeBrowserCache(path: string, data: Region[]): void {
  try {
    window.localStorage.setItem(`wilayah:${CACHE_VERSION}:${path}`, JSON.stringify(data));
  } catch {
    // Kuota penuh — cache browser dilewati, in-memory tetap aktif.
  }
}

async function fetchRegions(path: string): Promise<Region[]> {
  const cached = memCache.get(path) ?? readBrowserCache(path);
  if (cached) {
    memCache.set(path, cached);
    return cached;
  }

  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat data wilayah (${res.status}). Periksa koneksi internet Anda.`);
  }
  const data = normalize(await res.json());
  memCache.set(path, data);
  writeBrowserCache(path, data);
  return data;
}

export function getProvinces(): Promise<Region[]> {
  return fetchRegions("provinces.json");
}

export function getRegencies(provinceId: string): Promise<Region[]> {
  return fetchRegions(`regencies/${provinceId}.json`);
}

export function getDistricts(regencyId: string): Promise<Region[]> {
  return fetchRegions(`districts/${regencyId}.json`);
}

export function getVillages(districtId: string): Promise<Region[]> {
  return fetchRegions(`villages/${districtId}.json`);
}
