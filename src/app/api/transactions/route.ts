/**
 * API: /api/transactions — Pencatatan Transaksi Stok (PRD 3.2)
 * GET  : riwayat transaksi + filter (from, to, type, q, itemId) & paginasi
 * POST : catat transaksi + otomasi stok secara atomik (prisma.$transaction):
 *        1. Insert record InventoryTransaction (dengan snapshot barang)
 *        2. Update `stock` pada tabel Item
 *        Untuk OUT, stok diverifikasi di level database agar tidak pernah minus.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { handle, jsonError, jsonOk, readJson } from "@/lib/api-response";
import { validateTransactionInput, validationErrorResponse } from "@/lib/api-validation";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");
    const q = searchParams.get("q")?.trim();
    const itemId = searchParams.get("itemId")?.trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 500);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const where: Prisma.InventoryTransactionWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from && !Number.isNaN(Date.parse(from))) where.createdAt.gte = new Date(from);
      if (to && !Number.isNaN(Date.parse(to))) {
        const end = new Date(to);
        // "to" dengan tanggal saja (YYYY-MM-DD) dibuat inklusif sampai akhir hari
        if (to.length <= 10) end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (type === "IN" || type === "OUT") where.type = type;
    if (itemId) where.itemId = itemId;
    if (q) {
      where.OR = [
        { sku: { contains: q, mode: "insensitive" } },
        { itemName: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const [transactions, total] = await Promise.all([
      db.inventoryTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.inventoryTransaction.count({ where }),
    ]);

    return jsonOk({ transactions, total, limit, offset });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const body = await readJson(request);
    if (!body) return jsonError("Body JSON tidak valid");

    const { errors, value } = validateTransactionInput(body);
    if (!value) return validationErrorResponse(errors);

    try {
      const result = await db.$transaction(async (tx) => {
        const item = await tx.item.findUnique({ where: { id: value.itemId } });
        if (!item) throw new TransactionError("Barang tidak ditemukan", 404);

        // Update stok dengan guard atomik: untuk OUT, where.stock >= quantity
        // menjamin stok tidak pernah minus walau ada request bersamaan.
        const updated = await tx.item.updateMany({
          where:
            value.type === "OUT"
              ? { id: item.id, stock: { gte: value.quantity } }
              : { id: item.id },
          data: { stock: value.type === "OUT" ? { decrement: value.quantity } : { increment: value.quantity } },
        });
        if (updated.count === 0) {
          throw new TransactionError(`Stok tidak cukup. Stok saat ini: ${item.stock} ${item.unit}`, 422);
        }

        const transaction = await tx.inventoryTransaction.create({
          data: {
            itemId: item.id,
            type: value.type,
            quantity: value.quantity,
            notes: value.notes,
            // Snapshot master barang agar riwayat tetap utuh
            sku: item.sku,
            itemName: item.name,
            unit: item.unit,
          },
        });

        const finalItem = await tx.item.findUniqueOrThrow({ where: { id: item.id } });
        return { transaction, item: finalItem };
      });

      return jsonOk(result, 201);
    } catch (err) {
      if (err instanceof TransactionError) return jsonError(err.message, err.status);
      throw err;
    }
  });
}

/** Error internal dengan status HTTP untuk alur transaksi stok. */
class TransactionError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "TransactionError";
  }
}
