/**
 * API Client — pengganti `storage.ts` saat frontend dihubungkan ke backend.
 * Kontrak fungsi sengaja dibuat mirip storage.ts, hanya saja async dan
 * berbicara dengan REST API backend (PRD §1: Next.js API Routes + Prisma).
 *
 * Cara pakai: ganti `import ... from "./storage"` menjadi `from "./api-client"`
 * di komponen frontend, lalu sesuaikan pemanggilan menjadi `await`.
 */

import type { InventoryTransaction, Item, Receipt, SenderProfile, TransactionType } from "./types";

export type { InventoryTransaction, Item, Receipt, SenderProfile, TransactionType };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `Request gagal (${res.status})`);
  }
  return body as T;
}

/* ---------------------------------- Item ---------------------------------- */

export async function getItems(q?: string): Promise<Item[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<Item[]>(`/api/items${query}`);
}

export async function createItem(input: { sku: string; name: string; unit: string; stock: number }): Promise<Item> {
  return request<Item>("/api/items", { method: "POST", body: JSON.stringify(input) });
}

export async function updateItem(id: string, input: { sku: string; name: string; unit: string; stock: number }): Promise<Item> {
  return request<Item>(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteItem(id: string): Promise<void> {
  await request(`/api/items/${id}`, { method: "DELETE" });
}

/* ------------------------ Transaksi (stok masuk/keluar) ------------------------ */

export interface TransactionList {
  transactions: InventoryTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export async function getTransactions(filter?: {
  from?: string;
  to?: string;
  type?: TransactionType;
  q?: string;
  itemId?: string;
  limit?: number;
  offset?: number;
}): Promise<TransactionList> {
  const params = new URLSearchParams();
  if (filter?.from) params.set("from", filter.from);
  if (filter?.to) params.set("to", filter.to);
  if (filter?.type) params.set("type", filter.type);
  if (filter?.q) params.set("q", filter.q);
  if (filter?.itemId) params.set("itemId", filter.itemId);
  if (filter?.limit) params.set("limit", String(filter.limit));
  if (filter?.offset) params.set("offset", String(filter.offset));
  const query = params.toString();
  return request<TransactionList>(`/api/transactions${query ? `?${query}` : ""}`);
}

export async function recordTransaction(input: {
  itemId: string;
  type: TransactionType;
  quantity: number;
  notes?: string;
}): Promise<{ transaction: InventoryTransaction; item: Item }> {
  return request("/api/transactions", { method: "POST", body: JSON.stringify(input) });
}

export interface TransactionStats {
  totalIn: number;
  totalOut: number;
  net: number;
  count: number;
}

export async function getTransactionStats(filter?: { from?: string; to?: string }): Promise<TransactionStats> {
  const params = new URLSearchParams();
  if (filter?.from) params.set("from", filter.from);
  if (filter?.to) params.set("to", filter.to);
  const query = params.toString();
  return request<TransactionStats>(`/api/transactions/stats${query ? `?${query}` : ""}`);
}

/* ---------------------------------- Resi ---------------------------------- */

export type ReceiptInput = Omit<Receipt, "id" | "createdAt">;

export async function getReceipts(q?: string): Promise<Receipt[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<Receipt[]>(`/api/receipts${query}`);
}

export async function saveReceipt(receipt: ReceiptInput): Promise<Receipt> {
  return request<Receipt>("/api/receipts", { method: "POST", body: JSON.stringify(receipt) });
}

export async function updateReceipt(id: string, receipt: ReceiptInput): Promise<Receipt> {
  return request<Receipt>(`/api/receipts/${id}`, { method: "PUT", body: JSON.stringify(receipt) });
}

export async function deleteReceipt(id: string): Promise<void> {
  await request(`/api/receipts/${id}`, { method: "DELETE" });
}

/* --------------------------------- Profil --------------------------------- */

export async function getProfile(): Promise<SenderProfile> {
  const p = await request<SenderProfile & { updatedAt?: string }>("/api/profile");
  return { storeName: p.storeName, senderName: p.senderName, phone: p.phone, address: p.address };
}

export async function saveProfile(profile: SenderProfile): Promise<SenderProfile> {
  const p = await request<SenderProfile>("/api/profile", { method: "PUT", body: JSON.stringify(profile) });
  return { storeName: p.storeName, senderName: p.senderName, phone: p.phone, address: p.address };
}
