"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, CardHeader, FieldError, Input, Label, Textarea } from "@/components/ui";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { getProfile, saveProfile } from "@/lib/api-client";

export default function ProfilePage() {
  const [storeName, setStoreName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (cancelled) return;
        setStoreName(p.storeName);
        setSenderName(p.senderName);
        setPhone(p.phone);
        setAddress(p.address);
      })
      .catch(() => {
        // Server belum siap — pengguna bisa mengisi dan menyimpan manual.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!storeName.trim() && !senderName.trim()) {
      err.name = "Isi minimal salah satu: nama toko atau nama pengirim";
    }
    if (phone.trim() && !isValidPhone(phone)) {
      err.phone = "Nomor HP tidak valid. Contoh: 0812-3456-7890";
    }
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setSaving(true);
    try {
      await saveProfile({ storeName, senderName, phone, address });
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 3000);
    } catch (e2) {
      setErrors({ name: e2 instanceof Error ? e2.message : "Gagal menyimpan profil" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profil Pengirim</h1>
        <p className="mt-1 text-sm text-slate-500">
          Data ini otomatis tercetak pada bagian “DARI” di setiap label resi yang Anda buat.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader
            title="Data Toko / Pengirim"
            desc="Tersimpan di database aplikasi (PostgreSQL) dan otomatis dipakai saat membuat resi."
          />
          <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="storeName">Nama Toko</Label>
                <Input
                  id="storeName"
                  placeholder="Contoh: Toko Berkah Jaya"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="senderName">Nama Pengirim</Label>
                <Input
                  id="senderName"
                  placeholder="Contoh: Budi Santoso"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
            </div>
            <FieldError>{errors.name}</FieldError>

            <div className="sm:max-w-xs">
              <Label htmlFor="senderPhone">No. Telepon Pengirim</Label>
              <Input
                id="senderPhone"
                type="tel"
                inputMode="tel"
                placeholder="0812-3456-7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!errors.phone}
                className={errors.phone ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}
              />
              <FieldError>{errors.phone}</FieldError>
            </div>

            <div>
              <Label htmlFor="senderAddress">Alamat Pengirim (alamat toko)</Label>
              <Textarea
                id="senderAddress"
                placeholder="Contoh: Jl. Sudirman No. 10, Medan, Sumatera Utara"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Profil"}</Button>
              {justSaved ? (
                <Badge tone="emerald">✓ Tersimpan — otomatis dipakai resi berikutnya</Badge>
              ) : null}
            </div>
          </form>
        </Card>

        {/* Pratinjau posisi pengirim di label */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Posisi di Label Resi</h2>
          <div className="mx-auto w-full max-w-[380px] rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 shadow-sm">
            <p className="text-center text-lg font-black tracking-wide text-slate-900">EKSPEDISI</p>
            <p className="text-center text-[10px] font-medium tracking-widest text-slate-500">LABEL PENGIRIMAN</p>
            <div className="my-2 border-t-2 border-slate-800" />

            <div className="border-t border-slate-200 pt-2">
              <p className="text-[10px] font-bold tracking-wider text-slate-500">DARI:</p>
              <p className="text-xs font-semibold text-slate-900">
                {[storeName, senderName].filter(Boolean).join(" — ") || <span className="font-normal text-slate-400">Belum diisi</span>}
              </p>
              {phone ? <p className="text-[11px] text-slate-600">Telp: {normalizePhone(phone)}</p> : null}
              {address ? <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{address}</p> : null}
            </div>

            <div className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-400">
              Bagian ini muncul di atas data penerima pada setiap label resi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}