# 02 · Pengguna dan tugas

Empat peran, sesuai laman tantangan dan proposal. Semua tugas di bawah adalah hal yang **harus bisa dilakukan pengguna** di SIGAP; kode layar merujuk ke [04-layar.md](04-layar.md).

## Peran dan hak akses

| Peran | Perangkat | Boleh | Tidak boleh |
|---|---|---|---|
| **Sales** | HP (PWA) | Lihat outlet miliknya saja; check-in; buat pesanan; lihat stok **tersedia**; daftarkan outlet baru (menunggu validasi) | Mengubah stok, harga, status bayar; melihat outlet sales lain |
| **Admin penjualan** | PC | Kelola outlet dan impor Excel; gabung duplikat; validasi outlet baru; **ACC atau tolak pesanan** dan menentukan ketentuan bayar; ubah pesanan (alasan wajib); batalkan pesanan; tandai selesai; catat pembayaran (bisa sebagian); atur harga jual | Mengubah stok; mengubah atau menghapus pembayaran yang sudah disimpan |
| **Admin gudang** | PC | Kelola produk (tanpa harga jual); barang masuk per batch; proses kirim FEFO dan **kirim sebagian** dengan alasan; kirim susulan; penyesuaian stok/opname (alasan wajib); telusur batch | Melihat pembayaran; mengubah harga jual; mengelola akun; menghapus data stok |
| **Direktur** | PC | Dashboard dan semua laporan; atur target sales; **kelola akun dan hak akses peran** (U1, U2); koreksi pembayaran sebagai entri baru | Mengubah transaksi lama |

Hak akses per modul (penuh / terbatas / lihat) mengikuti matriks di layar U2 Figma dan bisa diubah direktur (U2a). Implementasi: grup dan izin bawaan Django; menu tampil sesuai peran; pembatasan "sales hanya melihat outletnya" diterapkan di kueri endpoint halaman sales (uji #19/#23).

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
8. Pantau status pesanan: menunggu sinyal, menunggu ACC, di-ACC, dikirim / dikirim sebagian, selesai, ditolak (S4, S4a); tindak lanjuti pesanan ditolak (S4c, usulan). Status ACC dan kirim sebagian belum ada di desain HP.
10. Lihat profil, data di HP, lalu keluar setelah antrean kosong (S1b, usulan).
9. Daftarkan outlet baru yang belum terdaftar (S1a).

### Admin penjualan (PC)
1. Masuk dan lihat dashboard admin penjualan (L1, D1).
2. Impor data outlet dari Excel, lalu gabung kemungkinan duplikat (S5b, S5c).
3. Validasi outlet baru dari sales (S5e); ubah atau tambah outlet (S5a, S5d).
4. **ACC pesanan dari HP** (S6j → S6f): lihat info stok, tentukan ketentuan bayar (tunai saat barang diterima atau tempo + jatuh tempo), beri catatan untuk gudang, lalu teruskan ke gudang (S6n). Atau tolak pesanan.
5. Ubah isi pesanan selama belum di-ACC, dengan alasan wajib; sales diberi tahu (S6q).
6. Ubah pesanan yang sudah jalan: status, tempo/jatuh tempo, sales penanggung jawab; item terkunci setelah dikirim (S6p).
7. Batalkan pesanan sebelum kirim dengan alasan wajib (S6a).
8. Catat pembayaran, termasuk sebagian/DP, dengan bukti wajib; lihat bukti; pantau riwayat pembayaran dan piutang (S6c, S6o, S6e, S6d, S6m).
9. Tangani **perlu perhatian** (S6k): pesanan menunggu ACC dan kiriman belum lengkap. Tandai selesai dengan alasan: kekurangan menyusul, sisa dibatalkan (tagihan dihitung ulang), atau diganti produk lain (S6h → S6g → S6i).

### Admin gudang (PC)
1. Masuk dan lihat dashboard admin gudang (L1, D2).
2. Catat **barang masuk per batch** dengan tanggal kedaluwarsa (S7a).
3. Lakukan **opname**/penyesuaian stok dengan alasan (S7b).
4. Ubah data produk atau tambah produk baru dengan stok awal 0 (S7c, S7d usulan).
5. Lihat riwayat barang masuk dan detail penerimaan, termasuk selisih dengan surat jalan (S7e, S7f).
6. **Proses kirim** pesanan yang sudah di-ACC: batch FEFO terisi otomatis dan bisa dipindah ke batch lain; konfirmasi kirim (S8 → S8a).
7. **Kirim sebagian** bila barang di rak kurang/rusak: alasan wajib, barang rusak ke karantina, kekurangan masuk **Belum lengkap · urgent** (S8c → S8d); kirim susulan setelah barang masuk.
8. **Telusur batch** untuk keluhan atau penarikan produk, hubungi PIC outlet, unduh daftar penerima (S8e).

### Direktur (PC)
1. Pantau dashboard: performa sales vs target, outlet paling aktif, perputaran stok, stok menipis, mendekati kedaluwarsa (S9).
2. Lihat prediksi penjualan 4 minggu dan saran produksi (S9).
3. Atur target sales (S9a).
4. Kelola akun: tambah (undangan WhatsApp), ubah, reset kata sandi, keluarkan dari perangkat, nonaktifkan dengan memindahkan outlet binaan (U1, U1a–c).
5. Atur hak akses tiap peran per modul (U2, U2a).

## Persona (dugaan, divalidasi ke mitra)

**Mas Budi, sales lapangan**: mengunjungi 8–15 outlet per hari dengan motor; HP Android kelas menengah; sinyal sering hilang. Butuh mencatat kunjungan dan pesanan dalam hitungan detik dan mengecek stok sebelum menjanjikan.

Desain dan prototipe tiap layar ada di Figma "SIGAP · Hi-fi v2"; alurnya di [04b-user-flow.md](04b-user-flow.md).
