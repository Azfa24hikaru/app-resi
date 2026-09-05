#!/bin/sh
# ============================================================
# Entry point container ResiKu.
# Validasi environment wajib sebelum server Next.js start,
# sehingga salah konfigurasi terlihat langsung (fail-fast).
# ============================================================
set -e

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "ERROR: Environment variable DATABASE_URL tidak diset." >&2
  echo "" >&2
  echo "Contoh menjalankan container:" >&2
  echo '  docker run -p 3000:3000 -e DATABASE_URL="postgresql://user:pass@host:5432/resiku?schema=public" resiku' >&2
  echo "" >&2
  echo "Atau gunakan: docker compose up" >&2
  exit 1
fi

echo "DATABASE_URL terbaca: ${DATABASE_URL%%\?*}..." >&2
exec "$@"
