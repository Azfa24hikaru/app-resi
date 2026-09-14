"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, CardHeader, EmptyState, FieldError, Input, Label, Modal, Textarea } from "@/components/ui";
import { isValidPhone, normalizePhone } from "@/lib/format";
import {
  createDropship,
  deleteDropship,
  getDropships,
  getProfile,
  saveProfile,
  updateDropship,
  type Dropship,
} from "@/lib/api-client";

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

      <DropshipManager />
    </div>
  );
}

/* ------------------------- Kelola Data Dropship ------------------------- */

function DropshipManager() {
  const [dropships, setDropships] = useState<Dropship[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Dropship | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDropships()
      .then((data) => {
        if (!cancelled) {
          setDropships(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError("Nama dropship wajib diisi");
      return;
    }
    if (!isValidPhone(newPhone)) {
      setFormError("Nomor HP tidak valid. Contoh: 0812-3456-7890");
      return;
    }
    setFormError("");
    setAdding(true);
    try {
      const created = await createDropship({ name: newName.trim(), phone: newPhone.trim() });
      setDropships((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "id")));
      setNewName("");
      setNewPhone("");
    } catch (e2) {
      setFormError(e2 instanceof Error ? e2.message : "Gagal menambah dropship");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(d: Dropship) {
    setEditingId(d.id);
    setEditName(d.name);
    setEditPhone(d.phone);
    setEditError("");
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) {
      setEditError("Nama dropship wajib diisi");
      return;
    }
    if (!isValidPhone(editPhone)) {
      setEditError("Nomor HP tidak valid. Contoh: 0812-3456-7890");
      return;
    }
    setEditError("");
    setSavingEdit(true);
    try {
      const updated = await updateDropship(id, { name: editName.trim(), phone: editPhone.trim() });
      setDropships((prev) =>
        [...prev.map((d) => (d.id === id ? updated : d))].sort((a, b) => a.name.localeCompare(b.name, "id")),
      );
      setEditingId(null);
    } catch (e2) {
      setEditError(e2 instanceof Error ? e2.message : "Gagal menyimpan perubahan");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteDropship(confirmDelete.id);
      setDropships((prev) => prev.filter((d) => d.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e2) {
      setFormError(e2 instanceof Error ? e2.message : "Gagal menghapus dropship");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Data Dropship / Pengirim Tambahan"
          desc="Hanya nama dan nomor HP. Dipilih lewat dropdown pengirim saat membuat resi — nomor HP terisi otomatis."
          action={dropships.length > 0 ? <Badge tone="indigo">{dropships.length}/10 tersimpan</Badge> : undefined}
        />
        <div className="space-y-5 p-5">
          <form onSubmit={handleAdd} noValidate>
            <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
              <div>
                <Label htmlFor="dropName">Nama Dropship</Label>
                <Input
                  id="dropName"
                  placeholder="Contoh: Andi Wijaya"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dropPhone">No. HP</Label>
                <Input
                  id="dropPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="0812-3456-7890"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={adding}>{adding ? "Menambah…" : "+ Tambah"}</Button>
            </div>
            <FieldError>{formError}</FieldError>
          </form>

          <div className="border-t border-slate-100 pt-4">
            {loading ? (
              <p className="py-4 text-center text-sm text-slate-400">Memuat data dropship…</p>
            ) : dropships.length === 0 ? (
              <EmptyState title="Belum ada data dropship" desc="Tambahkan nama dan nomor HP lewat form di atas." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {dropships.map((d) =>
                  editingId === d.id ? (
                    <li key={d.id} className="py-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
                        <Input
                          aria-label="Nama dropship"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                        <Input
                          aria-label="Nomor HP dropship"
                          type="tel"
                          inputMode="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button type="button" disabled={savingEdit} onClick={() => void handleSaveEdit(d.id)}>
                            {savingEdit ? "Menyimpan…" : "Simpan"}
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                            Batal
                          </Button>
                        </div>
                      </div>
                      <FieldError>{editError}</FieldError>
                    </li>
                  ) : (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                        <p className="text-xs text-slate-500">{normalizePhone(d.phone)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => startEdit(d)}>
                          Ubah
                        </Button>
                        <Button type="button" variant="danger" onClick={() => setConfirmDelete(d)}>
                          Hapus
                        </Button>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Hapus Dropship">
        <p className="text-sm text-slate-600">
          Hapus <span className="font-semibold text-slate-900">{confirmDelete?.name}</span> ({confirmDelete ? normalizePhone(confirmDelete.phone) : ""})?
          Resi yang sudah dibuat tidak ikut berubah.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>
            Batal
          </Button>
          <Button type="button" variant="danger" disabled={deleting} onClick={() => void handleDelete()}>
            {deleting ? "Menghapus…" : "Hapus"}
          </Button>
        </div>
      </Modal>
    </>
  );
}