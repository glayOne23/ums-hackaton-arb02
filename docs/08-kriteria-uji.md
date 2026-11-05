# 08 · Kriteria uji

Sebuah fitur dianggap selesai bila uji otomatisnya lulus dan QA (Reza) menyatakan lulus. Kriteria 1–22 berasal dari Lampiran C.5 proposal v03; kriteria 23–29 dari Lampiran C.6 dan backlog.

## Mode tanpa sinyal dan pesanan

| No | Kriteria |
|---|---|
| 1 | Katalog produk dan outlet dimuat dari server |
| 2 | Tanpa sinyal, pesanan tersimpan di HP (IndexedDB) dengan status "menunggu sinyal" |
| 3 | Server belum menerima pesanan selama tanpa sinyal |
| 4 | Selama tanpa sinyal, pesanan tetap aman di HP |
| 5 | Sinyal kembali: pesanan terkirim otomatis tanpa input ulang |
| 6 | Pengiriman ulang dengan kode unik yang sama dijawab "duplikat" |
| 7 | Server mencatat tepat satu pesanan |
| 28 | PWA: halaman dibuka dari nol dan di-refresh tanpa sinyal |
| 27 | Mode tanpa sinyal diuji di HP Android sungguhan dalam mode pesawat |

## Stok

| No | Kriteria |
|---|---|
| 8 | Pesanan diterima: stok tersedia berkurang tepat sekali, stok fisik tetap |
| 9 | Setiap perubahan stok tercatat di riwayat mutasi |
| 10 | Peringatan stok menipis muncul bila tersedia ≤ minimum |
| 11 | Pesanan melebihi stok tersedia ditolak ("sisa stok tersedia X"), stok tidak minus |
| 12 | Konfirmasi kirim: stok fisik dan dipesan berkurang, tersedia tetap |
| 13 | FEFO: batch dengan kedaluwarsa terdekat terpakai lebih dulu, walaupun masuk belakangan |
| 14 | Batal sebelum kirim: stok dipesan kembali, fisik tetap |
| 15 | Opname saat ada pesanan belum dikirim: hitungan rak sama dengan stok fisik, tanpa selisih palsu |
| 16 | Penyesuaian stok mencatat selisih, batch, dan alasan |
| 17 | Dua pesanan bersamaan untuk stok terakhir: satu diterima, satu ditolak, stok tidak minus |
| 18 | Dua HP tanpa sinyal memesan stok terakhir: setelah sinyal kembali satu diterima, satu ditolak |
| 19 | Telusur batch menampilkan outlet penerima yang benar |

## Prediksi

| No | Kriteria |
|---|---|
| 20 | Prediksi tersedia per produk: ramalan 4 minggu dan saran produksi sesuai rumus |
| 21 | Permintaan minggu berjalan menghitung baris yang ditolak dan mengabaikan pesanan batal |
| 22 | Pada data uji, WAPE model lebih kecil daripada ramalan naif |

## Peran, kunjungan, impor, dashboard

| No | Kriteria |
|---|---|
| 23 | Sales hanya melihat outlet miliknya; admin gudang tidak dapat mengubah status bayar |
| 24 | Kunjungan hari ini menampilkan urutan dan alasan sesuai aturan bisnis §2 |
| 25 | Impor Excel merapikan nomor HP dan menandai kemungkinan duplikat |
| 26 | Dashboard direktur menampilkan performa sales, outlet paling aktif, dan perputaran stok |
| 29 | Check-in menyimpan lokasi dan jam; lewati check-in mewajibkan alasan |

## Uji pengguna (setelah hackathon)

- Input pesanan ulang ≤ 15 detik
- SUS ≥ 70
- ≥ 90% tugas inti berhasil tanpa bantuan
- Nol input berulang
- Selisih stok saat opname turun ≥ 50% dari kondisi awal
- Validasi dengan ≥ 5 narasumber mitra (sales, admin penjualan, admin gudang, direktur)
