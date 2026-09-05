/**
 * API: /api/receipts/[id] — Detail Resi (PRD 3.1, riwayat resi: Edit/Hapus)
 * GET    : detail resi
 * PUT    : ubah resi (fitur edit riwayat resi)
 * DELETE : hapus resi
 */
import { db } from "@/lib/db";
import { handle, jsonError, jsonOk, readJson } from "@/lib/api-response";
import { validateReceiptInput, validationErrorResponse } from "@/lib/api-validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const receipt = await db.receipt.findUnique({ where: { id } });
    if (!receipt) return jsonError("Resi tidak ditemukan", 404);
    return jsonOk(receipt);
  });
}

export async function PUT(request: Request, { params }: Ctx): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return jsonError("Body JSON tidak valid");

    const { errors, value } = validateReceiptInput(body);
    if (!value) return validationErrorResponse(errors);

    const existing = await db.receipt.findUnique({ where: { id } });
    if (!existing) return jsonError("Resi tidak ditemukan", 404);

    const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

    try {
      const receipt = await db.receipt.update({
        where: { id },
        data: {
          ...value,
          storeName: optStr(body.storeName),
          senderName: optStr(body.senderName),
          senderPhone: optStr(body.senderPhone),
          senderAddress: optStr(body.senderAddress),
          provinceId: optStr(body.provinceId),
          cityId: optStr(body.cityId),
          districtId: optStr(body.districtId),
          villageId: optStr(body.villageId),
        },
      });
      return jsonOk(receipt);
    } catch (err) {
      if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
        return jsonError(`Nomor resi sudah digunakan resi lain`, 409);
      }
      throw err;
    }
  });
}

export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const existing = await db.receipt.findUnique({ where: { id } });
    if (!existing) return jsonError("Resi tidak ditemukan", 404);

    await db.receipt.delete({ where: { id } });
    return jsonOk({ ok: true });
  });
}
