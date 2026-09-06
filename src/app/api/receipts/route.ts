/**
 * API: /api/receipts — Template & Generator Resi Pengiriman (PRD 3.1)
 * GET  : daftar resi + pencarian & paginasi:
 *        ?q=      cari di nomor resi, HP, provinsi, kota, kecamatan, desa,
 *                 alamat detail, ekspedisi, nama toko/pengirim, telp pengirim
 *        ?limit=  jumlah data per halaman (default 100, maks 500)
 *        ?offset= lewati N data pertama (default 0)
 * POST : simpan resi ke database. Nomor resi auto-generated jika tidak dikirim
 *        (format: RSI-YYYYMMDD-XXXX, unik).
 */
import { db } from "@/lib/db";
import { handle, jsonError, jsonOk, readJson } from "@/lib/api-response";
import { validateReceiptInput, validationErrorResponse } from "@/lib/api-validation";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const rawLimit = Number(searchParams.get("limit"));
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 100, 1), 500);
    const rawOffset = Number(searchParams.get("offset"));
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

    const receipts = await db.receipt.findMany({
      where: q
        ? {
            OR: [
              { receiptNumber: { contains: q, mode: "insensitive" } },
              { phoneNumber: { contains: q, mode: "insensitive" } },
              { province: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { district: { contains: q, mode: "insensitive" } },
              { village: { contains: q, mode: "insensitive" } },
              { detailAddress: { contains: q, mode: "insensitive" } },
              { courierName: { contains: q, mode: "insensitive" } },
              { storeName: { contains: q, mode: "insensitive" } },
              { senderName: { contains: q, mode: "insensitive" } },
              { senderPhone: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    return jsonOk(receipts);
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return jsonError("Body JSON tidak valid");

    const { errors, value } = validateReceiptInput(body);
    if (!value) return validationErrorResponse(errors);

    // Snapshot pengirim (opsional) & ID wilayah agar resi bisa dimuat ulang ke form
    const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const data = {
      ...value,
      storeName: optStr(body.storeName),
      senderName: optStr(body.senderName),
      senderPhone: optStr(body.senderPhone),
      senderAddress: optStr(body.senderAddress),
      provinceId: optStr(body.provinceId),
      cityId: optStr(body.cityId),
      districtId: optStr(body.districtId),
      villageId: optStr(body.villageId),
    };

    // Nomor resi: pakai input manual jika ada, jika tidak auto-generate.
    const manual = optStr(body.receiptNumber);
    if (manual) {
      try {
        const receipt = await db.receipt.create({ data: { ...data, receiptNumber: manual } });
        return jsonOk(receipt, 201);
      } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
          return jsonError(`Nomor resi "${manual}" sudah digunakan`, 409);
        }
        throw err;
      }
    }

    // Auto-generate: RSI-YYYYMMDD-NNNN dengan retry bila terjadi tabrakan unik.
    const dayPrefix = `RSI-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const countToday = await db.receipt.count({
        where: { receiptNumber: { startsWith: dayPrefix } },
      });
      const receiptNumber = `${dayPrefix}-${String(countToday + 1).padStart(4, "0")}`;
      try {
        const receipt = await db.receipt.create({ data: { ...data, receiptNumber } });
        return jsonOk(receipt, 201);
      } catch (err) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err.code === "P2002" || err.code === "P2034")
        ) {
          continue; // tabrakan nomor (request bersamaan) — coba nomor berikutnya
        }
        throw err;
      }
    }
    return jsonError("Gagal menghasilkan nomor resi unik, coba lagi", 500);
  });
}
