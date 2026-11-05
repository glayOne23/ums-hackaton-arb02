# 02 · Pengguna dan tugas

Empat peran, sesuai laman tantangan dan proposal. Semua tugas di bawah adalah hal yang **harus bisa dilakukan pengguna** di SIGAP; kode layar merujuk ke [04-layar.md](04-layar.md).

## Peran dan hak akses

| Peran | Perangkat | Boleh | Tidak boleh |
|---|---|---|---|
| **Sales** | HP (PWA) | Lihat outlet miliknya saja; check-in; buat pesanan; lihat stok **tersedia**; daftarkan outlet baru (menunggu validasi) | Mengubah stok, harga, status bayar; melihat outlet sales lain |
| **Admin penjualan** | PC | Kelola outlet dan impor Excel; gabung duplikat; validasi outlet baru; batalkan pesanan (alasan wajib); catat pembayaran; tangani "perlu perhatian" | Mengubah stok fisik |
| **Admin gudang** | PC | Kelola produk; barang masuk per batch; konfirmasi kirim (FEFO); penyesuaian stok/opname (alasan wajib); telusur batch | Mengubah status bayar |
| **Direktur** | PC | Dashboard dan semua laporan; atur target sales; kelola pengguna | Mengubah transaksi |

Implementasi: grup dan izin bawaan Django; menu tampil sesuai peran; pembatasan "sales hanya melihat outletnya" diterapkan di kueri endpoint halaman sales (uji #19/#23).

## User stories

| No | Peran | Cerita | Prioritas |
|---|---|---|---|
| US1 | Sales | Mencatat kunjungan dan pesanan dari HP dalam hitungan detik meski sinyal lemah, agar tidak menghabiskan waktu di outlet | Tinggi |
| US2 | Sales | Melihat stok tersedia sebelum menjanjikan ke outlet | Tinggi |
| US3 | Admin gudang | Stok berkurang otomatis saat pesanan dibuat dan ada peringatan stok menipis | Tinggi |
| US4 | Direktur | Melihat kinerja sales harian/bulanan dan outlet paling aktif di satu dashboard | Tinggi |
| US5 | Sales | Melihat riwayat transaksi dan catatan setiap outlet | Sedang |
| US6 | Sales | Diingatkan outlet yang sudah waktunya pesan ulang atau jatuh tempo | Sedang |
| US7 | Admin penjualan | Prospek dari WhatsApp tercatat di CRM | Sedang (setelah MVP) |
| US8 | Direktur | Data lama dari buku/spreadsheet bisa dipindahkan | Sedang |

## Tugas per peran

### Sales (HP)
1. Pasang SIGAP di layar utama dan masuk (S0).
2. Buka **Kunjungan hari ini** dan ikuti urutan beserta alasannya (S1).
3. Pilih outlet, **check-in** dengan GPS dan jam (S2a); bila tidak bisa, lewati dengan alasan (S2d, usulan).
4. Lihat halaman outlet: tagihan, jatuh tempo, 3 pesanan terakhir (S2).
5. Buat pesanan: **Ulangi pesanan terakhir**, ubah jumlah +/−, lihat stok tersedia dan jam sinkron, kirim (S3e → S3).
6. Tanpa sinyal: simpan pesanan di HP; pesanan terkirim otomatis saat sinyal kembali (S3b).
7. Bila outlet tidak memesan, catat hasil kunjungan dan alasannya (S2c, usulan).
8. Pantau status pesanan: menunggu sinyal, diterima, diterima sebagian, ditolak (S4, S4a); tindak lanjuti pesanan ditolak (S4c, usulan).
9. Daftarkan outlet baru yang belum terdaftar (S1a).

### Admin penjualan (PC)
1. Masuk dan lihat dashboard admin penjualan (L1, D1).
2. Impor data outlet dari Excel, lalu gabung kemungkinan duplikat (S5b, S5c).
3. Validasi outlet baru dari sales (S5e); ubah atau tambah outlet (S5a, S5d).
4. Pantau pesanan; batalkan sebelum kirim dengan alasan wajib (S6, S6a).
5. Catat pembayaran, lihat bukti transfer, tandai lunas (S6c, S6e, S6d).
6. Tangani pesanan "perlu perhatian" (stok fisik < dipesan): kirim sebagian atau batal.

### Admin gudang (PC)
1. Masuk dan lihat dashboard admin gudang (L1, D2).
2. Catat **barang masuk per batch** dengan tanggal kedaluwarsa (S7a).
3. Lakukan **opname**/penyesuaian stok dengan alasan (S7b).
4. Ubah data produk atau tambah produk baru dengan stok awal 0 (S7c, S7d usulan).
5. **Konfirmasi kirim**; batch dipilih otomatis dengan FEFO (S8a).
6. **Telusur batch** untuk keluhan atau penarikan produk, unduh daftar outlet penerima (S8).

### Direktur (PC)
1. Pantau dashboard: performa sales vs target, outlet paling aktif, perputaran stok, stok menipis, mendekati kedaluwarsa (S9).
2. Lihat prediksi penjualan 4 minggu dan saran produksi (S9).
3. Atur target sales (S9a).

## Persona (dugaan, divalidasi ke mitra)

**Mas Budi, sales lapangan**: mengunjungi 8–15 outlet per hari dengan motor; HP Android kelas menengah; sinyal sering hilang. Butuh mencatat kunjungan dan pesanan dalam hitungan detik dan mengecek stok sebelum menjanjikan.

Desain dan prototipe tiap layar ada di Figma "SIGAP · Hi-fi v2"; alurnya di [04b-user-flow.md](04b-user-flow.md).
