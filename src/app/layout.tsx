import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResiKu — Inventory & Shipping Label App",
  description:
    "Aplikasi pencatat barang & generator resi pengiriman Indonesia: buat, cetak, dan unduh label resi PDF, kelola stok masuk/keluar, serta export rekap laporan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
