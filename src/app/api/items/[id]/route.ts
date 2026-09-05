/**
 * API: /api/items/[id] — Detail Master Barang (PRD 3.2)
 * GET    : detail barang
 * PUT    : ubah barang
 * DELETE : hapus barang (transaksi terkait ikut terhapus via onDelete: Cascade)
 */
import { db } from "@/lib/db";
import { handle, jsonError, jsonOk, readJson } from "@/lib/api-response";
import { validateItemInput, validationErrorResponse } from "@/lib/api-validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const item = await db.item.findUnique({ where: { id } });
    if (!item) return jsonError("Barang tidak ditemukan", 404);
    return jsonOk(item);
  });
}

export async function PUT(request: Request, { params }: Ctx): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const body = await readJson(request);
    if (!body) return jsonError("Body JSON tidak valid");

    const { errors, value } = validateItemInput(body);
    if (!value) return validationErrorResponse(errors);

    const existing = await db.item.findUnique({ where: { id } });
    if (!existing) return jsonError("Barang tidak ditemukan", 404);

    try {
      const item = await db.item.update({ where: { id }, data: value });
      return jsonOk(item);
    } catch (err) {
      if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
        return jsonError(`SKU "${value.sku}" sudah digunakan barang lain`, 409);
      }
      throw err;
    }
  });
}

export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const existing = await db.item.findUnique({ where: { id } });
    if (!existing) return jsonError("Barang tidak ditemukan", 404);

    await db.item.delete({ where: { id } });
    return jsonOk({ ok: true });
  });
}
