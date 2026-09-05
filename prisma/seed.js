/**
 * Seed data demo ke database (sekali jalankan):
 *   node prisma/seed.js
 * Idempoten: item dengan SKU yang sama tidak akan diduplikasi.
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const DEMO_ITEMS = [
  { sku: "TSHIRT-BLK-M", name: "Kaos Polos Hitam size M", unit: "pcs", stock: 48 },
  { sku: "TUMBLER-350", name: "Tumbler Stainless 350ml", unit: "pcs", stock: 12 },
  { sku: "SNACK-BAL-250", name: "Keripik Balado 250gr", unit: "pack", stock: 4 },
  { sku: "TOTE-CNV-01", name: "Totebag Kanvas", unit: "pcs", stock: 25 },
];

async function main() {
  for (const d of DEMO_ITEMS) {
    const existing = await db.item.findUnique({ where: { sku: d.sku } });
    if (existing) continue;
    const item = await db.item.create({ data: d });

    if (d.sku === "TUMBLER-350") {
      await db.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: "IN",
          quantity: 24,
          notes: "Restock dari Supplier A",
          sku: item.sku,
          itemName: item.name,
          unit: item.unit,
        },
      });
    }
    if (d.sku === "TSHIRT-BLK-M") {
      await db.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: "OUT",
          quantity: 2,
          notes: "Dikirim via Resi #RSI-DEMO-0001",
          sku: item.sku,
          itemName: item.name,
          unit: item.unit,
        },
      });
    }
  }
  console.log("Seed selesai: 4 item demo + 2 transaksi contoh.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
