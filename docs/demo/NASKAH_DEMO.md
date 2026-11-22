# Naskah Demo SIGAP (±4 menit)

Untuk Demo Day 28–29 Nov 2026. Alur mengikuti 7 skenario uji penerimaan di [SRS §7](../pengembangan/02_Software_Requirements_Specification.md). Semua nama outlet, produk, dan akun adalah **data fiktif**; "Sales Satu" berperan sebagai sales lapangan.

Gladi otomatis untuk alur ini: `npm run test:demo` (lihat bagian Persiapan). Bila tes itu lulus, alur di bawah pasti bisa diperagakan.

## Perangkat dan peran di panggung

| Siapa | Perangkat | Akun | Layar awal |
| --- | --- | --- | --- |
| Penyaji 1 (kantor, gudang, pimpinan) | Laptop ke proyektor | `kantor`, `gudang`, `pimpinan` (tiga tab) | Impor Excel |
| Penyaji 2 (sales) | HP Android, layar dicerminkan | `sales1` | Outlet saya |

Kata sandi semua akun: `sigap123`.

> **Wajib:** aplikasi yang dibuka adalah **hasil build** (server ber-HTTPS atau `npm run preview` di laptop), **bukan** `npm run dev`. Tanpa service worker, layar yang belum pernah dibuka tidak bisa tampil saat sinyal mati, dan langkah 4 berakhir dengan layar putih. HP yang membuka alamat laptop lewat `http://192.168.…` juga tidak mendapat service worker, karena hanya HTTPS atau `localhost` yang diizinkan browser. Karena itu HP harus membuka **alamat HTTPS** server.

## Persiapan

**H-1 (sekali):**

1. Pasang SIGAP di layar utama HP dari alamat HTTPS, lalu masuk sebagai `sales1`.
2. Jalankan gladi lengkap di laptop:
   ```bash
   cd backend && php artisan migrate:fresh --seed --seeder=DemoSeeder
   cd ../frontend && npm run test:demo      # 9 tes harus lulus
   ```

**30 menit sebelum tampil:**

1. Reset data demo: `php artisan migrate:fresh --seed --seeder=DemoSeeder` (outlet dan stok titipan sengaja kosong, karena keduanya diimpor di langkah 1).
2. Pastikan `queue:listen` berjalan (untuk notifikasi).
3. Di laptop: buka tiga tab dan masuk sebagai `kantor`, `gudang`, dan `pimpinan`.
4. Di HP: buka SIGAP sebagai `sales1`, lalu buka "Outlet saya" sekali sambil masih ada sinyal.
5. Siapkan file [1-outlet-oktober.csv](1-outlet-oktober.csv) dan [2-stok-titipan-oktober.csv](2-stok-titipan-oktober.csv) di laptop.

## Alur

| Waktu | Langkah (SRS §7) | Siapa | Yang dilakukan | Yang terlihat | Kalimat penyaji |
| --- | --- | --- | --- | --- | --- |
| 0:00–0:20 | Pembuka | Penyaji 1 | — | Layar Ringkasan kosong | "Hari ini catatan kunjungan CV Arba'in disalin dari nota ke 4–5 file Excel. Kami tunjukkan satu hari kerja dengan SIGAP." |
| 0:20–0:50 | 1. Impor data lama | Kantor | Impor Excel → Outlet → pilih `1-outlet-oktober.csv` → pilih **Gabung** di dua baris mirip → Impor. Lalu Stok titipan awal → `2-stok-titipan-oktober.csv` → Impor | "6 baris · 4 siap · 2 mirip" → "4 outlet diimpor, 2 digabung." | "Data lama masuk dari Excel. Dua outlet yang ditulis beda (AP vs Apotek) langsung ketahuan dan digabung, bukan jadi dobel." |
| 0:50–1:10 | 2. Barang masuk | Gudang | Gudang → Barang masuk → Madu Pahit Contoh 470 g, batch **B-2611**, ED **30/11/2028**, **100** → Simpan | Batch B-2611 di daftar | "Setiap barang tercatat dengan batch dan kedaluwarsanya. Ini yang membuat penarikan ED nanti bisa dilacak." |
| 1:10–1:40 | 3. Minta barang | Sales → Gudang | HP: Hari ini → Minta barang → Madu Pahit + sampai **24** → Kirim. Laptop: Permintaan sales → **Siapkan & keluarkan** | HP: "Sudah keluar", stok bawaan 24 | "Sales minta barang dari HP tanpa mengetik huruf. Gudang menyetujui dengan satu klik. Batch dipilih otomatis, ED terdekat dulu." |
| 1:40–2:40 | 4. Kunjungan tanpa sinyal | Sales | **Matikan data/Wi-Fi HP.** Outlet saya → Apotek Sari Sehat Contoh → Madu Pahit: sisa **4 → 1** (tekan − tiga kali) → Lanjut → foto form → **Dibayar semua** | "Laku 3 · Rp 189.000", isi ulang sudah 3, stok akhir 4; "Laku 3 pcs (lebih dari 2): sebaiknya ditagih sekarang"; "Tersimpan di HP, akan terkirim saat ada sinyal" | "Sales hanya mengubah yang berbeda. Laku, potongan apotek 16%, dan saran isi ulang dihitung sendiri. Semua ini tanpa sinyal." |
| 2:40–3:00 | 5. Tidak ada yang laku | Sales | Ke outlet berikutnya → Toko Herbal Barokah Contoh → **Tidak ada yang laku**. **Nyalakan lagi sinyal** | Nota tersimpan; antrean "2 kunjungan tersimpan di HP" lalu hilang | "Kunjungan tanpa perubahan cukup satu ketukan, di bawah 15 detik. Begitu ada sinyal, terkirim sendiri, tidak pernah dobel." |
| 3:00–3:30 | 6. Ubah aturan | Kantor → Sales | Pengaturan → "Sarankan tagih bila laku lebih dari" **3** → Simpan. HP: tutup lalu buka lagi SIGAP (paket kerja dan aturan dimuat ulang) → Apotek Pandawa Contoh → sisa − tiga kali → Lanjut | "Laku 3 pcs (tidak lebih dari 3)", tanpa saran tagih | "Aturan bisnis ada di menu Pengaturan, bukan di program. Kebijakan berubah, aplikasi ikut tanpa programmer." |
| 3:30–3:55 | 7. Ringkasan pimpinan | Pimpinan | Muat ulang Ringkasan | Performa Sales Satu, Apotek Sari Sehat di Outlet paling aktif, Madu Pahit di Perputaran stok | "Pimpinan tidak perlu menunggu akhir bulan. Omzet, outlet teraktif, dan produk yang lambat laku terlihat hari itu juga." |
| 3:55–4:00 | Penutup | Penyaji 1 | — | — | "Satu catatan di HP memperbarui stok, tagihan, dan laporan sekaligus." |

Setelah demo, kembalikan batas tagih ke **2** (Pengaturan) bila demo akan diulang tanpa reset.

## Bila ada yang tidak berjalan

| Masalah | Tindakan cepat |
| --- | --- |
| Layar putih di HP setelah sinyal dimatikan | Aplikasi dibuka dari `npm run dev` atau alamat `http://`. Nyalakan sinyal, muat ulang, lanjutkan langkah 4 tanpa mematikan sinyal, lalu jelaskan mode tanpa sinyal secara lisan |
| "2 mirip" tidak muncul saat impor | Data belum di-reset. Jalankan ulang `migrate:fresh --seed --seeder=DemoSeeder` |
| Madu Pahit tidak ada di stok bawaan | Langkah 3 belum dikeluarkan gudang, atau HP belum memuat ulang paket kerja: tutup lalu buka lagi SIGAP selagi ada sinyal |
| "Terlalu banyak percobaan" saat masuk | Batas 6 kali per menit per akun. Tunggu satu menit, atau masuk sebelum tampil (Persiapan langkah 3–4) |
| Proyektor/internet panggung bermasalah | Putar rekaman layar gladi (rekam saat H-1) |
