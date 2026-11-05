# 07 · Backlog MVP

Target terdekat: **5 fitur inti bisa diperagakan pada Hackathon Day 1, 14 Nov 2026** (penyaringan finalis). Perkiraan beban dari draf solusi §13: ±13–14 hari-orang (belum divalidasi).

Keterangan: **P0** wajib untuk 14 Nov · **P1** sebelum demo day 28–29 Nov · **P2** setelah hackathon.
Tugas, PIC, dan tenggat yang berjalan dilacak di database [**Tugas Tim** Notion](https://app.notion.com/p/7eca86f1caf44a009f0d854c1915bce1); backlog ini adalah daftar pekerjaan teknisnya. Desain tiap layar diambil dari Figma "SIGAP · Hi-fi v2".

## P0 — sebelum 14 Nov

| No | Pekerjaan | Fitur inti | Layar |
|---|---|---|---|
| 1 | Kerangka Django + PostgreSQL, migrasi tabel ([05](05-model-data.md)), hosting demo HTTPS | — | — |
| 2 | Login dan **4 peran** dengan grup Django; menu sesuai peran; sales hanya melihat outletnya | semua | S0, L1 |
| 3 | **Lapisan aturan stok**: fisik/dipesan/tersedia, barang masuk per batch, reservasi, batal, konfirmasi kirim FEFO, opname, mutasi append-only, konkurensi ([03](03-aturan-bisnis.md) §1) | 3 | — |
| 4 | **Halaman sales PWA**: manifest, service worker, antrean IndexedDB (Dexie), kirim otomatis, `client_uuid` idempoten | 2 | S0, S3b, S4 |
| 5 | Check-in GPS dan jam (tabel `kunjungan`) | 2, 4 | S2a |
| 6 | **Kunjungan hari ini** berurutan dengan alasan + siklus order | 2, 4 | S1 |
| 7 | Halaman outlet: tagihan, jatuh tempo, 3 pesanan terakhir | 4 | S2 |
| 8 | Form pesanan: **Ulangi pesanan terakhir**, +/−, stok tersedia per jam sinkron, kirim | 2 | S3e, S3 |
| 9 | Pesanan saya dengan status per baris dari server | 2 | S4, S4a |
| 10 | Kelola outlet + **impor Excel** + gabung duplikat nomor HP | 1 | S5, S5b, S5c |
| 11 | Produk dan stok, barang masuk, opname di panel kantor | 3 | S7, S7a, S7b |
| 12 | Pengiriman FEFO + telusur batch di panel kantor | 3 | S8, S8a |
| 13 | **Dashboard direktur**: performa sales, outlet paling aktif, perputaran stok, menipis, mendekati kedaluwarsa | 5 | S9 |
| 14 | Data contoh: ±100 outlet, 30 produk dengan 2–3 batch, 3 sales, 3 bulan riwayat pesanan | — | — |

**Jika waktu mepet, potong dengan urutan ini:** (1) layar telusur batch, tampilkan lewat kueri; (2) siklus order otomatis, pakai bawaan 14 hari; (3) pemisahan admin penjualan dan gudang, gabung jadi satu admin.
**Tidak boleh dipotong:** reservasi stok, mode tanpa sinyal, batch dan kedaluwarsa saat barang masuk.

## P1 — sebelum demo day 28–29 Nov

- [ ] Kelola pesanan: batal dengan alasan, status bayar, bukti transfer, "perlu perhatian" (S6, S6a, S6c–e)
- [ ] Outlet baru dari sales dan validasinya (S1a, S5e)
- [ ] Hasil kunjungan tidak order + alasan; alasan lewati check-in (S2c, S2d — usulan)
- [ ] Pesanan tersimpan dan tindak lanjut ditolak (S4b, S4c — usulan)
- [ ] Atur target sales (S9a); tambah produk baru (S7d — usulan)
- [ ] **Prediksi penjualan 4 minggu dan saran produksi** di dashboard (data sintetis, diberi label)
- [ ] Ringkasan pesanan ke outlet lewat `wa.me`
- [ ] Semua kriteria di [08-kriteria-uji.md](08-kriteria-uji.md) lulus, termasuk mode pesawat di Android sungguhan
- [ ] Panduan pengguna per peran dan panduan migrasi Excel
- [ ] Video cadangan demo

## P2 — setelah hackathon

Retur dan barang kedaluwarsa dari outlet, recall batch, pemusnahan, notifikasi antar-peran, log audit yang bisa dilihat, kelola akun dan penugasan outlet, ekspor laporan, jatah stok per sales, prediksi pada data nyata, integrasi akuntansi/WhatsApp resmi. Detail di [09-celah-dan-keputusan-terbuka.md](09-celah-dan-keputusan-terbuka.md).

## Skenario demo (±4 menit)

1. **Impor Excel**: dua outlet dengan nomor HP sama ditandai, lalu digabung.
2. **Barang masuk**: satu produk masuk dalam 2 batch dengan kedaluwarsa berbeda.
3. **HP A**: Kunjungan hari ini (tunjukkan label alasan) → check-in → ulangi pesanan → kirim. Stopwatch ≤ 15 detik. Stok tersedia turun, stok fisik tetap.
4. **Dua HP mode pesawat** memesan stok terakhir. Sinyal dinyalakan: satu diterima, satu baris ditolak. "Kirim sekarang" lagi: pesanan tetap satu.
5. **Admin gudang** konfirmasi kirim: FEFO memakai batch tertua, stok fisik turun.
6. **Opname** saat ada pesanan belum dikirim: tidak ada selisih palsu; penyesuaian "rusak −1" tercatat dengan alasan.
7. **Telusur batch** → daftar outlet penerima.
8. **Dashboard direktur**.
