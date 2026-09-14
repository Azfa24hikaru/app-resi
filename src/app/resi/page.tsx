"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardHeader, EmptyState, FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { COURIERS } from "@/lib/couriers";
import { genReceiptNumber, isValidPhone, normalizePhone } from "@/lib/format";
import { downloadBatchReceiptsPdf, downloadReceiptPdf, fullAddress, printBatchReceiptsPdf, printReceiptPdf } from "@/lib/pdf-receipt";
import { deleteReceipt, getDropships, getProfile, getReceipts, saveReceipt, updateReceipt, type Dropship, type Receipt, type ReceiptInput, type SenderProfile } from "@/lib/api-client";
import { getDistricts, getProvinces, getRegencies, getVillages, type Region } from "@/lib/wilayah";

type LoadStage = "" | "prov" | "city" | "dist" | "vill";

const LOADING_TEXT: Record<Exclude<LoadStage, "">, string> = {
  prov: "Memuat daftar provinsi…",
  city: "Memuat daftar kota/kabupaten…",
  dist: "Memuat daftar kecamatan…",
  vill: "Memuat daftar desa/kelurahan…",
};

/** Jumlah resi per halaman riwayat ( sinkron dengan default `limit` API ). */
const PAGE_LIMIT = 100;

export default function ResiPage() {
  const [receiptNumber, setReceiptNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [villageId, setVillageId] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [courier, setCourier] = useState("");

  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [villages, setVillages] = useState<Region[]>([]);
  const [loading, setLoading] = useState<LoadStage>("prov");
  const [wilayahError, setWilayahError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Receipt | null>(null);
  const [receipts, setReceiptsList] = useState<Receipt[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<SenderProfile>({ storeName: "", senderName: "", phone: "", address: "" });
  const [dropships, setDropships] = useState<Dropship[]>([]);
  /* Sumber pengirim: "profile" (toko) atau id dropship */
  const [senderSource, setSenderSource] = useState<string>("profile");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  /* Penanda request riwayat terakhir — respons basi (mis. ketikan cepat) diabaikan */
  const listReqId = useRef(0);

  /* ---------------------- Cascading dropdown wilayah ---------------------- */

  const loadReceipts = useCallback(async (opts: { q: string; offset: number; append: boolean }) => {
    const myId = ++listReqId.current;
    setListLoading(true);
    try {
      const data = await getReceipts({ q: opts.q || undefined, limit: PAGE_LIMIT, offset: opts.offset });
      if (listReqId.current !== myId) return; // respons basi — abaikan
      setReceiptsList((prev) => (opts.append ? [...prev, ...data] : data));
      setHasMore(data.length === PAGE_LIMIT);
      if (!opts.append) {
        // Daftar diganti (search/refresh): buang seleksi batch yg tak lagi tampil
        setSelectedIds((prevSel) => {
          const visible = new Set(data.map((d) => d.id));
          const next = new Set([...prevSel].filter((id) => visible.has(id)));
          return next.size === prevSel.size ? prevSel : next;
        });
      }
    } catch {
      // Gagal memuat riwayat dari server — daftar tetap tampil apa adanya.
    } finally {
      if (listReqId.current === myId) setListLoading(false);
    }
  }, []);

  const refreshList = useCallback(
    () => loadReceipts({ q: appliedQ, offset: 0, append: false }),
    [loadReceipts, appliedQ],
  );

  /* Debounce input pencarian riwayat → query server */
  useEffect(() => {
    const t = window.setTimeout(() => setAppliedQ(searchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setReceiptNumber(genReceiptNumber());
    getProfile()
      .then(setProfile)
      .catch(() => {
        // Server belum siap — pengguna tetap bisa mengisi form.
      });
    getDropships()
      .then(setDropships)
      .catch(() => {
        // Daftar dropship opsional — form tetap bisa dipakai tanpa dropdown dropship.
      });
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    let cancelled = false;
    getProvinces()
      .then((data) => {
        if (!cancelled) {
          setProvinces(data);
          setLoading("");
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setWilayahError(e.message);
          setLoading("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      return;
    }
    setLoading("city");
    getRegencies(provinceId)
      .then((data) => {
        setCities(data);
        setLoading("");
      })
      .catch((e: Error) => {
        setWilayahError(e.message);
        setLoading("");
      });
  }, [provinceId]);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    setLoading("dist");
    getDistricts(cityId)
      .then((data) => {
        setDistricts(data);
        setLoading("");
      })
      .catch((e: Error) => {
        setWilayahError(e.message);
        setLoading("");
      });
  }, [cityId]);

  useEffect(() => {
    if (!districtId) {
      setVillages([]);
      return;
    }
    setLoading("vill");
    getVillages(districtId)
      .then((data) => {
        setVillages(data);
        setLoading("");
      })
      .catch((e: Error) => {
        setWilayahError(e.message);
        setLoading("");
      });
  }, [districtId]);

  const provinceName = provinces.find((p) => p.id === provinceId)?.name ?? "";
  const cityName = cities.find((c) => c.id === cityId)?.name ?? "";
  const districtName = districts.find((d) => d.id === districtId)?.name ?? "";
  const villageName = villages.find((v) => v.id === villageId)?.name ?? "";
  const courierName = COURIERS.find((c) => c.code === courier)?.name ?? "";

  /* Pengirim aktif: profil toko, atau dropship terpilih (nama + telp saja). */
  const selectedDropship = senderSource === "profile" ? null : (dropships.find((d) => d.id === senderSource) ?? null);
  const activeSender: SenderProfile = selectedDropship
    ? { storeName: "", senderName: selectedDropship.name, phone: selectedDropship.phone, address: "" }
    : profile;

  const previewReceipt = useMemo(
    () => ({
      receiptNumber,
      phoneNumber: normalizePhone(phone) || "08xx-xxxx-xxxx",
      province: provinceName,
      city: cityName,
      district: districtName,
      village: villageName,
      detailAddress,
      courierName: courierName || "EKSPEDISI",
      storeName: activeSender.storeName,
      senderName: activeSender.senderName,
      senderPhone: activeSender.phone ? normalizePhone(activeSender.phone) : "",
      senderAddress: activeSender.address,
    }),
    [receiptNumber, phone, provinceName, cityName, districtName, villageName, detailAddress, courierName, activeSender],
  );

  /* ------------------------------ Actions ------------------------------ */

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!isValidPhone(phone)) e.phone = "Nomor HP tidak valid. Contoh: 0812-3456-7890";
    if (!provinceId) e.province = "Pilih provinsi";
    if (!cityId) e.city = "Pilih kota/kabupaten";
    if (!districtId) e.district = "Pilih kecamatan";
    if (!villageId) e.village = "Pilih desa/kelurahan";
    if (detailAddress.trim().length < 10) e.detail = "Alamat detail minimal 10 karakter (nama jalan, no. rumah, RT/RW)";
    if (!courier) e.courier = "Pilih ekspedisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const hasSender = Boolean(activeSender.storeName || activeSender.senderName || activeSender.phone || activeSender.address);

  function buildPayload(): ReceiptInput {
    return {
      receiptNumber,
      phoneNumber: normalizePhone(phone),
      province: provinceName,
      city: cityName,
      district: districtName,
      village: villageName,
      detailAddress: detailAddress.trim(),
      courierName,
      storeName: activeSender.storeName || undefined,
      senderName: activeSender.senderName || undefined,
      senderPhone: activeSender.phone ? normalizePhone(activeSender.phone) : undefined,
      senderAddress: activeSender.address || undefined,
      provinceId,
      cityId,
      districtId,
      villageId,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const receipt = editingId ? await updateReceipt(editingId, payload) : await saveReceipt(payload);
      setSaved(receipt);
      if (editingId) setEditingId(null);
      await refreshList();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal menyimpan resi");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setEditingId(null);
    setSenderSource("profile");
    setPhone("");
    setProvinceId("");
    setCityId("");
    setDistrictId("");
    setVillageId("");
    setDetailAddress("");
    setCourier("");
    setErrors({});
    setSaved(null);
    setReceiptNumber(genReceiptNumber());
  }

  /** Muat resi tersimpan ke form untuk diedit (termasuk pulihkan dropdown wilayah). */
  async function handleEdit(r: Receipt) {
    setEditingId(r.id);
    setReceiptNumber(r.receiptNumber);
    setPhone(r.phoneNumber);
    setDetailAddress(r.detailAddress);
    setCourier(COURIERS.find((c) => c.name === r.courierName)?.code ?? "");
    setErrors({});
    setSaved(null);

    // Pulihkan pilihan wilayah: pakai ID tersimpan, atau cocokkan nama (untuk resi lama).
    let pid = r.provinceId ?? "";
    let cid = r.cityId ?? "";
    let did = r.districtId ?? "";
    let vid = r.villageId ?? "";
    try {
      const provs = await getProvinces();
      if (!pid) pid = provs.find((p) => p.name === r.province)?.id ?? "";
      if (!cid && pid) {
        const regs = await getRegencies(pid);
        cid = regs.find((c) => c.name === r.city)?.id ?? "";
      }
      if (!did && cid) {
        const dists = await getDistricts(cid);
        did = dists.find((d) => d.name === r.district)?.id ?? "";
      }
      if (!vid && did) {
        const vills = await getVillages(did);
        vid = vills.find((v) => v.name === r.village)?.id ?? "";
      }
    } catch {
      // Gagal memuat wilayah — pengguna bisa memilih ulang secara manual.
    }
    setProvinceId(pid);
    setCityId(cid);
    setDistrictId(did);
    setVillageId(vid);
    // Pulihkan pilihan pengirim: cocokkan snapshot nama+telp ke data dropship.
    const dropMatch = dropships.find(
      (d) => d.name === (r.senderName ?? "") && normalizePhone(d.phone) === (r.senderPhone ?? ""),
    );
    setSenderSource(dropMatch ? dropMatch.id : "profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* --------------------- Seleksi batch untuk export PDF --------------------- */

  const selectedReceipts = useMemo(
    () => receipts.filter((r) => selectedIds.has(r.id)),
    [receipts, selectedIds],
  );

  const allSelected = receipts.length > 0 && selectedReceipts.length === receipts.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(receipts.map((r) => r.id)));
  }

  async function handleBatchDownload() {
    if (selectedReceipts.length === 0) return;
    setBatchBusy(true);
    setBatchError("");
    try {
      await downloadBatchReceiptsPdf(selectedReceipts);
    } catch (e: unknown) {
      setBatchError(e instanceof Error ? e.message : "Gagal mengunduh PDF batch");
    } finally {
      setBatchBusy(false);
    }
  }

  async function handleBatchPrint() {
    if (selectedReceipts.length === 0) return;
    setBatchBusy(true);
    setBatchError("");
    try {
      await printBatchReceiptsPdf(selectedReceipts);
    } catch (e: unknown) {
      setBatchError(e instanceof Error ? e.message : "Gagal mencetak PDF batch");
    } finally {
      setBatchBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Resi Pengiriman</h1>
        <p className="mt-1 text-sm text-slate-500">
          Isi data penerima, lalu simpan untuk mencetak atau mengunduh label resi PDF (ukuran thermal 100×150 mm).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ------------------------------- Form ------------------------------- */}
        <Card>
          <CardHeader
            title={editingId ? `Edit Resi ${receiptNumber}` : "Data Pengiriman"}
            desc={editingId ? "Perubahan akan menimpa resi yang ada di riwayat." : "Nomor resi dibuat otomatis dan bisa di-reset kapan saja."}
          />
          <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
            {/* Pengirim — pilih profil toko atau dropship */}
            <div className={`rounded-lg border px-4 py-3 text-sm ${hasSender ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[10px] font-bold tracking-wider text-slate-500">DARI (PENGIRIM)</p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/profile" className="text-xs font-semibold text-indigo-600 hover:underline">
                    Kelola Dropship
                  </Link>
                  <Link href="/profile" className="text-xs font-semibold text-indigo-600 hover:underline">
                    Ubah Profil
                  </Link>
                </div>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-[240px_1fr] sm:items-center">
                <div>
                  <Label htmlFor="senderSource">Pilih pengirim</Label>
                  <Select id="senderSource" value={senderSource} onChange={(e) => setSenderSource(e.target.value)}>
                    <option value="profile">
                      {[profile.storeName, profile.senderName].filter(Boolean).join(" — ") || "Pengirim utama"} (Toko)
                    </option>
                    {dropships.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {normalizePhone(d.phone)}
                      </option>
                    ))}
                  </Select>
                </div>
                {hasSender ? (
                  <div>
                    <p className="font-semibold text-slate-900">
                      {[activeSender.storeName, activeSender.senderName].filter(Boolean).join(" — ")}
                    </p>
                    <p className="text-xs text-slate-600">
                      {[activeSender.phone ? `Telp: ${normalizePhone(activeSender.phone)}` : "", activeSender.address].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800">
                    Belum ada data pengirim — data ini yang tercetak di bagian “DARI” label resi.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="receiptNumber">Nomor Resi / Transaksi</Label>
                <div className="flex gap-2">
                  <Input id="receiptNumber" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value.toUpperCase())} />
                  <Button type="button" variant="secondary" onClick={() => setReceiptNumber(genReceiptNumber())} title="Generate nomor baru">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                    </svg>
                    <span className="hidden sm:inline">Auto</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Nomor HP Penerima</Label>
                <Input
                  id="phone"
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
            </div>

            {/* Wilayah cascading */}
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="mb-1.5 text-sm font-medium text-slate-700">
                Wilayah Penerima <span className="font-normal text-slate-400">(dropdown berantai)</span>
              </legend>

              <div>
                <Label htmlFor="province">Provinsi</Label>
                <Select
                  id="province"
                  value={provinceId}
                  onChange={(e) => {
                    setProvinceId(e.target.value);
                    setCityId("");
                    setDistrictId("");
                    setVillageId("");
                    setErrors((p) => ({ ...p, province: "" }));
                  }}
                  disabled={loading === "prov"}
                  aria-invalid={!!errors.province}
                  className={errors.province ? "border-rose-400" : ""}
                >
                  <option value="">{loading === "prov" ? "Memuat…" : "— Pilih Provinsi —"}</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <FieldError>{errors.province}</FieldError>
              </div>

              <div>
                <Label htmlFor="city">Kota / Kabupaten</Label>
                <Select
                  id="city"
                  value={cityId}
                  onChange={(e) => {
                    setCityId(e.target.value);
                    setDistrictId("");
                    setVillageId("");
                    setErrors((p) => ({ ...p, city: "" }));
                  }}
                  disabled={!provinceId || loading === "city"}
                  aria-invalid={!!errors.city}
                  className={errors.city ? "border-rose-400" : ""}
                >
                  <option value="">{provinceId ? (loading === "city" ? "Memuat…" : "— Pilih Kota/Kabupaten —") : "Pilih provinsi dulu"}</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                <FieldError>{errors.city}</FieldError>
              </div>

              <div>
                <Label htmlFor="district">Kecamatan</Label>
                <Select
                  id="district"
                  value={districtId}
                  onChange={(e) => {
                    setDistrictId(e.target.value);
                    setVillageId("");
                    setErrors((p) => ({ ...p, district: "" }));
                  }}
                  disabled={!cityId || loading === "dist"}
                  aria-invalid={!!errors.district}
                  className={errors.district ? "border-rose-400" : ""}
                >
                  <option value="">{cityId ? (loading === "dist" ? "Memuat…" : "— Pilih Kecamatan —") : "Pilih kota/kabupaten dulu"}</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
                <FieldError>{errors.district}</FieldError>
              </div>

              <div>
                <Label htmlFor="village">Desa / Kelurahan</Label>
                <Select
                  id="village"
                  value={villageId}
                  onChange={(e) => {
                    setVillageId(e.target.value);
                    setErrors((p) => ({ ...p, village: "" }));
                  }}
                  disabled={!districtId || loading === "vill"}
                  aria-invalid={!!errors.village}
                  className={errors.village ? "border-rose-400" : ""}
                >
                  <option value="">{districtId ? (loading === "vill" ? "Memuat…" : "— Pilih Desa/Kelurahan —") : "Pilih kecamatan dulu"}</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </Select>
                <FieldError>{errors.village}</FieldError>
              </div>

            </fieldset>

            {loading ? (
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" aria-hidden="true" />
                {LOADING_TEXT[loading]}
              </p>
            ) : null}
            {wilayahError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{wilayahError}</p> : null}

            <div>
              <Label htmlFor="detail">Detail Alamat (RT/RW, nama jalan, no. rumah, patokan)</Label>
              <Textarea
                id="detail"
                placeholder="Contoh: RT 03 / RW 05, Jl. Melati No. 12, patokan warna hijau di samping masjid"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                aria-invalid={!!errors.detail}
                className={errors.detail ? "border-rose-400" : ""}
              />
              <FieldError>{errors.detail}</FieldError>
            </div>

            <div className="sm:max-w-xs">
              <Label htmlFor="courier">Ekspedisi</Label>
              <Select
                id="courier"
                value={courier}
                onChange={(e) => {
                  setCourier(e.target.value);
                  setErrors((p) => ({ ...p, courier: "" }));
                }}
                aria-invalid={!!errors.courier}
                className={errors.courier ? "border-rose-400" : ""}
              >
                <option value="">— Pilih Ekspedisi —</option>
                {COURIERS.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </Select>
              <FieldError>{errors.courier}</FieldError>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Simpan & Generate Resi"}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={handleReset}>Batal Edit</Button>
              ) : (
                <Button type="button" variant="secondary" onClick={handleReset}>Reset Form</Button>
              )}
            </div>
            {submitError ? (
              <p className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700" role="alert">
                {submitError}
              </p>
            ) : null}
          </form>
        </Card>

        {/* ------------------------- Preview label thermal ------------------------- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Preview Label (100×150 mm)</h2>
            {saved ? <Badge tone="emerald">✓ Tersimpan</Badge> : <Badge tone="slate">Pratinjau langsung</Badge>}
          </div>

          <div
            id="print-area"
            className="mx-auto flex w-full max-w-[380px] flex-col rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 shadow-sm"
            style={{ aspectRatio: "100 / 150" }}
            aria-label="Pratinjau label resi"
          >
            <div className="text-center">
              <p className="text-lg font-black tracking-wide text-slate-900">{(previewReceipt.courierName || "EKSPEDISI").toUpperCase()}</p>
              <p className="text-[10px] font-medium tracking-widest text-slate-500">LABEL PENGIRIMAN</p>
              <div className="my-2 border-t-2 border-slate-800" />
            </div>

            <p className="text-center text-sm font-bold text-slate-900">{previewReceipt.receiptNumber || "—"}</p>
            <div className="mx-auto my-2 flex h-10 items-end gap-[1px]" aria-hidden="true">
              {Array.from({ length: 32 }).map((_, i) => (
                <span
                  key={i}
                  className="inline-block bg-slate-900"
                  style={{ width: `${1 + ((i * 7 + previewReceipt.receiptNumber.length * 3) % 3)}px`, height: "100%" }}
                />
              ))}
            </div>

            {(previewReceipt.storeName || previewReceipt.senderName || previewReceipt.senderPhone || previewReceipt.senderAddress) ? (
              <div className="mt-2 border-t border-slate-200 pt-2">
                <p className="text-[10px] font-bold tracking-wider text-slate-500">DARI:</p>
                <p className="text-xs font-semibold text-slate-900">
                  {[previewReceipt.storeName, previewReceipt.senderName].filter(Boolean).join(" — ")}
                </p>
                {previewReceipt.senderPhone ? <p className="text-[11px] text-slate-600">Telp: {previewReceipt.senderPhone}</p> : null}
                {previewReceipt.senderAddress ? <p className="text-[11px] leading-relaxed text-slate-600">{previewReceipt.senderAddress}</p> : null}
              </div>
            ) : null}

            <div className="mt-2 border-t border-slate-200 pt-2">
              <p className="text-[10px] font-bold tracking-wider text-slate-500">KEPADA:</p>
              <p className="text-sm font-semibold text-slate-900">{previewReceipt.phoneNumber}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-800">
                {fullAddress({
                  detailAddress: previewReceipt.detailAddress || "Alamat detail belum diisi",
                  village: previewReceipt.village,
                  district: previewReceipt.district,
                  city: previewReceipt.city,
                  province: previewReceipt.province,
                })}
              </p>
            </div>

            <p className="mt-auto text-center text-[9px] text-slate-400">
              Dibuat: {saved ? new Date(saved.createdAt).toLocaleString("id-ID") : "belum disimpan"}
            </p>
          </div>

          {saved ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => downloadReceiptPdf(saved)} variant="success">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download PDF Resi
              </Button>
              <Button onClick={() => printReceiptPdf(saved)} variant="primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Z" />
                </svg>
                Cetak Langsung
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500">Simpan resi untuk mengaktifkan tombol unduh &amp; cetak.</p>
          )}
        </div>
      </div>

      {/* ------------------------------ Riwayat resi ------------------------------ */}
      <Card>
        <CardHeader title="Riwayat Resi" desc="Centang resi untuk mengunduh/mencetak beberapa label sekaligus dalam satu file PDF." />
        {/* Pencarian server-side: nomor resi, kota/provinsi, ekspedisi, pengirim */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="min-w-52 flex-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nomor resi, kota, ekspedisi, pengirim…"
              aria-label="Cari riwayat resi"
            />
          </div>
          <p className="text-xs text-slate-500">
            {listLoading ? "Memuat…" : `${receipts.length} resi tampil`}
            {appliedQ ? ` untuk “${appliedQ}”` : ""}
          </p>
        </div>
        {receipts.length === 0 ? (
          appliedQ ? (
            <EmptyState title="Tidak ditemukan" desc={`Tidak ada resi yang cocok dengan “${appliedQ}”.`} />
          ) : (
            <EmptyState title="Belum ada resi tersimpan" desc="Isi form di atas lalu klik “Simpan & Generate Resi”." />
          )
        ) : (
          <>
            {/* Toolbar batch export */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedReceipts.length > 0 && !allSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Pilih semua
                <span className="text-xs text-slate-400">({selectedReceipts.length}/{receipts.length} dipilih)</span>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="success"
                  className="!min-h-9 !px-3 !py-1.5 text-xs"
                  disabled={selectedReceipts.length === 0 || batchBusy}
                  onClick={handleBatchDownload}
                  title="Unduh semua label terpilih sebagai satu file PDF"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download PDF Batch ({selectedReceipts.length})
                </Button>
                <Button
                  variant="primary"
                  className="!min-h-9 !px-3 !py-1.5 text-xs"
                  disabled={selectedReceipts.length === 0 || batchBusy}
                  onClick={handleBatchPrint}
                  title="Cetak semua label terpilih sekaligus"
                >
                  Cetak Batch
                </Button>
              </div>
            </div>
            {batchError ? (
              <p className="rounded-lg bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-700">{batchError}</p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua resi"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = selectedReceipts.length > 0 && !allSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-5 py-3 font-semibold">Nomor Resi</th>
                    <th className="px-5 py-3 font-semibold">Penerima</th>
                    <th className="px-5 py-3 font-semibold">Pengirim</th>
                    <th className="px-5 py-3 font-semibold">Tujuan</th>
                    <th className="px-5 py-3 font-semibold">Ekspedisi</th>
                    <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.map((r) => (
                    <tr key={r.id} className={`hover:bg-slate-50 ${selectedIds.has(r.id) ? "bg-indigo-50/60" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Pilih resi ${r.receiptNumber}`}
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{r.receiptNumber}</td>
                    <td className="px-5 py-3 text-slate-600">{r.phoneNumber}</td>
                    <td className="max-w-[140px] px-5 py-3">
                      <p className="truncate text-slate-600">{r.storeName || r.senderName || "—"}</p>
                      {r.storeName && r.senderName ? <p className="truncate text-xs text-slate-400">{r.senderName}</p> : null}
                    </td>
                    <td className="max-w-[220px] px-5 py-3">
                      <p className="truncate text-slate-600">{r.city}, {r.province}</p>
                      <p className="truncate text-xs text-slate-400">{r.village}, {r.district}</p>
                    </td>
                    <td className="px-5 py-3"><Badge tone="indigo">{r.courierName}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="!min-h-9 !px-3 !py-1.5 text-xs" onClick={() => handleEdit(r)}>
                          Edit
                        </Button>
                        <Button variant="secondary" className="!min-h-9 !px-3 !py-1.5 text-xs" onClick={() => downloadReceiptPdf(r)}>
                          Unduh
                        </Button>
                        <Button variant="ghost" className="!min-h-9 !px-3 !py-1.5 text-xs" onClick={() => printReceiptPdf(r)}>
                          Cetak
                        </Button>
                        <Button
                          variant="ghost"
                          className="!min-h-9 !px-3 !py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                          onClick={async () => {
                            try {
                              await deleteReceipt(r.id);
                              await refreshList();
                            } catch {
                              // gagal hapus — biarkan daftar tetap tampil
                            }
                          }}
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
          {hasMore ? (
            <div className="flex justify-center border-t border-slate-100 px-5 py-3">
              <Button
                variant="secondary"
                className="!min-h-9 !px-3 !py-1.5 text-xs"
                disabled={listLoading}
                onClick={() => loadReceipts({ q: appliedQ, offset: receipts.length, append: true })}
              >
                {listLoading ? "Memuat…" : "Muat lebih banyak"}
              </Button>
            </div>
          ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
