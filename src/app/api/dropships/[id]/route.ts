/**
 * API: /api/dropships/[id] — Detail Dropship
 * PUT    : ubah dropship { name, phone }
 * DELETE : hapus dropship (resi lama tetap utuh karena memakai snapshot nama/telp)
 */
import { db } from "@/lib/db";
import { handle, jsonError, jsonOk, readJson } from "@/lib/api-response";
import { isValidIndonesianPhone, normalizePhone } from "@/lib/api-validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return jsonError("Body JSON tidak valid");

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Nama dropship wajib diisi";
    if (!phone) errors.phone = "Nomor HP wajib diisi";
    else if (!isValidIndonesianPhone(phone)) errors.phone = "Nomor HP tidak valid (format Indonesia: 08xx / +628xx)";
    if (Object.keys(errors).length > 0) {
      return Response.json({ error: Object.values(errors)[0], errors }, { status: 422 });
    }

    const existing = await db.dropship.findUnique({ where: { id } });
    if (!existing) return jsonError("Data dropship tidak ditemukan", 404);

    const dropship = await db.dropship.update({
      where: { id },
      data: { name, phone: normalizePhone(phone) },
    });
    return jsonOk(dropship);
  });
}

export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const existing = await db.dropship.findUnique({ where: { id } });
    if (!existing) return jsonError("Data dropship tidak ditemukan", 404);

    await db.dropship.delete({ where: { id } });
    return jsonOk({ ok: true });
  });
}
