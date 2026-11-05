# 09 · Celah dan keputusan terbuka

Sebelum membangun fitur di daftar ini, pastikan keputusannya sudah diambil oleh pemilik jobdesk (kebutuhan: Purwo; teknis: Ridwan). Detail celah alur ada di [referensi/review-figma-hifi-v2.md](../referensi/review-figma-hifi-v2.md).

## Keputusan yang belum diambil

| Hal | Usulan sementara | Pemutus |
|---|---|---|
| Ambang jatuh tempo untuk Kunjungan hari ini | ≤ 3 hari | Purwo (konfirmasi mitra) |
| Ambang "lama tidak dikunjungi" | 30 hari | Purwo |
| Ambang "mendekati kedaluwarsa" | ≤ 90 hari | Purwo |
| Siklus order bawaan (< 3 pesanan) | 14 hari | Purwo |
| FEFO otomatis penuh, atau admin gudang boleh memilih batch lain | Otomatis | Purwo + Ridwan |
| Pustaka impor Excel | `django-import-export` | Ridwan |
| Lingkup klien maklon (selain outlet) | Di luar MVP | Mitra |
| Harga produk baru perlu persetujuan direktur? | Harga jual diatur admin penjualan (U2a) | Mitra |
| ACC untuk semua pesanan, atau hanya yang stoknya kurang / outlet menunggak? | Figma: semua pesanan. Usul MVP: ACC otomatis bila stok cukup dan outlet tidak menunggak | Purwo (konfirmasi mitra) |
| Stok kurang saat pesanan tiba: tolak baris otomatis, atau catat kekurangan untuk diputuskan saat ACC? | Catat kekurangan, tidak menahan stok, barang masuk dicadangkan dulu untuk kekurangan | Purwo + Ridwan |
| Lama tempo bawaan saat ACC | Sama dengan siklus order outlet (mis. 14 hari) | Mitra |

## Pertanyaan untuk mitra (dibawa ke clinic 6 Nov)

Daftar lengkap ada di Notion, halaman ["1. Daftar Pertanyaan untuk Mitra"](https://app.notion.com/p/4081d04a08918180be65e151c4616037). Yang paling memengaruhi kode:

- Jumlah sales, outlet aktif, SKU, dan gudang saat ini.
- Alur pesanan dari sales sampai barang diterima outlet; apakah outlet juga memesan langsung lewat telepon/WhatsApp.
- Harga/diskon per outlet; satuan (pcs, dus).
- Tempo pembayaran; siapa menyetujui pesanan bila outlet masih punya tagihan.
- Frekuensi opname dan selisih stok saat ini; apakah batch dan kedaluwarsa sudah dicatat.
- Format data saat ini (buku, Excel), ketersediaan dummy data dan rekap penjualan.
- HP sales dan kondisi sinyal; kesediaan check-in GPS.

## Celah alur prioritas tinggi (belum ada di desain maupun proposal)

| Celah | Peran |
|---|---|
| Retur / barang kedaluwarsa dari outlet | Sales, gudang |
| Edit atau batalkan pesanan yang masih di antrean HP | Sales |
| Outlet baru ditolak: nasib pesanan yang tertahan | Admin penjualan |
| Recall batch setelah telusur (blokir dari FEFO, catat barang kembali) | Admin gudang |
| Notifikasi antar-peran (pesanan ditolak, outlet baru masuk) | Semua |

## Masalah Figma yang masih terbuka

Daftar lengkap (termasuk data yang bertentangan) ada di bagian "Perubahan Figma 5 Nov 2026 (malam)" pada [referensi/review-figma-hifi-v2.md](../referensi/review-figma-hifi-v2.md). Yang paling memengaruhi kode:

- Sisi sales (S4, S4a) belum punya status menunggu ACC, dikirim sebagian, selesai, dan notifikasi perubahan dari admin.
- Tolak pesanan, kirim susulan, dan penarikan batch belum punya layar.
- S6q memakai harga yang berbeda dari S3/S7c; kolom harga masih ada di layar admin gudang padahal harga milik admin penjualan.

- Outlet ke-2 di S1 langsung membuka S3b tanpa check-in (jalan pintas demo).
- Outlet ke-3 dan ke-4 di S1 belum punya layar check-in/halaman outlet sendiri (tautannya dilepas 5 Nov 2026).
- Sapaan "Halo, Budi" di S1 membuka S1b Profil, tetapi belum ada penanda visual bisa diketuk.

Sudah diselesaikan 5 Nov 2026: tombol Ulangi di S3b, "Kirim sekarang" → S4d, layar profil/keluar S1b.
