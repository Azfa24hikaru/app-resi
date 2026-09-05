"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getItems, getReceipts, getTransactions, type InventoryTransaction, type Item, type Receipt } from "@/lib/api-client";

function StatCard({ label, value, hint, accent, href }: { label: string; value: string; hint?: string; accent: string; href: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 11.625 4.125 11.625h2.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 3 19.5v-6.375Zm6-4.5c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Zm6-3c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V5.625Z" />
        </svg>
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Link>
  );
}

export default function DashboardPage() {
  const [items, setItemsState] = useState<Item[]>([]);
  const [transactions, setTransactionsState] = useState<InventoryTransaction[]>([]);
  const [receipts, setReceiptsState] = useState<Receipt[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getItems(), getTransactions({ limit: 500 }), getReceipts()])
      .then(([it, tx, rc]) => {
        if (cancelled) return;
        setItemsState(it);
        setTransactionsState(tx.transactions);
        setReceiptsState(rc);
        setReady(true);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadError(e.message);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lowStock = items.filter((i) => i.stock <= 5);
  const todayTx = transactions.filter((t) => new Date(t.createdAt).toDateString() === new Date().toDateString());

  if (!ready) return <p className="py-20 text-center text-sm text-slate-500">Memuat data dashboard…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan operasional harian toko Anda.</p>
      </div>

      {loadError ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          Gagal memuat data dari server: {loadError}
        </div>
      ) : null}

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Barang" value={String(items.length)} hint="Item di master data" accent="bg-indigo-600" href="/inventory" />
        <StatCard
          label="Stok Menipis"
          value={String(lowStock.length)}
          hint={lowStock.length ? "Segera restock!" : "Semua aman"}
          accent={lowStock.length ? "bg-amber-500" : "bg-emerald-600"}
          href="/inventory"
        />
        <StatCard label="Transaksi Hari Ini" value={String(todayTx.length)} hint="Masuk & keluar" accent="bg-sky-600" href="/inventory" />
        <StatCard label="Resi Dibuat" value={String(receipts.length)} hint="Total label tersimpan" accent="bg-violet-600" href="/resi" />
      </div>

      {/* Aksi cepat */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/resi" className="group rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-sm transition-shadow hover:shadow-md">
          <h2 className="text-base font-bold">Buat Resi Pengiriman</h2>
          <p className="mt-1 text-sm text-indigo-100">Pilih wilayah &amp; ekspedisi, lalu cetak atau unduh label PDF siap tempel.</p>
          <span className="mt-3 inline-block text-sm font-semibold underline-offset-4 group-hover:underline">Buka form resi →</span>
        </Link>
        <Link href="/inventory" className="group rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-sm transition-shadow hover:shadow-md">
          <h2 className="text-base font-bold">Catat Stok Masuk / Keluar</h2>
          <p className="mt-1 text-sm text-emerald-100">Kelola master barang, transaksi stok, dan export rekap laporan.</p>
          <span className="mt-3 inline-block text-sm font-semibold underline-offset-4 group-hover:underline">Buka inventory →</span>
        </Link>
      </div>

      {/* Transaksi terbaru */}
      <Card>
        <CardHeader title="Transaksi Stok Terbaru" action={<Link href="/inventory" className="text-sm font-semibold text-indigo-600 hover:underline">Lihat semua</Link>} />
        {transactions.length === 0 ? (
          <EmptyState title="Belum ada transaksi" desc="Transaksi stok masuk/keluar akan tampil di sini." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {transactions.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{t.itemName}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(t.createdAt)} · {t.sku}
                  </p>
                </div>
                <Badge tone={t.type === "IN" ? "emerald" : "rose"}>
                  {t.type === "IN" ? "+" : "−"}
                  {t.quantity} {t.unit}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Resi terbaru */}
      <Card>
        <CardHeader title="Resi Terbaru" action={<Link href="/resi" className="text-sm font-semibold text-indigo-600 hover:underline">Buat resi</Link>} />
        {receipts.length === 0 ? (
          <EmptyState title="Belum ada resi" desc="Resi yang Anda buat akan tersimpan dan bisa diunduh ulang." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {receipts.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{r.receiptNumber}</p>
                  <p className="truncate text-xs text-slate-500">
                    {r.city}, {r.province} · {r.courierName}
                  </p>
                </div>
                <Badge tone="indigo">{formatDateTime(r.createdAt)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

