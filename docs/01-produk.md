# 01 · Produk

Sumber: proposal v03 (4 Nov 2026) di [referensi/proposal-v03-substansi.txt](../referensi/proposal-v03-substansi.txt), [referensi/draf-solusi-gabungan.md](../referensi/draf-solusi-gabungan.md), dan riset mitra di [referensi/mitra-cv-arbain.md](../referensi/mitra-cv-arbain.md).

## Masalah

CV Arba'in Jaya Mandiri memasok produk herbal terdaftar BPOM ke apotek, toko obat, dan minimarket lewat sales lapangan. Data pelanggan, aktivitas sales, dan stok tercatat terpisah di buku dan chat. Akibatnya:

- riwayat pesanan outlet sulit ditelusuri;
- kunjungan dan kinerja sales tidak terpantau;
- stok di catatan tidak sama dengan isi gudang, sehingga sales bisa menjanjikan barang yang ternyata kosong;
- semua prospek dari situs masuk ke satu nomor WhatsApp tanpa basis data.

Skala (data 2014, perlu dikonfirmasi): 47 agen dan 1.027 outlet di Solo, Yogyakarta, dan Bandung.

## Problem statement

> **Mas Budi** adalah sales lapangan CV Arba'in yang mengunjungi banyak apotek dan minimarket per hari dengan sinyal yang sering hilang. Ia membutuhkan cara mencatat kunjungan dan pesanan dalam hitungan detik sambil mengetahui stok yang benar, karena pencatatan di buku dan chat memakan waktu, tidak sinkron dengan gudang, dan membuatnya menjanjikan barang yang ternyata kosong.

> **Direktur CV Arba'in** membutuhkan gambaran kinerja sales, outlet, dan stok tanpa mengumpulkan laporan manual, karena data tersebar di buku, chat, dan catatan gudang.

## Goal statement

> SIGAP memungkinkan sales, admin, dan direktur bekerja dari satu sumber data pelanggan, aktivitas sales, dan stok, sehingga setiap pesanan cukup diinput sekali, stok selalu sesuai gudang, dan kinerja sales terpantau.

## Ukuran keberhasilan

| Ukuran | Target | Cara ukur |
|---|---|---|
| Input pesanan ulang di HP | ≤ 15 detik | Stopwatch saat uji tugas |
| Input berulang untuk satu pesanan | 0 | Hitung tempat data yang sama diketik |
| Selisih stok sistem vs fisik saat opname | Turun ≥ 50% dari kondisi awal | Bandingkan opname sebelum dan sesudah pilot |
| Skor kegunaan | SUS ≥ 70 | Kuesioner SUS setelah uji tugas |
| Tugas inti berhasil tanpa bantuan | ≥ 90% | Uji tugas |

## Lima fitur inti (MVP)

1. **Data outlet terpusat dan impor Excel**: nomor HP dirapikan otomatis, nomor sama ditandai sebagai kemungkinan duplikat lalu digabung admin.
2. **Aplikasi sales di HP (PWA)**: kunjungan hari ini berprioritas dengan alasan, check-in GPS dan jam, ulangi pesanan terakhir, stok tersedia per jam sinkron, tetap jalan tanpa sinyal.
3. **Stok dan gudang**: stok fisik terpisah dari stok dipesan, barang masuk per batch dan kedaluwarsa, konfirmasi kirim dengan FEFO, opname, peringatan stok menipis, riwayat mutasi, telusur batch.
4. **Info outlet**: riwayat pesanan dan kunjungan, jatuh tempo dan status bayar, siklus order otomatis.
5. **Dashboard direktur**: performa sales, outlet paling aktif, perputaran stok, stok menipis, mendekati kedaluwarsa, prediksi penjualan 4 minggu dan saran produksi.

## Batasan dari mitra

- Sales harus bisa mencatat kunjungan dan pesanan dalam hitungan detik.
- Tetap andal di jaringan seluler yang tidak stabil.
- Fokus operasional B2B. **Modul akuntansi yang rumit tidak termasuk**; cukup jatuh tempo dan status bayar.
- Smartphone untuk sales, desktop untuk admin.

## Pembeda (untuk juri)

1. Sinkronisasi tanpa sinyal yang idempoten (antrean di HP + kode unik, prinsip *local-first*).
2. Kendali konkurensi stok: reservasi dalam satu transaksi dengan penguncian baris, stok tidak pernah minus.
3. Buku besar mutasi stok yang hanya ditambah.
4. Ketertelusuran batch dengan FEFO, sejalan dengan CPOTB (Peraturan BPOM 25/2021).
5. Siklus order dari median selang pesanan.

## Di luar MVP

Retur setelah kirim, banyak gudang, stok di mobil sales (kanvas), integrasi akuntansi, WhatsApp resmi, foto kunjungan, model prediksi musiman. Lihat [07-backlog-mvp.md](07-backlog-mvp.md).
