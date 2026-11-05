# 05 · Model data

Target: **10 tabel inti** (draf solusi §10, Tabel C.4 proposal), ditambah satu tabel untuk prediksi.

| Tabel | Kolom utama | Catatan |
|---|---|---|
| `users` | nama, no. HP, **peran** (sales / admin_penjualan / admin_gudang / direktur) | Bisa memakai `auth.User` + grup Django |
| `target` | sales, bulan, target omzet | Diatur direktur |
| `outlet` | kode, nama, jenis, PIC, no. HP (unik, dirapikan), alamat, lat/lng, sales (FK user), tempo (hari), **siklus_order_hari**, order_terakhir, kunjungan_terakhir, status validasi | Outlet baru dari sales berstatus menunggu validasi |
| `produk` | kode, nama, satuan, harga, no. BPOM, **stok_fisik**, **stok_dipesan**, stok_minimum | Stok tersedia = fisik − dipesan (dihitung, tidak disimpan) |
| `batch` | produk, no_batch (unik), **kedaluwarsa**, jumlah_masuk, **sisa**, tanggal_masuk | Dasar FEFO |
| `kunjungan` | sales, outlet, waktu, lat/lng, hasil, alasan lewati check-in, catatan | Check-in dan hasil kunjungan |
| `pesanan` | **client_uuid** (unik, dari HP), outlet, sales, kunjungan, status, jatuh tempo, status bayar, dibuat_di_hp, diterima_server, dikirim_oleh/pada, dibatalkan_oleh/alasan, dilunasi_pada, perlu_perhatian | Status: diterima / diterima sebagian / ditolak / dikirim / batal |
| `pesanan_item` | pesanan, produk, jumlah diminta, jumlah diterima, harga, keterangan | Baris bisa diterima sebagian |
| `pengiriman_batch` | pesanan_item, batch, jumlah | Dasar telusur batch ke outlet |
| `mutasi_stok` | produk, batch, jenis (masuk/pesan/batal/kirim/penyesuaian), Δfisik, Δdipesan, fisik_sesudah, dipesan_sesudah, referensi, oleh, alasan, waktu | **Append-only** |
| `permintaan_mingguan` | produk, minggu (Senin), jumlah, sumber (impor Excel / sintetis) | Riwayat dari luar SIGAP untuk prediksi |

## Urutan membangun

1. `users` + grup peran, `produk`, `batch`, `mutasi_stok` (fondasi aturan stok).
2. `outlet`, `pesanan`, `pesanan_item`, `pengiriman_batch` (pesanan dan FEFO).
3. `kunjungan` (check-in, kunjungan hari ini, siklus order).
4. `target`, `permintaan_mingguan` (dashboard dan prediksi).

## Aturan data

- `mutasi_stok` **hanya ditambah**, tidak pernah diubah atau dihapus.
- `pesanan.client_uuid` **unik**; pengiriman ulang dengan kode sama dijawab "duplikat".
- Semua perubahan stok lewat satu lapisan layanan (mis. modul `stok`) dalam `transaction.atomic` + `select_for_update()`, bukan mengubah kolom langsung dari view atau admin.
- Nomor HP outlet disimpan dalam format yang sudah dirapikan (`08xx`) agar cek duplikat konsisten.
