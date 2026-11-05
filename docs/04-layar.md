# 04 · Layar

Kode layar sama dengan nama frame di Figma **"SIGAP · Hi-fi v2"** ([buka](https://www.figma.com/design/cvBD4wgdf2jIGWW8NGOJZ7/SIGAP-%E2%80%94-Hi-fi-Prototype--ARB-02-?node-id=31-304)). Alur antar-layar ada di [04b-user-flow.md](04b-user-flow.md). Status per 5 Nov 2026.

Keterangan status: **Desain** = ada di Figma dan di proposal · **Usulan** = ditambahkan ke Figma, belum ada di proposal. Semua layar belum dikode di repo ini.

## Sales (HP, PWA)

| Kode | Layar | Isi utama | Status |
|---|---|---|---|
| S0 | Masuk / pasang di layar utama | Login sales, ajakan pasang PWA | Desain |
| S1 | Kunjungan hari ini | Capaian target bulan ini; outlet berurutan dengan label alasan; tombol outlet baru | Desain |
| S1a | Outlet baru | Data outlet, status menunggu validasi | Desain |
| S1b | Profil & keluar | Akun, data di HP, antrean, sinkron terakhir; keluar (antrean harus kosong) | Usulan |
| S2a | Check-in | GPS dan jam | Desain |
| S2d | Alasan lewati check-in | Alasan wajib, ditandai untuk admin | Usulan |
| S2 | Halaman outlet | Tagihan, jatuh tempo, 3 pesanan terakhir, buat pesanan, selesai kunjungan | Desain |
| S2c | Hasil kunjungan | Pesan / tidak order + alasan / tutup, check-out | Usulan |
| S3e | Form pesanan kosong | Semua jumlah 0; tombol Ulangi pesanan terakhir | Usulan |
| S3 | Form pesanan terisi | +/−, stok tersedia per jam sinkron, total, kirim | Desain |
| S3b | Form tanpa sinyal | Banner tanpa sinyal, Ulangi pesanan terakhir, simpan di HP | Desain |
| S3c | Katalog semua produk | Daftar 16 produk | Desain |
| S4 | Pesanan saya | Antrean menunggu sinyal, diterima, sebagian, ditolak; Kirim sekarang | Desain |
| S4a | Detail pesanan | Rincian diminta vs diterima | Desain |
| S4b | Pesanan tersimpan | Outlet ditandai selesai, saran outlet berikutnya | Usulan |
| S4c | Tindak lanjut ditolak | Pesan produk pengganti atau kabari outlet | Usulan |
| S4d | Antrean terkirim | Hasil Kirim sekarang: antrean kosong, status pesanan diperbarui | Usulan |

## Kantor (PC)

| Kode | Layar | Peran | Status |
|---|---|---|---|
| L1 | Masuk kantor | Semua | Desain |
| L1a | Lupa kata sandi | Semua | Desain |
| D1 | Dashboard admin penjualan | Admin penjualan | Desain |
| D2 | Dashboard admin gudang | Admin gudang | Desain |
| S5 | Kelola outlet | Admin penjualan | Desain |
| S5a / S5d | Ubah / tambah outlet | Admin penjualan | Desain |
| S5b | Impor Excel | Admin penjualan | Desain |
| S5c | Gabung kemungkinan duplikat | Admin penjualan | Desain |
| S5e | Validasi outlet baru dari sales | Admin penjualan | Desain |
| S6 | Kelola pesanan | Admin penjualan | Desain |
| S6a | Batalkan pesanan (alasan wajib) | Admin penjualan | Desain |
| S6c / S6e / S6d | Catat pembayaran / bukti transfer / lunas | Admin penjualan | Desain |
| S7 | Produk dan stok (fisik, dipesan, tersedia) | Admin gudang | Desain |
| S7a | Barang masuk per batch | Admin gudang | Desain |
| S7b | Penyesuaian / opname | Admin gudang | Desain |
| S7c | Ubah data produk | Admin gudang | Desain |
| S7d | Tambah produk baru (stok awal 0) | Admin gudang | Usulan |
| S8 | Pengiriman dan telusur batch | Admin gudang | Desain |
| S8a | Konfirmasi kirim FEFO | Admin gudang | Desain |
| S9 | Dashboard direktur | Direktur | Desain |
| S9a | Atur target sales | Direktur | Desain |

Layar lain di Figma (S6b, S8b, dan varian keadaan) dicek langsung di file Figma.

## Catatan desain

- Warna dan komponen mengikuti Figma: hijau tua `#14532D`, hijau `#15803D`, font Roboto. Token warna ada di halaman **Komponen** file Figma "SIGAP — Hi-fi Prototype (ARB-02)".
- Data di Figma adalah **data contoh** yang konsisten antar-layar (misalnya batch PR-2603: 15 masuk, sisa 9, 6 terkirim ke 3 outlet).
- Masalah UI yang sudah diketahui: sapaan di S1 (pembuka S1b) belum punya penanda bisa diketuk; outlet ke-3 dan ke-4 di S1 belum punya layar check-in sendiri. (Tombol "Outlet baru" di S1 yang menutupi kartu outlet ke-5 sudah diganti chip "+ Outlet baru" di kepala kartu, 5 Nov 2026.) Lihat [referensi/review-figma-hifi-v2.md](../referensi/review-figma-hifi-v2.md).
