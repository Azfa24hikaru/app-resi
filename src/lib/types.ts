export type TransactionType = "IN" | "OUT";

export interface Item {
  id: string;
  sku: string;
  name: string;
  stock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  /** Snapshot agar riwayat tetap utuh walau master barang berubah/dihapus */
  sku: string;
  itemName: string;
  unit: string;
  type: TransactionType;
  quantity: number;
  notes?: string;
  createdAt: string;
}

/** Profil pengirim/toko, dipakai otomatis saat membuat resi. */
export interface SenderProfile {
  storeName: string;
  senderName: string;
  phone: string;
  address: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  phoneNumber: string;
  province: string;
  city: string;
  district: string;
  village: string;
  detailAddress: string;
  courierName: string;
  createdAt: string;
  /* Snapshot pengirim saat resi dibuat (opsional agar resi lama tetap valid) */
  storeName?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  /* ID wilayah agar resi bisa dimuat ulang ke form saat diedit */
  provinceId?: string;
  cityId?: string;
  districtId?: string;
  villageId?: string;
}
