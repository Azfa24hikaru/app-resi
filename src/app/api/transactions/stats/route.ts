/**
 * API: /api/transactions/stats — Ringkasan Statistik Rekap (PRD 3.2)
 * GET ?from=&to= → { totalIn, totalOut, net, count }
 * Dipakai untuk bagian "Ringkasan Statistik" pada Export Rekap Laporan Stok.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { handle, jsonOk } from "@/lib/api-response";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.InventoryTransactionWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from && !Number.isNaN(Date.parse(from))) where.createdAt.gte = new Date(from);
      if (to && !Number.isNaN(Date.parse(to))) {
        const end = new Date(to);
        if (to.length <= 10) end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const grouped = await db.inventoryTransaction.groupBy({
      by: ["type"],
      where,
      _sum: { quantity: true },
      _count: { _all: true },
    });

    const totalIn = grouped.find((g) => g.type === "IN")?._sum.quantity ?? 0;
    const totalOut = grouped.find((g) => g.type === "OUT")?._sum.quantity ?? 0;
    const count = grouped.reduce((acc, g) => acc + g._count._all, 0);

    return jsonOk({
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      count,
      from: from ?? null,
      to: to ?? null,
    });
  });
}
