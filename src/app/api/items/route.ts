/**
 * API: /api/items — Master Data Barang (PRD 3.2)
 * GET  : daftar barang (opsional ?q= pencarian SKU/nama)
 * POST : tambah barang baru
 */
import { db } from "@/lib/db";
import { handle, jsonError, jsonOk, readJson } from "@/lib/api-response";
import { validateItemInput, validationErrorResponse } from "@/lib/api-validation";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const items = await db.item.findMany({
      where: q
        ? {
            OR: [{ sku: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(items);
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const body = await readJson(request);
    if (!body) return jsonError("Body JSON tidak valid");

    const { errors, value } = validateItemInput(body);
    if (!value) return validationErrorResponse(errors);

    try {
      const item = await db.item.create({ data: value });
      return jsonOk(item, 201);
    } catch (err) {
      // P2352 / P2002: unique constraint violation pada sku
      if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
        return jsonError(`SKU "${value.sku}" sudah digunakan barang lain`, 409);
      }
      throw err;
    }
  });
}
