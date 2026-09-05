/**
 * Helper response API yang konsisten di semua route.
 * Format sukses: data langsung. Format error: { error: string }.
 */

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonError(error: string, status = 400): Response {
  return Response.json({ error }, { status });
}

/** Bungkus handler agar error tak terduga balik sebagai 500 JSON, bukan crash. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error("[API Error]", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan pada server";
    return jsonError(message, 500);
  }
}

/** Baca & parse body JSON dengan aman. */
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
