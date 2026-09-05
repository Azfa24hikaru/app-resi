"use client";

import { useState } from "react";
import { Badge, Button, FieldError, Input, Label, Modal } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { createItem, deleteItem, updateItem, type Item } from "@/lib/api-client";

interface Props {
  items: Item[];
  onChanged: () => void;
}

interface FormState {
  id?: string;
  sku: string;
  name: string;
  unit: string;
  stock: string;
}

const EMPTY_FORM: FormState = { sku: "", name: "", unit: "pcs", stock: "0" };

export default function ItemsSection({ items, onChanged }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  }

  function openEdit(item: Item) {
    setForm({ id: item.id, sku: item.sku, name: item.name, unit: item.unit, stock: String(item.stock) });
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { sku: form.sku, name: form.name, unit: form.unit, stock: Number(form.stock) };
      if (form.id) await updateItem(form.id, payload);
      else await createItem(payload);
      setModalOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteItem(confirmDelete.id);
      setConfirmDelete(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus barang");
      setConfirmDelete(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Master Data Barang</h2>
          <p className="mt-0.5 text-sm text-slate-500">Kelola daftar item: SKU, nama, stok saat ini, dan satuan.</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah Barang
        </Button>
      </div>

      {error && !modalOpen ? (
        <p className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700">Belum ada barang</p>
          <p className="mt-1 text-xs text-slate-500">Tambahkan item pertama Anda untuk mulai mencatat stok.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">SKU</th>
                <th className="px-5 py-3 font-semibold">Nama Barang</th>
                <th className="px-5 py-3 font-semibold">Stok Saat Ini</th>
                <th className="px-5 py-3 font-semibold">Diperbarui</th>
                <th className="px-5 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3"><Badge tone="slate">{item.sku}</Badge></td>
                  <td className="px-5 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-5 py-3">
                    <span className={`font-bold ${item.stock <= 5 ? "text-rose-600" : "text-emerald-600"}`}>{item.stock}</span>{" "}
                    <span className="text-slate-400">{item.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(item.updatedAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" className="!min-h-9 !px-3 !py-1.5 text-xs" onClick={() => openEdit(item)}>
                        Ubah
                      </Button>
                      <Button
                        variant="ghost"
                        className="!min-h-9 !px-3 !py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => setConfirmDelete(item)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal tambah/ubah */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Ubah Barang" : "Tambah Barang"}>
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="Contoh: TSHIRT-BLK-M" />
          </div>
          <div>
            <Label htmlFor="name">Nama Barang</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Contoh: Kaos Polos Hitam size M" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Stok Awal</Label>
              <Input id="stock" type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="unit">Satuan</Label>
              <Input id="unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="pcs / box / pack" />
            </div>
          </div>
          <FieldError>{error}</FieldError>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </div>
        </form>
      </Modal>

      {/* Konfirmasi hapus */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Hapus Barang">
        <p className="text-sm text-slate-600">
          Yakin ingin menghapus <strong>{confirmDelete?.name}</strong> ({confirmDelete?.sku})? Riwayat transaksi barang ini juga akan terhapus.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Batal</Button>
          <Button variant="danger" onClick={handleDelete}>Hapus</Button>
        </div>
      </Modal>

    </div>
  );
}
