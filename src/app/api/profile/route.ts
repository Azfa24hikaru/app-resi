/**
 * API: /api/profile — Profil Pengirim/Toko (dipakai otomatis saat membuat resi)
 * GET : profil (dibuat baris default bila belum ada)
 * PUT : simpan profil
 */
import { db } from "@/lib/db";
import { handle, jsonError, jsonOk, readJson } from "@/lib/api-response";
import { isValidIndonesianPhone } from "@/lib/api-validation";

const PROFILE_ID = "default";

export async function GET(): Promise<Response> {
  return handle(async () => {
    const profile = await db.profile.upsert({
      where: { id: PROFILE_ID },
      update: {},
      create: { id: PROFILE_ID },
    });
    return jsonOk(profile);
  });
}

export async function PUT(request: Request): Promise<Response> {
  return handle(async () => {
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return jsonError("Body JSON tidak valid");

    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const storeName = str(body.storeName);
    const senderName = str(body.senderName);
    const phone = str(body.phone);
    const address = str(body.address);

    const errors: Record<string, string> = {};
    if (!storeName) errors.storeName = "Nama toko wajib diisi";
    if (!senderName) errors.senderName = "Nama pengirim wajib diisi";
    if (!phone) errors.phone = "Nomor telepon wajib diisi";
    else if (!isValidIndonesianPhone(phone)) errors.phone = "Nomor HP tidak valid (format Indonesia: 08xx / +628xx)";
    if (!address) errors.address = "Alamat wajib diisi";
    if (Object.keys(errors).length > 0) {
      return Response.json({ error: Object.values(errors)[0], errors }, { status: 422 });
    }

    const profile = await db.profile.upsert({
      where: { id: PROFILE_ID },
      update: { storeName, senderName, phone, address },
      create: { id: PROFILE_ID, storeName, senderName, phone, address },
    });
    return jsonOk(profile);
  });
}
