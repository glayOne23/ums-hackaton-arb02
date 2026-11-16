# Software_Requirements_Specification — SIGAP CV Arba'in

16 November 2026 · Ren (Antech Async) · Versi online: https://claude.ai/artifact/2FqoDLFpATaJ8x8MYz741z

**Versi 2 — analisis ulang.** Lebih sederhana: 4 peran bawaan, persetujuan hanya di 2 tempat, akuntansi dikeluarkan, maklon dirancang terpisah di dokumen 06. Lebih fleksibel: semua aturan bisnis diatur dari menu Pengaturan.

SIGAP adalah aplikasi **CRM & Inventory** untuk CV Arba'in Jaya Mandiri. Semua peran memakai satu aplikasi PWA yang bisa dipasang dan menyesuaikan layar HP, tablet, laptop, maupun PC; aplikasi tetap bisa dipakai tanpa sinyal untuk pekerjaan lapangan. Sistem mencatat outlet, kunjungan sales (titip jual maupun beli langsung), stok di gudang, di bawaan sales, dan di outlet, tagihan yang belum dibayar, serta laporan ringkas untuk pimpinan. Prioritas memakai MoSCoW: **M** = wajib di purwarupa, **S** = sebaiknya ada, **C** = nanti.

## 1. Ruang lingkup

| Termasuk | Tidak termasuk |
| --- | --- |
| Daftar outlet & riwayatnya (CRM) | Modul maklon (dirancang di dokumen 06, dibangun setelah purwarupa inti) |
| Produk, harga, potongan | Purchasing bahan baku & kemasan |
| Stok gudang (batch, ED), barang keluar ke sales, retur, opname | Jurnal / pembukuan akuntansi |
| Aplikasi sales: kunjungan titip jual & beli langsung, nota, foto bukti | Integrasi marketplace |
| Tagihan & pembayaran sederhana | Peta rute / GPS tracking |
| Laporan analitik ringkas + 10 laporan CATATAN |  |
| Pengaturan aturan bisnis, peran & hak akses |  |
| Impor/ekspor Excel |  |

## 2. Peran pengguna

Ada 4 peran bawaan. Hak akses setiap peran bisa dicentang ulang, dan peran baru bisa dibuat (mis. "Kepala Gudang") tanpa programmer.

| Peran bawaan | Perangkat utama (semua bisa dipakai di HP, tablet, laptop, PC) | Yang bisa dilakukan | Bisa merangkap |
| --- | --- | --- | --- |
| Pimpinan | HP atau laptop | Lihat ringkasan & semua laporan, setujui perubahan potongan | Direktur |
| Admin Kantor | Laptop/PC; HP/tablet saat di luar kantor | Outlet, produk, harga & potongan, penugasan sales, target, tagihan & pembayaran, laporan, pengaturan | Admin Penjualan, Keuangan, Manager Marketing |
| Admin Gudang | PC atau tablet di gudang | Barang masuk, siapkan barang untuk sales, retur, opname; menyetujui bila diberi hak | Kepala Gudang |
| Sales | HP (tablet bila ada) | Kunjungan, nota, minta barang, catat pembayaran, setor uang | — (petugas penagihan tunda tidak memakai aplikasi; daftar tagihannya disiapkan Admin Kantor) |

## 3. Kebutuhan fungsional

### 3.1 Outlet & CRM (OT)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| OT-01 | Tambah/ubah outlet: nama, jenis, kabupaten, kecamatan, alamat, nomor HP/WA pemilik, cara jual (titip / beli langsung / tempo) | M |
| OT-02 | Saat menambah outlet, sistem menampilkan outlet dengan nama mirip di kecamatan yang sama, untuk mencegah dobel | M |
| OT-03 | Halaman profil outlet: stok titipan sekarang, riwayat kunjungan, riwayat laku/pembelian, tagihan belum dibayar, sales penanggung jawab | M |
| OT-04 | Tugaskan outlet ke satu atau beberapa sales; riwayat pindah tercatat beserta alasan | M |
| OT-05 | Sales mengusulkan outlet baru dari lapangan; aktif setelah dicek admin | S |
| OT-06 | Gabungkan dua outlet yang ternyata sama (riwayat ikut digabung) | S |
| OT-07 | Stok standar per produk per outlet, opsional (mitra tidak punya standar; boleh dikosongkan) | S |

### 3.2 Produk & harga (PR)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| PR-01 | Tambah/ubah produk: nama, ukuran, kategori, harga jual, stok minimum gudang, foto (opsional) | M |
| PR-02 | Nama lain produk (alias) untuk mencocokkan data Excel lama | S |
| PR-03 | Potongan per jenis outlet, per produk, atau khusus satu outlet; yang paling khusus yang dipakai | M |
| PR-04 | Daftar harga per jenis outlet bisa dicetak/diekspor | M |

### 3.3 Gudang (GD)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| GD-01 | Catat barang masuk: produk, nomor batch, ED, jumlah (tanggal otomatis) | M |
| GD-02 | Sales mengajukan permintaan barang dari HP; Admin Gudang menyiapkan (batch ED terdekat dipilih otomatis, bisa diganti) | M |
| GD-03 | Barang keluar disetujui satu klik oleh pemegang hak "Setujui barang keluar" (bisa dimatikan di Pengaturan) | M |
| GD-04 | Sisa bawaan sales otomatis terbawa ke perjalanan berikutnya | M |
| GD-05 | Terima retur dari sales dengan pilihan kondisi: baik / rusak / kedaluwarsa | M |
| GD-06 | Opname: daftar stok sistem sudah terisi, admin cukup mengubah yang beda; selisih ditampilkan dengan riwayat keluar-masuknya | M |
| GD-07 | Kartu stok per produk (bisa dilihat per batch) | M |
| GD-08 | Peringatan stok gudang di bawah minimum dan batch mendekati ED | M |

### 3.4 Kunjungan sales (KS)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| KS-01 | Daftar outlet sales diurutkan dari yang paling lama tidak dikunjungi, dengan tanda: belum dikunjungi bulan ini, ada tagihan, ada produk mendekati ED | M |
| KS-02 | **Outlet titip jual**: kolom "sisa di rak" sudah terisi sama dengan titipan; sales hanya mengubah yang berkurang | M |
| KS-03 | Tombol cepat "Tidak ada yang laku" untuk menyimpan kunjungan tanpa perubahan | M |
| KS-04 | Laku, nilai tagihan (setelah potongan), dan stok akhir dihitung otomatis | M |
| KS-05 | Saran isi ulang otomatis = mengembalikan ke jumlah titipan sebelumnya; bila stok standar outlet diisi, dipakai stok standar − sisa; sales bisa mengubah | M |
| KS-06 | Produk yang mendekati ED (sesuai Pengaturan) diberi tanda dan langsung disarankan untuk ditarik | M |
| KS-07 | **Outlet beli langsung / tempo**: sales memilih produk dan jumlah yang dibeli; tagihan dibuat dengan jatuh tempo sesuai Pengaturan | M |
| KS-08 | Pembayaran: "Dibayar" / "Sebagian" / "Belum"; saran tagih mengikuti batas tagih di Pengaturan | M |
| KS-09 | Nota otomatis, bisa dibagikan lewat WhatsApp atau dicetak | M |
| KS-10 | Foto Form Kunjungan bercap (wajib/opsional sesuai Pengaturan) | M |
| KS-11 | Bekerja tanpa sinyal; terkirim otomatis saat ada sinyal; tidak pernah dobel | M |
| KS-12 | Sales bisa memperbaiki kunjungan di hari yang sama; setelah itu lewat admin; semua perubahan tercatat | M |
| KS-13 | Ringkasan hari ini: outlet dikunjungi, uang yang dibawa, stok bawaan | M |
| KS-14 | Notifikasi saat ditugaskan ke outlet baru | S |

### 3.5 Tagihan & pembayaran (TG)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| TG-01 | Daftar tagihan belum dibayar per outlet dan per sales, dengan lama hari; bisa dicetak atau dikirim WA untuk petugas penagihan yang tidak memakai aplikasi, lalu hasilnya dicatat Admin Kantor | M |
| TG-02 | Catat pembayaran (tanggal, jumlah, tunai/transfer) oleh sales atau admin | M |
| TG-03 | Setoran harian sales: admin cukup menandai "Uang diterima"; bila kurang, catat selisihnya | M |
| TG-04 | Pengingat jatuh tempo untuk outlet tempo/distributor | S |

### 3.6 Laporan & analitik (LP)

Setiap laporan bisa difilter per bulan, sales, kabupaten, dan jenis outlet, lalu diekspor ke Excel/PDF.

| ID | Laporan | Prioritas |
| --- | --- | --- |
| LP-01 | **Ringkasan pimpinan**: omzet bulan ini, kunjungan vs target, outlet belum dikunjungi, produk mendekati ED, tagihan belum dibayar | M |
| LP-02 | **Performa sales**: kunjungan, outlet tercakup, omzet, % target | M |
| LP-03 | **Outlet paling aktif**: urutan outlet berdasarkan laku/omzet dan frekuensi kunjungan | M |
| LP-04 | **Perputaran stok**: % laku (L ÷ J) per produk, produk lambat laku, lama stok di outlet | M |
| LP-05 | Kunjungan per bulan | M |
| LP-06 | Penjualan per produk jmh / rt / lk (jumlah / retur / laku) | M |
| LP-07 | Setor outlet (outlet × produk) | M |
| LP-08 | Stok di outlet per kabupaten | M |
| LP-09 | Opname harian & barang keluar-masuk sales per hari | M |
| LP-10 | Kedaluwarsa per produk (gudang + outlet) | M |
| LP-11 | Daftar harga & potongan | M |
| LP-12 | Outlet belum dikunjungi | M |

### 3.7 Pengaturan (PG) — kunci fleksibilitas

| ID | Pengaturan | Nilai awal (dari mitra) | Prioritas |
| --- | --- | --- | --- |
| PG-01 | Batas tagih: angka batas dan cara hitung (per unit atau per jenis produk) dipilih admin | Tagih bila laku > 2, dihitung per unit | M |
| PG-02 | Peringatan tarik ED | 6 bulan sebelum ED | M |
| PG-03 | Siklus kunjungan ideal (bisa beda per outlet) | 30 hari | M |
| PG-04 | Tempo pembayaran untuk cara jual tempo | 30 hari | M |
| PG-05 | Daftar jenis outlet, wilayah, kategori produk | Sesuai data Oktober 2026 | M |
| PG-06 | Persetujuan: barang keluar gudang / perubahan potongan / penyesuaian opname | Nyala / nyala / mati | M |
| PG-07 | Foto bukti kunjungan | Opsional | M |
| PG-08 | Peran & hak akses (centang per menu dan per aksi) | 4 peran bawaan | M |
| PG-09 | Data perusahaan di nota (nama, alamat, logo, nomor WA) | — | M |
| PG-10 | Target bulanan per sales | Diisi admin | S |
| PG-11 | Batas waktu perbaikan langsung oleh pembuat transaksi | Hari yang sama | M |
| PG-12 | Koreksi setelah batas waktu perlu persetujuan (per jenis transaksi) | Nyala untuk stok & pembayaran | M |
| PG-13 | Masa simpan Tempat Sampah | 30 hari | M |
| PG-14 | Perpindahan status yang diizinkan per jenis dokumen (termasuk mundur) | Mundur satu tahap dengan alasan | M |

### 3.8 Akun (AK)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| AK-01 | Masuk dengan nomor HP/username + kata sandi; tetap masuk di HP sampai keluar | M |
| AK-02 | Admin bisa mereset kata sandi pengguna | M |
| AK-03 | Riwayat perubahan data penting (siapa, kapan, sebelum/sesudah) | M |

### 3.9 Impor & ekspor (IE)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| IE-01 | Impor outlet, produk, dan stok titipan awal dari template Excel, dengan pratinjau dan daftar baris bermasalah | M |
| IE-02 | Ekspor semua tabel & laporan ke Excel | M |

### 3.10 Perangkat & PWA (PW)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| PW-01 | Satu aplikasi PWA untuk semua peran; menu dan halaman menyesuaikan izin pengguna | M |
| PW-02 | Bisa dipasang ("Tambahkan ke layar utama" / "Install app") di HP, tablet, laptop, dan PC, terbuka seperti aplikasi tanpa bilah browser | M |
| PW-03 | Tampilan responsif: HP (< 640 px) navigasi bawah & kartu; tablet (640–1024 px) menu samping yang bisa diciutkan; laptop/PC (> 1024 px) menu samping tetap & tabel penuh | M |
| PW-04 | Tabel lebar otomatis menjadi daftar kartu di HP; filter pindah ke lembar bawah | M |
| PW-05 | Offline penuh (baca & tulis) untuk pekerjaan lapangan: kunjungan, penjualan, pembayaran sales | M |
| PW-06 | Offline tulis untuk gudang: barang masuk, terima retur, opname (dikirim saat ada sinyal) | S |
| PW-07 | Peran lain tetap bisa membuka data terakhir tanpa sinyal (hanya baca), dengan keterangan "data per jam ..." | S |
| PW-08 | Notifikasi push untuk semua peran (persetujuan menunggu, penugasan outlet, ED, tagihan jatuh tempo) | S |
| PW-09 | Pembaruan aplikasi otomatis; pengguna cukup menekan "Muat ulang" saat versi baru tersedia | M |
| PW-10 | Memakai kamera perangkat untuk foto form dan pindai barcode produk (bila ada) | S |

### 3.11 Koreksi & pemulihan kesalahan (KR)

Prinsip: **setiap kesalahan bisa diperbaiki oleh pengguna sendiri, tanpa programmer, tanpa menghapus jejak.** Data lama tidak pernah hilang; yang berubah selalu tercatat siapa, kapan, sebelum/sesudah, dan alasannya.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| KR-01 | Tombol "Perbaiki" di setiap transaksi (kunjungan, penjualan, pembayaran, barang masuk, permintaan barang, retur, opname). Pembuat bisa memperbaiki langsung dalam batas waktu di Pengaturan (awal: hari yang sama) | M |
| KR-02 | Lewat batas waktu, perbaikan diajukan sebagai **koreksi** dengan alasan; perlu persetujuan bila diatur di Pengaturan | M |
| KR-03 | Koreksi transaksi yang memengaruhi stok/tagihan tidak mengubah angka lama, tetapi membuat transaksi pembalik + transaksi pengganti, sehingga stok, tagihan, dan laporan otomatis terhitung ulang | M |
| KR-04 | **Batalkan** transaksi (void) dengan alasan; transaksi tetap terlihat dicoret, efek stok/tagihannya dibalik | M |
| KR-05 | **Ubah status** ke status sebelumnya (mis. permintaan barang "Disetujui" kembali ke "Disiapkan", order maklon mundur satu tahap) dengan alasan; aturan perpindahan status yang diizinkan diatur per jenis dokumen | M |
| KR-06 | Pembayaran salah catat atau salah outlet bisa dibatalkan dan dicatat ulang / dipindah ke tagihan yang benar | M |
| KR-07 | Data master salah (nama outlet, harga, batch/ED, cara jual) bisa diubah; perubahan harga/potongan tidak mengubah transaksi lama (harga disalin saat transaksi) | M |
| KR-08 | Outlet atau produk dobel bisa digabungkan; seluruh riwayat dipindah ke data yang dipertahankan | S |
| KR-09 | **Tempat sampah**: data yang dihapus bisa dipulihkan selama masa simpan di Pengaturan (awal: 30 hari) | M |
| KR-10 | **Riwayat perubahan** per data: siapa, kapan, sebelum/sesudah, alasan; bisa dilihat dari halaman data itu sendiri | M |
| KR-11 | Transaksi offline yang bentrok (mis. outlet dikunjungi dua sales, stok di HP sudah usang) ditandai "Perlu dicek" dan diselesaikan admin dari daftar khusus, tanpa data hilang | M |
| KR-12 | Kesalahan pengiriman data (gagal sinkron) tampil jelas di HP dengan tombol "Kirim ulang"; admin bisa melihat perangkat yang belum mengirim | M |
| KR-13 | Opname yang sudah disimpan bisa dibuka ulang di hari yang sama; setelahnya lewat penyesuaian dengan alasan | S |
| KR-14 | Impor Excel yang salah bisa dibatalkan per sesi impor (semua baris dari sesi itu dibalik) | S |
| KR-15 | Tutup buku per bulan (opsional, di Pengaturan): setelah ditutup, koreksi periode lama hanya lewat penyesuaian di periode berjalan, agar laporan bulan lalu tidak berubah diam-diam | C |

## 4. Kebutuhan kemudahan penggunaan (UX)

| ID | Kebutuhan |
| --- | --- |
| UX-01 | Kunjungan tanpa perubahan selesai ≤ 15 detik; kunjungan biasa ≤ 2 menit |
| UX-02 | Sales tidak perlu mengetik huruf saat kunjungan; angka diubah dengan tombol − / + atau keypad angka |
| UX-03 | Satu tugas = satu layar; tombol utama selalu di bawah, besar, satu |
| UX-04 | Bahasa sehari-hari & istilah lapangan; tanpa istilah teknis (batch, FEFO, sinkronisasi disembunyikan dari sales) |
| UX-05 | Hitungan otomatis selalu ditampilkan, tidak perlu menghitung manual |
| UX-06 | Kesalahan dicegah sebelum terjadi (mis. sisa > titipan ditandai merah) dengan pesan yang menjelaskan cara memperbaiki |
| UX-07 | Bisa dibatalkan/diperbaiki tanpa minta izin di hari yang sama |
| UX-08 | Ukuran huruf bisa diperbesar; kontras tinggi untuk dipakai di luar ruangan |
| UX-09 | Petunjuk singkat saat pertama kali membuka setiap layar; tombol bantuan menuju WhatsApp admin |
| UX-10 | Tabel admin berperilaku seperti Excel: cari, urutkan, filter, ekspor |
| UX-11 | Status koneksi tampil sederhana: "Tersimpan di HP, akan terkirim saat ada sinyal" |

## 5. Aturan bisnis (nilai awal, bisa diubah di Pengaturan)

| ID | Aturan | Pengaturan |
| --- | --- | --- |
| BR-01 | Laku = titipan sebelumnya − sisa di rak | — |
| BR-02 | Sarankan tagih bila laku > batas tagih | PG-01 |
| BR-03 | Tandai produk untuk ditarik bila ED ≤ batas tarik ED | PG-02 |
| BR-04 | Harga = harga jual × (1 − potongan paling khusus yang berlaku) | PR-03 |
| BR-05 | Perubahan potongan berlaku setelah disetujui, bila persetujuan dinyalakan | PG-06 |
| BR-06 | Barang keluar gudang perlu persetujuan, bila dinyalakan | PG-06 |
| BR-07 | Retur rusak → rework; kedaluwarsa → dimusnahkan | — |
| BR-08 | Kunjungan & tagihan tetap atas nama sales yang mencatat, walau outlet dipindahkan | — |
| BR-09 | Stok tidak boleh minus di lokasi mana pun | — |

## 6. Kebutuhan non-fungsional

| ID | Kategori | Kebutuhan |
| --- | --- | --- |
| NF-01 | Offline | ≥ 30 kunjungan tersimpan di HP tanpa sinyal, terkirim tanpa dobel |
| NF-02 | Ringan | Aplikasi sales ≤ 2 MB unduhan awal; data per kunjungan ≤ 10 KB (foto dikompres ≤ 200 KB); kuota ditanggung sales sendiri, jadi sinkron hanya mengirim data yang berubah dan target pemakaian ≤ 5 MB per hari kerja; opsi Hemat Data menunda kiriman foto sampai tersambung Wi-Fi |
| NF-03 | Kecepatan | Layar terbuka ≤ 2 detik di HP Android dengan RAM 4 GB (spesifikasi minimal HP sales) |
| NF-04 | Perangkat | HP & tablet Android 9+ (Chrome) dan iPhone/iPad iOS 16.4+ (Safari); laptop/PC Windows, macOS, Linux (Chrome, Edge, Firefox, Safari); lebar layar 360 px sampai 1920 px |
| NF-05 | Keamanan | HTTPS, kata sandi terenkripsi, akses sesuai peran |
| NF-06 | Data | Backup harian; setiap perubahan stok punya catatan asal |
| NF-07 | Skala | 10 sales, 1.000 outlet, 200 produk tanpa perubahan desain |

### 6.1 Kesiapan jangka panjang (future proof)

| ID | Kebutuhan |
| --- | --- |
| FP-01 | Aturan bisnis, daftar pilihan, peran & izin, dan alur persetujuan disimpan sebagai data (Pengaturan), bukan ditulis di kode |
| FP-02 | Struktur modular per domain (Outlet, Produk, Gudang, Kunjungan, Tagihan, Laporan, Maklon); modul baru bisa ditambah tanpa mengubah modul lama |
| FP-03 | API berversi (`/api/v1`) dengan dokumentasi OpenAPI otomatis, sehingga aplikasi lain (akuntansi, marketplace, aplikasi native) bisa terhubung kelak |
| FP-04 | Peristiwa penting (kunjungan disimpan, stok berubah, tagihan lunas) diterbitkan sebagai event internal + webhook opsional, untuk integrasi tanpa mengubah inti |
| FP-05 | Siap banyak gudang, banyak cabang, dan stok milik pihak lain (maklon) karena memakai model lokasi stok + pemilik |
| FP-06 | Kolom tambahan sederhana per entitas (field kustom) bisa ditambah admin untuk outlet, produk, dan order maklon |
| FP-07 | Fitur baru bisa dinyalakan bertahap (feature flag) per peran/pengguna untuk uji coba |
| FP-08 | Semua teks antarmuka disimpan terpisah dari kode (siap multi-bahasa bila dibutuhkan) |
| FP-09 | Jalan di Docker; bisa dipindah dari VPS kecil ke cloud tanpa ubah kode; antrian bisa pindah ke Redis saat beban naik |
| FP-10 | Tes otomatis dan CI menjaga agar perubahan tidak merusak fitur lama; dependensi diperbarui berkala (Laravel rilis tahunan) |
| FP-11 | Data bisa diekspor penuh (Excel/CSV/JSON) kapan saja, sehingga mitra tidak terkunci ke sistem ini |

## 7. Skenario uji penerimaan

1. Admin mengimpor outlet dan stok titipan Oktober dari Excel; 2 outlet dobel terdeteksi dan digabung.
2. Admin Gudang mencatat Madu Hitam Pahit 470, batch B-2611, ED 11/2028, 100 pcs.
3. Endri meminta 24 pcs dari HP; gudang menyiapkan dan menyetujui; stok bawaan Endri bertambah.
4. Di Ap Sari Farma (titipan 4), Endri mengubah sisa menjadi 1. Laku 3 dan tagihan setelah potongan 16% muncul otomatis, disertai saran tagih. Endri menerima saran isi ulang, memotret form, lalu menyimpan. Semua ini dilakukan tanpa sinyal.
5. Di outlet berikutnya tidak ada yang laku: Endri menekan "Tidak ada yang laku" lalu simpan (≤ 15 detik).
6. Admin mengubah batas tagih menjadi > 3 di Pengaturan; kunjungan berikutnya mengikuti aturan baru tanpa perubahan program.
7. Ringkasan pimpinan menampilkan omzet Endri, outlet paling aktif, dan perputaran Madu Hitam Pahit.

## 8. Ketertelusuran

| Kebutuhan mitra / brief | Kebutuhan SRS |
| --- | --- |
| CRM: database pelanggan & riwayat pesanan outlet | OT-01–07, KS-07 |
| Pelacakan kunjungan & penjualan sales | KS-01–13, LP-02, LP-05 |
| Akurasi stok, cegah stockout & penumpukan | GD-01–08, KS-05, LP-04, LP-08 |
| Analitik: performa sales, outlet aktif, perputaran stok | LP-01–04 |
| 10 laporan CATATAN | LP-05–12 |
| UI sederhana, input dalam hitungan detik | UX-01–11 |
| Andal di jaringan seluler | KS-11, NF-01–03 |
| Tanpa akuntansi rumit | TG-01–04 (catat bayar saja) |
| Panduan penggunaan & migrasi data | IE-01, dokumen terpisah |
