/**
 * Validasi input sesuai PRD resi.md §3.1 & §3.2.
 * Dipakai bersama oleh route handler backend.
 */
import type { TransactionType } from "@prisma/client";

/** Validasi format nomor HP Indonesia (PRD 3.1): 08xx / +62 / 62, 9–15 digit. */
export function isValidIndonesianPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, "");
  return /^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(normalized);
}

/** Normalisasi nomor HP ke awalan 0 (untuk disimpan konsisten). */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, "").replace(/^\+?62/, "0");
}

export interface ValidationErrors {
  [field: string]: string;
}

export function validateItemInput(input: {
  sku?: unknown;
  name?: unknown;
  unit?: unknown;
  stock?: unknown;
}): { errors: ValidationErrors; value?: { sku: string; name: string; unit: string; stock: number } } {
  const errors: ValidationErrors = {};
  const sku = typeof input.sku === "string" ? input.sku.trim().toUpperCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  const stock = typeof input.stock === "number" ? Math.round(input.stock) : NaN;

  if (!sku) errors.sku = "SKU wajib diisi";
  else if (sku.length > 50) errors.sku = "SKU maksimal 50 karakter";
  if (!name) errors.name = "Nama barang wajib diisi";
  else if (name.length > 120) errors.name = "Nama barang maksimal 120 karakter";
  if (!unit) errors.unit = "Satuan wajib diisi";
  else if (unit.length > 20) errors.unit = "Satuan maksimal 20 karakter";
  if (!Number.isFinite(stock) || stock < 0) errors.stock = "Stok tidak valid";

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, value: { sku, name, unit, stock } };
}

export function validateTransactionInput(input: {
  itemId?: unknown;
  type?: unknown;
  quantity?: unknown;
  notes?: unknown;
}): { errors: ValidationErrors; value?: { itemId: string; type: TransactionType; quantity: number; notes?: string } } {
  const errors: ValidationErrors = {};
  const itemId = typeof input.itemId === "string" ? input.itemId.trim() : "";
  const type = input.type;
  const quantity = typeof input.quantity === "number" ? Math.floor(input.quantity) : NaN;
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (!itemId) errors.itemId = "Barang wajib dipilih";
  if (type !== "IN" && type !== "OUT") errors.type = "Tipe transaksi harus IN atau OUT";
  const txType: TransactionType = type === "IN" ? "IN" : "OUT";
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = "Jumlah harus berupa angka lebih dari 0";
  else if (quantity > 1_000_000) errors.quantity = "Jumlah terlalu besar";
  if (notes.length > 255) errors.notes = "Catatan maksimal 255 karakter";

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, value: { itemId, type: txType, quantity, notes: notes || undefined } };
}

export interface ValidatedReceipt {
  recipientName: string;
  phoneNumber: string;
  province: string;
  city: string;
  district: string;
  village: string;
  detailAddress: string;
  courierName: string;
}

export function validateReceiptInput(input: {
  recipientName?: unknown;
  phoneNumber?: unknown;
  province?: unknown;
  city?: unknown;
  district?: unknown;
  village?: unknown;
  detailAddress?: unknown;
  courierName?: unknown;
}): { errors: ValidationErrors; value?: ValidatedReceipt } {
  const errors: ValidationErrors = {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const recipientName = str(input.recipientName);
  const phoneNumber = str(input.phoneNumber);
  const province = str(input.province);
  const city = str(input.city);
  const district = str(input.district);
  const village = str(input.village);
  const detailAddress = str(input.detailAddress);
  const courierName = str(input.courierName);

  if (!recipientName) errors.recipientName = "Nama penerima wajib diisi";
  else if (recipientName.length > 120) errors.recipientName = "Nama penerima maksimal 120 karakter";
  if (!isValidIndonesianPhone(phoneNumber)) errors.phoneNumber = "Nomor HP tidak valid (format Indonesia: 08xx / +628xx)";
  if (!province) errors.province = "Provinsi wajib dipilih";
  if (!city) errors.city = "Kota/Kabupaten wajib dipilih";
  if (!district) errors.district = "Kecamatan wajib dipilih";
  if (!village) errors.village = "Desa/Kelurahan wajib dipilih";
  if (!detailAddress) errors.detailAddress = "Detail alamat wajib diisi";
  else if (detailAddress.length > 500) errors.detailAddress = "Detail alamat maksimal 500 karakter";
  if (!courierName) errors.courierName = "Ekspedisi wajib dipilih";

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      recipientName,
      phoneNumber: normalizePhone(phoneNumber),
      province,
      city,
      district,
      village,
      detailAddress,
      courierName,
    },
  };
}

export function validationErrorResponse(errors: ValidationErrors): Response {
  const first = Object.values(errors)[0];
  return Response.json({ error: first, errors }, { status: 422 });
}
