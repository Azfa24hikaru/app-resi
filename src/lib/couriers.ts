export interface Courier {
  code: string;
  name: string;
}

/** Daftar ekspedisi Indonesia sesuai PRD 3.1 */
export const COURIERS: Courier[] = [
  { code: "jne", name: "JNE" },
  { code: "jnt", name: "J&T Express" },
  { code: "sicepat", name: "SiCepat Ekspres" },
  { code: "pos", name: "Pos Indonesia" },
  { code: "shopee", name: "Shopee Xpress (SPX)" },
  { code: "ninja", name: "Ninja Xpress" },
  { code: "anteraja", name: "AnterAja" },
  { code: "jnt_cargo", name: "J&T Cargo" },
  { code: "wahana", name: "Wahana Prestasi Logistik" },
  { code: "lion", name: "Lion Parcel" },
  { code: "idle", name: "ID Express" },
  { code: "rex", name: "REX (Royal Express)" },
];
