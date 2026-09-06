"use client";

import { useState } from "react";
import { Button, FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { recordTransaction, type Item, type TransactionType } from "@/lib/api-client";

interface Props {
  items: Item[];
  onChanged: () => void;
}

export default function RecordSection({ items, onChanged }: Props) {
  const [type, setType] = useState<TransactionType>("IN");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedItem = items.find((i) => i.id === itemId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await recordTransaction({ itemId, type, quantity: Number(quantity), notes });
      setSuccess(
        type === "IN"
          ? `Berhasil: stok "${selectedItem?.name}" bertambah ${quantity} ${selectedItem?.unit ?? ""}.`
          : `Berhasil: stok "${selectedItem?.name}" berkurang ${quantity} ${selectedItem?.unit ?? ""}.`,
      );
      setQuantity("1");
      setNotes("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Catat Transaksi Stok</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Stok di Master Data Barang diperbarui otomatis setiap transaksi tersimpan.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
        {/* Pilih jenis transaksi */}
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Jenis transaksi">
          {(
            [
              { value: "IN", label: "Stok Masuk", desc: "Barang masuk dari supplier / produksi", classes: "border-emerald-500 bg-emerald-50 text-emerald-700" },
              { value: "OUT", label: "Stok Keluar", desc: "Barang terjual / dikirim", classes: "border-rose-500 bg-rose-50 text-rose-700" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={type === opt.value}
              onClick={() => setType(opt.value)}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                type === opt.value ? opt.classes : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="block text-sm font-bold">{opt.label}</span>
              <span className="mt-0.5 block text-xs opacity-75">{opt.desc}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="item">Barang</Label>
            <Select id="item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">— Pilih Barang —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku} — {i.name} (sisa {i.stock} {i.unit})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="qty">Jumlah ({selectedItem?.unit ?? "satuan"})</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-describedby="stock-hint"
            />
            {selectedItem ? (
              <p id="stock-hint" className="mt-1.5 text-xs text-slate-500">
                Stok saat ini: <strong className="text-slate-700">{selectedItem.stock} {selectedItem.unit}</strong>
                {type === "OUT" && Number(quantity) > selectedItem.stock ? (
                  <span className="ml-1 font-semibold text-rose-600">— melebihi stok!</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Catatan</Label>
          <Textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={type === "IN" ? "Contoh: Restock dari Supplier A" : "Contoh: Dikirim via Resi #RSI-20250101-1234"}
          />
        </div>

        <FieldError>{error}</FieldError>
        {success ? (
          <p className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700" role="status">{success}</p>
        ) : null}

        <Button type="submit" variant={type === "IN" ? "success" : "danger"} disabled={items.length === 0 || submitting}>
          {submitting ? "Menyimpan…" : `Simpan Transaksi ${type === "IN" ? "Masuk" : "Keluar"}`}
        </Button>
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">Tambahkan barang di tab “Master Barang” terlebih dahulu.</p>
        ) : null}
      </form>
    </div>
  );
}
