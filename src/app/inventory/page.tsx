"use client";

import { useCallback, useEffect, useState } from "react";
import HistorySection from "@/components/inventory/HistorySection";
import ItemsSection from "@/components/inventory/ItemsSection";
import RecordSection from "@/components/inventory/RecordSection";
import { getItems, getTransactions, type InventoryTransaction, type Item } from "@/lib/api-client";

type Tab = "items" | "record" | "history";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "items", label: "Master Barang" },
  { id: "record", label: "Catat Transaksi" },
  { id: "history", label: "Riwayat & Export" },
];

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [it, tx] = await Promise.all([getItems(), getTransactions({ limit: 500 })]);
      setItems(it);
      setTransactions(tx.transactions);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!ready) return <p className="py-20 text-center text-sm text-slate-500">Memuat data inventory…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pencatat barang masuk/keluar dengan pembaruan stok otomatis dan export rekap laporan.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          Gagal memuat data dari server: {loadError}
        </div>
      ) : null}

      {/* Tab nav */}
      <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist" aria-label="Bagian inventory">
        <div className="grid grid-cols-3 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "items" ? <ItemsSection items={items} onChanged={refresh} /> : null}
      {tab === "record" ? <RecordSection items={items} onChanged={refresh} /> : null}
      {tab === "history" ? <HistorySection transactions={transactions} /> : null}
    </div>
  );
}
