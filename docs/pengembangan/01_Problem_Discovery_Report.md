# Problem_Discovery_Report — SIGAP CV Arba'in Jaya Mandiri

16 November 2026 · Ren (Antech Async) · Versi online: https://claude.ai/artifact/NTT8Dm4nW9Mbsbkwu88JuT

**Versi 2 — analisis ulang.** Fokus: sistem harus mudah dipakai orang awam dan fleksibel saat aturan bisnis berubah.

Masalah inti CV Arba'in adalah **data outlet, kunjungan sales, dan stok yang tidak terhubung**. Ada 2 sales yang menitipkan ±60 produk ke ±260 apotek dan toko di 7 kabupaten/kota. Hasil setiap kunjungan ditulis di nota, lalu disalin ke beberapa file Excel. Pimpinan baru tahu produktivitas sales, outlet yang aktif, dan stok yang menumpuk atau habis di akhir bulan. Penggunanya bukan orang teknis, jadi solusinya harus **lebih sederhana dari Excel yang sekarang dipakai**, bukan lebih rumit.

## 1. Ruang lingkup (sesuai brief project)

| Diharapkan | Batasan |
| --- | --- |
| Purwarupa **CRM & Inventory** terintegrasi, responsif dan bisa dipasang sebagai aplikasi (PWA) di HP, tablet, laptop, maupun PC untuk semua peran | UI sesederhana mungkin; sales bisa input dalam hitungan detik |
| Laporan analitik ringkas: **performa sales, outlet paling aktif, perputaran stok** | Ringan dan tetap andal di jaringan seluler yang lemah |
| **Panduan penggunaan** dan **skema migrasi data awal** | Fokus operasional B2B, **tanpa modul akuntansi rumit** |

Tidak termasuk: modul maklon, purchasing bahan baku, jurnal akuntansi, integrasi marketplace. Modul maklon dirancang di dokumen 06\_Rancangan\_Modul\_Maklon dan dibangun setelah purwarupa inti.

## 2. Sumber data

| Sumber | Dipakai untuk |
| --- | --- |
| Deskripsi project (brief hackathon) | Ruang lingkup, batasan, hasil yang diharapkan |
| Transkrip wawancara + QnA mitra ARB-02 | Aturan bisnis (titip jual, tagih, ED, potongan, gudang) |
| CATATAN.docx | 2 sales, wilayah, 10 kebutuhan laporan |
| Data Oktober 2026 (kunjungan, rekap J/R/L, outlet setor, record per wilayah, update stok) | Volume, struktur data, kualitas data |

## 3. Profil bisnis yang terkonfirmasi

| Aspek | Fakta lapangan |
| --- | --- |
| Tenaga sales | **Endri** (Sukoharjo, Surakarta, Sragen, Wonogiri, Klaten, Karanganyar) dan **Monic** (Sukoharjo, Surakarta, Boyolali, Klaten, Karanganyar) |
| Outlet aktif (Okt 2026) | Endri ±135 outlet, Monic ±126 outlet |
| Kunjungan per bulan | ±260 per sales (10–15 outlet per hari) |
| Jenis outlet | Apotek, toko, koperasi, toko herbal, minimarket, swalayan, depot jamu, toko obat; plus distributor |
| Cara jual | Mayoritas **titip jual** (dibayar sesuai yang laku); distributor **beli dengan tempo 1 bulan**; ada penjualan marketplace |
| Potongan | Apotek 16%, minimarket 20%, distributor 25–50% per produk; diatur Manager Marketing, perubahan disetujui Pimpinan |
| Aturan tagih | Tagih bila total laku > 2 item; selain itu ditunda |
| Barang ED/rusak | Ditarik paling lambat 6 bulan sebelum ED, ditukar; rugi ditanggung Arba'in |
| Bukti kunjungan | Form fisik bercap basah + tanda tangan (digital belum diterima) |

## 4. Siapa penggunanya

| Pengguna | Perangkat | Kebiasaan & kemampuan | Implikasi desain |
| --- | --- | --- | --- |
| Sales (Endri, Monic) | HP Android, sering di jalan, sinyal tidak stabil | Terbiasa nota kertas dan WhatsApp; 10–15 outlet per hari; waktu di tiap outlet singkat | Sekali ketuk per produk, angka sudah terisi, tanpa mengetik, jalan tanpa sinyal |
| Admin kantor (penjualan/keuangan) | PC/laptop, sesekali HP/tablet | Terbiasa Excel | Tabel mirip Excel, impor/ekspor Excel, istilah sama dengan file sekarang |
| Admin & Kepala Gudang | PC atau tablet di gudang | Mencatat barang masuk dan keluar | Form pendek, batch & ED dipilih dari daftar, persetujuan sekali klik |
| Pimpinan | HP atau laptop | Butuh gambaran cepat, bukan detail | Satu halaman ringkasan, angka besar, tanda merah/kuning yang jelas |

## 5. Temuan dari data Oktober 2026

| # | Temuan | Bukti | Dampak |
| --- | --- | --- | --- |
| T1 | Satu kunjungan dicatat ulang di 4–5 file | Kunjungan, Outlet Setor, Record per wilayah, Update Stok, Rekap Penjualan memuat angka yang sama | Kerja admin berlipat, rawan selisih |
| T2 | Nama outlet tidak baku dan duplikat | "tk dewi murni gading" 3×, "arafah nguter" 3×; "miralbe" vs "miralbee" | Rekap per outlet tidak bisa dipercaya |
| T3 | Nama produk berbeda antar file | "MADU HITAM PAHIT 470 GR" vs "MD PAHIT 470"; "TONGKAT AROB" | Penjumlahan lintas laporan sulit |
| T4 | Siklus kunjungan tidak terkontrol | "ap balapan solo" terakhir 04/03/2026, "ap mulia farma" 15/04/2026 | Stok lama berisiko ED, omzet hilang |
| T5 | Stok tersebar di outlet besar, terlihat sebulan sekali | MD Pahit 470: Endri 434 + Monic 520 | Modal tertahan tanpa pantauan ED |
| T6 | Perputaran produk utama rendah | Endri MD Hitam Pahit J 483 / L 253 (52%); Monic Flores 0,5 kg J 318 / L 158 (50%) | Perlu tahu produk & outlet yang lambat |
| T7 | Tidak ada batch/ED per outlet | Record hanya mencatat jumlah per SKU | Aturan tarik ED tidak bisa dipantau |
| T8 | Informasi disimpan sebagai warna sel | "Setor paling banyak = kolom kuning" | Hilang saat dicetak/disalin |

## 6. Pernyataan masalah

> Pimpinan dan admin CV Arba'in tidak memiliki satu sumber data yang akurat dan tepat waktu tentang **outlet, hasil kunjungan sales, stok di gudang maupun di outlet, dan tagihan yang belum dibayar**. Pencatatan saat ini bergantung pada nota kertas yang disalin ke banyak Excel, sehingga laporan lambat, kunjungan terlewat, dan produk kedaluwarsa di rak tidak terdeteksi.

## 7. Akar masalah

| Gejala | Akar masalah |
| --- | --- |
| Laporan lambat, angka tidak konsisten | Tidak ada daftar outlet & produk baku; data diketik ulang |
| Outlet terlewat berbulan-bulan | Tidak ada pengingat kunjungan |
| Produk ED di outlet | Batch/ED tidak ikut tercatat saat barang dititip |
| Tagihan tunda menumpuk | Tidak ada daftar tagihan yang belum dibayar |
| Selisih stok gudang | Barang keluar, sisa bawaan, dan retur tidak tercatat di satu tempat |

## 8. Kebutuhan kemudahan (untuk pengguna awam)

| Kebutuhan | Ukuran berhasil |
| --- | --- |
| Mencatat kunjungan tanpa perubahan stok | ≤ 15 detik (buka outlet → "Tidak ada yang laku" → simpan) |
| Mencatat kunjungan biasa (±10 produk berubah) | ≤ 2 menit, tanpa mengetik huruf |
| Belajar memakai aplikasi sales | Bisa dipakai setelah latihan 30 menit, tanpa membaca manual |
| Admin menyiapkan laporan bulanan | Satu klik ekspor, format mirip Excel sekarang |
| Kesalahan input | Bisa diperbaiki sendiri di hari yang sama, ada riwayat perubahan |
| Istilah | Memakai istilah lapangan: titip, sisa, laku, tarik, isi ulang, nota |

## 9. Kebutuhan fleksibilitas

Aturan bisnis di bawah ini bisa berubah. Karena itu semuanya harus bisa diatur admin dari menu Pengaturan, tanpa mengubah program:

| Yang bisa berubah | Contoh |
| --- | --- |
| Cara jual per outlet | Titip jual, beli langsung, atau tempo (distributor) |
| Batas tagih | Saat ini > 2 item, bisa diubah |
| Batas tarik ED | Saat ini 6 bulan sebelum ED |
| Potongan | Per jenis outlet, per produk, atau khusus per outlet |
| Jumlah sales per outlet | Satu outlet bisa dipegang satu atau beberapa sales |
| Daftar jenis outlet, wilayah, kategori produk | Bisa ditambah tanpa programmer |
| Siapa boleh melakukan apa | Hak akses dicentang per peran, peran baru bisa dibuat |
| Persetujuan | Bisa dinyalakan/dimatikan per jenis transaksi |
| Bukti kunjungan | Foto form wajib atau opsional |
| Stok standar outlet | Jumlah ideal per produk per outlet, dipakai untuk saran isi ulang |
| Kesalahan input, status, atau data | Bisa diperbaiki sendiri (perbaiki, koreksi, batalkan, ubah status, pulihkan) tanpa programmer; jejak lama tetap tersimpan |
| Kebutuhan baru di masa depan | Modul baru (maklon, marketplace, akuntansi), gudang/cabang tambahan, kolom data tambahan tanpa bongkar sistem |

## 10. Peluang solusi

1. **Satu aplikasi PWA untuk semua peran (HP, tablet, laptop, PC), sales tetap bisa offline**: buka outlet, sisa sudah terisi, ubah yang berkurang, simpan. Laku, tagihan, dan saran isi ulang dihitung otomatis.
2. **Daftar outlet & produk baku (CRM)**: riwayat kunjungan, pembelian, dan tagihan setiap outlet di satu halaman.
3. **Stok di satu tempat**: gudang, bawaan sales, dan outlet, dengan peringatan stok menipis dan ED.
4. **Ringkasan pimpinan**: performa sales, outlet paling aktif, perputaran stok, outlet belum dikunjungi.
5. **Menu Pengaturan** untuk semua aturan pada bagian 9.
6. **Impor/ekspor Excel**, supaya data lama bisa masuk dan laporan tetap bisa dibuka di Excel.

## 11. Batasan & asumsi

- Bukti sah kunjungan tetap form fisik bercap; aplikasi hanya menyimpan fotonya.
- Arti kolom **A-M-R-L-S** diasumsikan: A = titipan awal, M = isi ulang, R = sisa, L = laku, S = stok akhir.
- Sinyal di sebagian wilayah lemah, sehingga aplikasi sales wajib bisa offline.
- Keuangan cukup mencatat pembayaran dan tagihan yang belum lunas; pembukuan tetap di sistem/Excel keuangan yang sudah ada.

## 12. Pertanyaan yang masih terbuka

1. Konfirmasi arti kolom A-M-R-L-S dan jmh-rt-lk.
2. "> 2 item" dihitung per unit atau per jenis produk?
3. Apakah setiap outlet punya jumlah titip standar per produk (stok ideal di rak)?
4. Siapa petugas penagihan tunda, dan apakah ia juga memakai aplikasi sales?
5. HP sales: merek/RAM dan apakah kuota data disediakan kantor?
