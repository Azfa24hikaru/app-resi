/**
 * API: /api/dropships — Daftar Dropship (nama + no HP)
 * GET  : daftar dropship (urut nama)
 * POST : tambah dropship { name, phone }
 */
import { db } from "@/lib/db";
import { handle, jsonError, jsonOk, readJson } from "@/lib/api-response";
import { isValidIndonesianPhone, normalizePhone } from "@/lib/api-validation";

export const MAX_DROPSHIPS = 10;

export async function GET(): Promise<Response> {
  return handle(async () => {
    const dropships = await db.dropship.findMany({ orderBy: { name: "asc" } });
    return jsonOk(dropships);
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
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

    const count = await db.dropship.count();
    if (count >= MAX_DROPSHIPS) return jsonError(`Maksimal ${MAX_DROPSHIPS} data dropship`, 422);

    const dropship = await db.dropship.create({
      data: { name, phone: normalizePhone(phone) },
    });
    return jsonOk(dropship, 201);
  });
}
