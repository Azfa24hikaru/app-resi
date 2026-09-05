"use client";

import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, Input, Label, Select } from "@/components/ui";
import { formatDateTime, formatPeriodLabel, toDateInputValue } from "@/lib/format";
import { computeStats, downloadCsv, downloadRekapPdf, filterTransactions } from "@/lib/pdf-report";
import type { InventoryTransaction, TransactionType } from "@/lib/types";

interface Props {
  transactions: InventoryTransaction[];
}

export default function HistorySection({ transactions }: Props) {
  const firstDay = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  }, []);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(toDateInputValue(new Date()));
  const [type, setType] = useState<TransactionType | "">("");
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(
    () => filterTransactions(transactions, { from, to, type, keyword }),
    [transactions, from, to, type, keyword],
  );
  const stats = useMemo(() => computeStats(filtered), [filtered]);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Filter Riwayat</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="from">Dari Tanggal</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">Sampai Tanggal</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="type">Jenis Transaksi</Label>
            <Select id="type" value={type} onChange={(e) => setType(e.target.value as TransactionType | "")}>
              <option value="">Semua</option>
              <option value="IN">Masuk</option>
              <option value="OUT">Keluar</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="keyword">Cari SKU / Nama</Label>
            <Input id="keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Contoh: TSHIRT" />
          </div>
        </div>
      </div>

      {/* Ringkasan statistik */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">Total Masuk</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">+{stats.totalIn}</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-xs font-medium text-rose-700">Total Keluar</p>
          <p className="mt-1 text-xl font-bold text-rose-700">−{stats.totalOut}</p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-xs font-medium text-indigo-700">Net Movement</p>
          <p className="mt-1 text-xl font-bold text-indigo-700">{stats.net >= 0 ? "+" : ""}{stats.net}</p>
        </div>
      </div>

      {/* Tabel riwayat + export */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Riwayat Transaksi</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {filtered.length} transaksi · Periode {formatPeriodLabel(from, to)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="!min-h-10 !px-3.5 text-xs"
              onClick={() =>
                downloadRekapPdf({
                  transactions: filtered,
                  periodLabel: formatPeriodLabel(from, to),
                  stats,
                })
              }
              disabled={filtered.length === 0}
            >
              Export Rekap PDF
            </Button>
            <Button
              variant="secondary"
              className="!min-h-10 !px-3.5 text-xs"
              onClick={() => downloadCsv(`rekap-stok-${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
              disabled={filtered.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada transaksi"
            desc="Coba ubah filter tanggal, jenis transaksi, atau kata kunci pencarian."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 font-semibold">SKU</th>
                  <th className="px-5 py-3 font-semibold">Nama Barang</th>
                  <th className="px-5 py-3 font-semibold">Tipe</th>
                  <th className="px-5 py-3 text-right font-semibold">Jumlah</th>
                  <th className="px-5 py-3 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDateTime(t.createdAt)}</td>
                    <td className="px-5 py-3"><Badge tone="slate">{t.sku}</Badge></td>
                    <td className="px-5 py-3 font-medium text-slate-800">{t.itemName}</td>
                    <td className="px-5 py-3">
                      <Badge tone={t.type === "IN" ? "emerald" : "rose"}>{t.type === "IN" ? "Masuk" : "Keluar"}</Badge>
                    </td>
                    <td className={`whitespace-nowrap px-5 py-3 text-right font-bold ${t.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                      {t.type === "IN" ? "+" : "−"}
                      {t.quantity} {t.unit}
                    </td>
                    <td className="max-w-[240px] truncate px-5 py-3 text-slate-500" title={t.notes}>{t.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
