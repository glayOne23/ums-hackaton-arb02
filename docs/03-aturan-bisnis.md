# 03 · Aturan bisnis

Ini aturan yang **wajib diikuti kode**. Sumber utama: [referensi/draf-solusi-gabungan.md](../referensi/draf-solusi-gabungan.md) §5–§8 dan Tabel C.2 proposal v03.

## 1. Stok

Setiap produk punya dua angka:

- **stok fisik**: barang yang ada di gudang;
- **stok dipesan**: sudah dipesan, belum dikirim.

Sales hanya melihat **stok tersedia = stok fisik − stok dipesan**.

| Kejadian | Oleh | Stok fisik | Stok dipesan | Stok tersedia | Batch dan catatan |
|---|---|---|---|---|---|
| Barang masuk | Admin gudang | +q | — | +q | Batch baru: nomor, kedaluwarsa, jumlah |
| Pesanan diterima server (tersedia ≥ q) | Sales | — | +q | −q | Riwayat outlet dan capaian target bertambah |
| Pesanan diterima server (tersedia < q) | Sales | — | — | — | **Baris ditolak**: "sisa stok tersedia X" |
| Pesanan dibatalkan sebelum kirim | Admin penjualan | — | −q | +q | Alasan wajib |
| **Konfirmasi kirim** | Admin gudang | −q | −q | tetap | Dari batch dengan kedaluwarsa terdekat (**FEFO**); outlet penerima tiap batch tercatat |
| Penyesuaian (opname) | Admin gudang | ± selisih | — | ± selisih | Batch dipilih (bawaan: tertua); alasan wajib |

Catatan:

- **Opname membandingkan hitungan rak dengan stok fisik**, bukan stok tersedia. Barang yang sudah dipesan tetapi masih di rak tidak menimbulkan selisih palsu.
- **Fisik < dipesan** (misalnya barang rusak): pesanan terkait ditandai **"perlu perhatian"**; admin penjualan memutuskan kirim sebagian atau batal.
- **Konkurensi**: semua perubahan stok berjalan dalam `transaction.atomic` dengan `select_for_update()` pada baris produk. Stok tidak boleh minus pada pesanan bersamaan.
- **Mutasi**: setiap kejadian menulis satu baris `mutasi_stok` (Δfisik, Δdipesan, sesudah, referensi, oleh, alasan, waktu). Tabel ini **hanya ditambah, tidak pernah diubah**.
- **Batas MVP**: retur setelah kirim, banyak gudang, dan stok kanvas belum masuk.

## 2. Kunjungan hari ini

Outlet milik sales dikelompokkan berurutan. Tidak ada skor berbobot.

| Urutan | Kelompok | Syarat | Label di HP |
|---|---|---|---|
| 1 | Jatuh tempo | Tagihan belum lunas dan jatuh tempo ≤ 3 hari lagi atau sudah lewat | "Jatuh tempo 2 hari" |
| 2 | Waktunya order | Hari sejak order terakhir ≥ siklus order outlet | "Biasa order tiap 14 hari, sudah 16 hari" |
| 3 | Lama tidak dikunjungi | > 30 hari tanpa kunjungan | "21 hari tidak dikunjungi" |
| 4 | Lainnya | — | — |

Di dalam tiap kelompok, outlet yang paling lama terlambat di atas. Ambang 3 hari dan 30 hari masih **[pilih]**, lihat [09](09-celah-dan-keputusan-terbuka.md).

**Siklus order** = median selang 5 pesanan terakhir; diperbarui setiap ada pesanan baru. Outlet dengan < 3 pesanan memakai bawaan 14 hari.

## 3. Mode tanpa sinyal (PWA)

1. Halaman sales adalah **PWA**: manifest (pasang di layar utama) dan service worker yang menyimpan cangkang aplikasi, sehingga halaman bisa dibuka dari nol dan di-*refresh* tanpa sinyal.
2. Pagi hari, daftar outlet, produk, dan stok disimpan ke IndexedDB (Dexie.js).
3. Setiap pesanan **selalu** disimpan dulu di IndexedDB dengan kode unik (`client_uuid`).
4. Pesanan dikirim saat ada sinyal: event `online`, pengecekan tiap 15 detik, atau tombol **Kirim sekarang**. Tidak memakai Background Sync.
5. Server menjawab **"duplikat"** untuk `client_uuid` yang sama, sehingga pesanan tercatat **tepat sekali**.
6. Data di HP baru dihapus **setelah server menerima**.
7. **Stok ditentukan server.** Bila saat tiba stok tersedia kurang, baris ditolak dan statusnya muncul di "Pesanan saya".
8. Cadangan bila service worker gagal terpasang: peringatan sebelum tab ditutup bila ada antrean, `navigator.storage.persist()`, dan SOP membuka aplikasi pagi saat ada sinyal.

## 4. Impor Excel outlet

- Nomor HP dirapikan ke format `08xx` sebelum dibandingkan.
- Baris dengan nomor HP yang sama dengan outlet lain ditandai **kemungkinan duplikat**; admin memilih **Gabung** atau **Bukan duplikat**.
- Laporan impor menampilkan jumlah baris dibaca, baru, diperbarui, dan kemungkinan duplikat.

## 5. Pesanan dan pembayaran

- Status pesanan: menunggu sinyal (di HP) → diterima / diterima sebagian / ditolak → dikirim → (batal).
- Jatuh tempo = tanggal pesanan + tempo outlet (hari).
- Status bayar: belum / sebagian / lunas. **Tanpa akuntansi.**
- Baris yang ditolak karena stok kurang **tetap dihitung** sebagai permintaan untuk prediksi; pesanan batal tidak.

## 6. Prediksi penjualan dan saran produksi

- Exponential smoothing dengan tren (Holt), parameter dipilih otomatis, tanpa pustaka tambahan.
- **Saran produksi = perkiraan 4 minggu + stok minimum − stok tersedia** (minimal 0), beserta "stok cukup untuk ± hari".
- Akurasi dilaporkan sebagai WAPE dibanding ramalan naif. Klaim akurasi hanya boleh untuk data nyata setelah pilot.

## 7. Data pribadi dan regulasi

- Nomor registrasi BPOM disimpan per produk.
- Data PIC outlet dilindungi hak akses per peran dan log, sesuai UU PDP.
- Mendekati kedaluwarsa = sisa umur ≤ 90 hari **[pilih]**.
