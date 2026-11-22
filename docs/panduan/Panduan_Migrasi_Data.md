# Panduan Migrasi Data ke SIGAP

Untuk Admin Kantor yang memindahkan data dari file Excel lama ke SIGAP, dan tim yang mendampingi saat uji coba. Memenuhi IE-01 dan KR-14 di SRS, serta tahap 2–3 di SDD §11.

Prinsipnya: **tidak ada yang tersimpan sebelum Anda menekan Impor.** Setiap baris diperiksa dulu, dan satu sesi impor bisa dibatalkan seluruhnya.

## 1. Gambaran

| Urutan | Data | Sumber di Excel lama | Kenapa urutannya begini |
| --- | --- | --- | --- |
| 0 | Daftar pilihan: jenis outlet, kabupaten/kota, kategori produk | Kolom jenis/wilayah/kategori | Impor outlet dan produk mencocokkan isian dengan daftar ini |
| 0 | Akun sales | — | Kolom "Sales" di impor outlet merujuk username sales |
| 1 | Outlet | Daftar toko/outlet per sales | Stok titipan merujuk outlet |
| 2 | Produk | Daftar produk dan harga | Stok titipan merujuk produk |
| 3 | Stok titipan awal | Rekap sisa barang di rak tiap outlet | Titik awal hitungan laku di kunjungan pertama |
| 4 | Stok gudang | Kartu stok gudang | Dicatat lewat **Barang masuk**, bukan impor (butuh nomor batch dan ED) |

Tagihan lama yang belum dibayar tidak diimpor. Catat sebagai pembayaran di SIGAP saat ditagih, atau tagih dari catatan lama sampai lunas.

## 2. Persiapan (H-7)

1. **Kumpulkan file terakhir** dari setiap admin dan sales. Pakai satu versi saja per data.
2. **Siapkan daftar pilihan** di **Pengaturan → Daftar pilihan**: jenis outlet, kabupaten/kota, kategori produk. Nama harus sama dengan isian di Excel (huruf besar/kecil tidak berpengaruh).
3. **Buat akun sales** di **Pengguna → Tambah pengguna**. Catat username-nya untuk kolom "Sales".
4. **Tentukan tanggal mulai.** Stok titipan awal adalah keadaan rak pada tanggal itu. Sebaiknya awal bulan, setelah kunjungan terakhir dicatat di Excel.

Jangan memakai data mitra asli di server uji atau di repositori kode. Gunakan server produksi yang sudah ber-HTTPS.

## 3. Mengisi template

Di **Impor Excel**, pilih jenis data, lalu tekan **Unduh template …** (misalnya **Unduh template outlet**). Template berisi kolom yang benar, satu baris contoh, dan sheet **Pilihan** berisi isian yang dikenali. Urutan kolom boleh berbeda, dan baris judul boleh berada di bawah judul tabel.

Kolom bertanda **wajib** harus terisi. Beberapa judul kolom lama juga dikenali (misalnya "Kab" untuk Kabupaten/kota, "No HP" untuk Nomor WA).

### Outlet

| Kolom | Wajib | Contoh | Catatan |
| --- | --- | --- | --- |
| Nama outlet | ya | Apotek Contoh Sehat | |
| Jenis | ya | Apotek | Sesuai daftar di Pengaturan |
| Kabupaten/kota | ya | Kab. Klaten | Sesuai daftar di Pengaturan |
| Kecamatan | ya | Delanggu | |
| Alamat | | Jl. Contoh No. 1 | |
| Nomor WA | | 081234567890 | |
| Cara jual | ya | Titip jual | Titip jual, Beli langsung, atau Tempo |
| Sales | | sales1 | Username atau nama sales |
| Siklus kunjungan (hari) | | 30 | Kosongkan untuk ikut Pengaturan |

### Produk

| Kolom | Wajib | Contoh | Catatan |
| --- | --- | --- | --- |
| Kode | ya | MDH01 | Huruf besar dan angka, tanpa spasi. Kode yang sudah ada tidak ditimpa |
| Nama produk | ya | Madu Hutan Contoh 250 ml | |
| Kategori | ya | Madu | Sesuai daftar di Pengaturan |
| Satuan | ya | botol | |
| Harga jual | ya | 60000 | Rupiah; boleh dengan atau tanpa titik |
| Stok minimum gudang | | 20 | Batas peringatan stok menipis |
| Nomor BPOM | | | |
| Nama lain | | Madu Htn 250; MH 250 | Nama produk di file lama, dipisah titik koma. Dipakai saat mencocokkan stok titipan |

### Stok titipan awal

| Kolom | Wajib | Contoh | Catatan |
| --- | --- | --- | --- |
| Outlet | ya | OT-0001 | Kode outlet (OT-…) atau nama persis. Kode didapat dari ekspor outlet setelah langkah 1 |
| Produk | ya | MDH01 | Kode, nama, atau nama lain produk |
| Jumlah | ya | 4 | Jumlah di rak outlet (pcs) |
| ED | ya | 11/2028 | Tanggal atau bulan/tahun kedaluwarsa |
| Batch | | | Kosongkan bila tidak tahu |

## 4. Mengimpor

Ulangi untuk outlet, lalu produk, lalu stok titipan awal.

1. **Impor Excel** → pilih jenis data → **Pilih file Excel …** (`.xlsx`, `.xls`, atau `.csv`, maksimal 10 MB).
2. Baca **pratinjau**. Setiap baris berstatus **siap**, **mirip**, atau **bermasalah**:
   - **Bermasalah:** pesannya menjelaskan apa yang salah, misalnya jenis outlet tidak dikenal. Baris bermasalah dilewati. Perbaiki di Excel, lalu impor lagi file yang sama: baris yang sudah masuk akan ditandai mirip atau sudah ada, jadi tidak tercatat dua kali.
   - **Mirip:** sudah ada data dengan nama mirip (outlet: di kecamatan yang sama). Baris mirip **dilewati** kecuali Anda memilih **Gabung** (keduanya data yang sama: baris itu tidak dibuat baru, tetapi melengkapi isian data yang sudah ada) atau **Impor sebagai data baru** (memang berbeda).
3. Tekan **Impor … baris**. Hasilnya tampil: berapa diimpor, digabung, dan dilewati.
4. Periksa hasilnya di **Outlet** atau **Produk** (kolom cari dan saringan). Untuk outlet, tekan **Ekspor Excel** untuk mendapat kode OT-… bagi file stok titipan.

Impor stok titipan yang sama dua kali ditolak, karena stok di rak akan berlipat.

### Bila ada yang salah

**Impor Excel → Riwayat impor → Batalkan impor** membalik semua baris dari sesi itu, selama datanya belum dipakai (misalnya outletnya belum dikunjungi). Pembatalan tidak pernah setengah jalan: bila satu baris tidak bisa dibalik, seluruh sesi tetap. Perbaiki file, lalu impor ulang.

Outlet atau produk yang ternyata dobel setelah impor bisa digabung dari halaman datanya (**Gabungkan**). Seluruh riwayat pindah ke data yang dipertahankan.

## 5. Stok gudang

Stok gudang dicatat lewat **Gudang → Barang masuk**, per produk dengan **nomor batch**, **ED**, dan **jumlah**, sesuai hasil hitung fisik pada tanggal mulai. Setelah itu jalankan **Opname** sekali untuk memastikan angka sistem sama dengan fisik.

## 6. Daftar periksa setelah migrasi

- [ ] Jumlah outlet di SIGAP sama dengan jumlah di Excel, dikurangi yang digabung.
- [ ] Setiap outlet punya sales penanggung jawab (kolom **Sales** di daftar outlet tidak bertuliskan "Belum ada").
- [ ] Harga jual 5 produk acak sama dengan daftar harga lama.
- [ ] **Daftar harga** per jenis outlet sudah benar setelah potongan dimasukkan (**Potongan → Tambah potongan**).
- [ ] Stok titipan 5 outlet acak sama dengan rekap terakhir (profil outlet → stok titipan).
- [ ] Stok gudang sama dengan hitungan fisik (laporan **Kedaluwarsa per produk** dan **Gudang → Stok**).
- [ ] Setiap sales sudah masuk di HP-nya, memasang SIGAP di layar utama, dan melihat outletnya sendiri.

## 7. Berjalan berdampingan dengan Excel

Sesuai SDD §11:

| Tahap | Lama | Yang dilakukan |
| --- | --- | --- |
| Uji coba | 2 pekan | 1 sales, 1 kabupaten. Kunjungan dicatat di SIGAP **dan** di Excel. Setiap akhir pekan, admin membandingkan laku, tagihan, dan sisa stok keduanya |
| Rollout | Setelah uji coba lancar | Semua sales dan wilayah memakai SIGAP. Excel berhenti diisi; laporan diambil dari **Laporan** (bisa diunduh ke Excel) |

Selisih yang ditemukan saat uji coba diperbaiki lewat fitur koreksi (lihat [Panduan Penggunaan §6](Panduan_Penggunaan.md#6-memperbaiki-kesalahan)), bukan dengan mengubah data di basis data langsung.
