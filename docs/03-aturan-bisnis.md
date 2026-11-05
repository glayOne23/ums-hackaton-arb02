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
| Pesanan diterima server (tersedia ≥ q) | Sales | — | +q | −q | Status **menunggu ACC**; riwayat outlet dan capaian target bertambah |
| Pesanan diterima server (tersedia < q) | Sales | — | +tersedia | → 0 | Sisanya dicatat sebagai **kekurangan** baris itu (tidak menahan stok); admin penjualan memutuskan saat ACC. **[pilih]**, lihat catatan di bawah |
| Pesanan ditolak admin | Admin penjualan | — | −q | +q | Alasan wajib; sales diberi tahu |
| Pesanan dibatalkan sebelum kirim | Admin penjualan | — | −q | +q | Alasan wajib |
| **Konfirmasi kirim** | Admin gudang | −q | −q | tetap | Hanya pesanan yang sudah **di-ACC**. Batch terisi otomatis **FEFO**, admin gudang boleh memindah ke batch lain; outlet penerima tiap batch tercatat |
| **Kirim sebagian**: barang rusak | Admin gudang | −(kirim + rusak) | −(kirim + rusak) | tetap | Alasan wajib (kemasan rusak, segel bocor, stok fisik selisih, kedaluwarsa, lainnya); barang rusak masuk **karantina** (tidak bisa dijual); sisa yang belum terkirim masuk **Belum lengkap · urgent** |
| Barang masuk saat ada kekurangan urgent | Admin gudang | +q | +min(q, kekurangan) | +sisa | Stok baru **dicadangkan dulu** untuk daftar Belum lengkap sebelum pesanan baru; tombol Kirim susulan aktif |
| Tandai selesai, sisa dibatalkan | Admin penjualan | — | — | — | Tagihan dihitung ulang sesuai barang terkirim; kekurangan tetap dihitung untuk prediksi |
| Penyesuaian (opname) | Admin gudang | ± selisih | — | ± selisih | Batch dipilih (bawaan: tertua); alasan wajib |

Catatan:

- **Opname membandingkan hitungan rak dengan stok fisik**, bukan stok tersedia. Barang yang sudah dipesan tetapi masih di rak tidak menimbulkan selisih palsu.
- **Kekurangan dan kirim sebagian** (Figma 5 Nov): kekurangan tidak pernah membuat stok tersedia minus. Desain S8c masih menulis "2 tetap dipesan (urgent), tersedia −2"; aturan di atas mengusulkan kekurangan dikeluarkan dari stok dipesan dan dicadangkan ulang saat barang masuk. Perlu diputuskan, lihat [09](09-celah-dan-keputusan-terbuka.md).
- **Perlu perhatian** = pesanan menunggu ACC, pesanan dengan kekurangan, atau kiriman belum lengkap. Pesanan otomatis keluar dari daftar setelah ditangani.
- **Penerimaan barang** (S7e/S7f) tidak bisa diubah setelah disimpan. Selisih dengan surat jalan dicatat; koreksi jumlah hanya lewat opname. Sumber: produksi (berita acara) atau pemasok (surat jalan, PO).
- **Data stok tidak bisa dihapus**; koreksi selalu lewat opname.
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

- Status pesanan: menunggu sinyal (di HP) → **menunggu ACC** → di-ACC (antrean kirim gudang) → dikirim / **dikirim sebagian (urgent)** → **selesai**. Cabang: ditolak (sebelum ACC), dibatalkan (sebelum kirim). Selesai bisa **dibuka kembali**.
- **ACC** oleh admin penjualan: semua pesanan dari HP melewati ACC **[pilih: semua pesanan, atau hanya yang stoknya kurang / outlet menunggak]**. Saat ACC ditentukan **ketentuan bayar**: tunai saat barang diterima, atau tempo (bawaan = siklus order outlet, mis. 14 hari).
- **Jatuh tempo = tanggal ACC + lama tempo**, bisa diubah. Perubahan tempo setelahnya lewat Ubah pesanan dengan alasan; pengingat tagih ikut bergeser.
- **Ubah pesanan**: isi (produk, jumlah) hanya bisa diubah selama belum di-ACC; sales diberi tahu. Setelah barang dikirim, item terkunci; yang bisa diubah hanya status (koreksi), ketentuan bayar, sales penanggung jawab (komisi dan target ikut), dan no. referensi outlet. Barang kembali lewat retur (belum dirancang).
- **Tandai selesai** dengan alasan: kekurangan dikirim menyusul (pesanan tetap terbuka), sisa dibatalkan atas persetujuan outlet (tagihan dihitung ulang), atau diganti produk lain lewat pesanan pengganti.
- Status bayar: belum / sebagian / lunas. **Tanpa akuntansi.** Pembayaran bisa dicatat beberapa kali (DP/cicilan) dengan metode transfer, tunai, atau giro, dan **bukti wajib**. Tagihan menyesuaikan otomatis bila gudang mengirim kurang.
- Pembayaran yang sudah disimpan **tidak bisa diubah atau dihapus** admin penjualan; koreksi oleh direktur sebagai entri baru.
- Setiap kejadian pesanan (dibuat, diubah, ACC, dikirim, urgent, selesai, pembayaran) tercatat di **riwayat transaksi pesanan** atas nama pelakunya.
- Baris yang ditolak karena stok kurang **tetap dihitung** sebagai permintaan untuk prediksi; pesanan batal tidak.

## 6. Prediksi penjualan dan saran produksi

- Exponential smoothing dengan tren (Holt), parameter dipilih otomatis, tanpa pustaka tambahan.
- **Saran produksi = perkiraan 4 minggu + stok minimum − stok tersedia** (minimal 0), beserta "stok cukup untuk ± hari".
- Akurasi dilaporkan sebagai WAPE dibanding ramalan naif. Klaim akurasi hanya boleh untuk data nyata setelah pilot.

## 7. Akun dan hak akses

- Akun dibuat direktur (U1a). Aktivasi lewat tautan WhatsApp (berlaku 48 jam, pengguna membuat kata sandi sendiri) atau kata sandi sementara yang wajib diganti saat masuk pertama.
- Akun yang sudah mencatat transaksi **tidak bisa dihapus, hanya dinonaktifkan**, supaya riwayat tetap menyebut pencatatnya. Menonaktifkan sales **wajib memindahkan outlet binaannya** ke sales lain dan mengisi alasan; pesanan yang sedang berjalan tetap diproses.
- Reset kata sandi dan keluar dari semua perangkat dilakukan direktur dari Ubah akun (U1b). Perubahan peran berlaku saat pengguna masuk berikutnya.
- Hak akses diatur per peran dan per modul (lihat, tambah, ubah, hapus). Direktur adalah peran sistem yang tidak bisa dikurangi. **Harga jual** hanya diubah admin penjualan, supaya tagihan outlet konsisten.
- Menu di sidebar mengikuti hak akses peran.

## 8. Data pribadi dan regulasi

- Nomor registrasi BPOM disimpan per produk.
- Data PIC outlet dilindungi hak akses per peran dan log, sesuai UU PDP.
- Mendekati kedaluwarsa = sisa umur ≤ 90 hari **[pilih]**.
