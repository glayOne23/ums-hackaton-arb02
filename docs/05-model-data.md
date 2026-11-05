# 05 · Model data

Target: **10 tabel inti** (draf solusi §10, Tabel C.4 proposal), ditambah satu tabel untuk prediksi. Sejak desain Figma 5 Nov 2026 ditambah `pesanan_riwayat`, `pembayaran`, dan `penerimaan`.

| Tabel | Kolom utama | Catatan |
|---|---|---|
| `users` | nama, username, no. HP (WhatsApp), email, **peran**, wilayah/lokasi kerja, **status** (menunggu aktivasi / aktif / nonaktif), alasan nonaktif, login terakhir | `auth.User` + grup Django; hak akses per modul disimpan sebagai izin grup |
| `target` | sales, bulan, target omzet | Diatur direktur |
| `outlet` | kode, nama, jenis, PIC, no. HP (unik, dirapikan), alamat, lat/lng, sales (FK user), tempo (hari), **siklus_order_hari**, order_terakhir, kunjungan_terakhir, status validasi | Outlet baru dari sales berstatus menunggu validasi |
| `produk` | kode, nama, satuan, harga, no. BPOM, **stok_fisik**, **stok_dipesan**, stok_minimum | Stok tersedia = fisik − dipesan (dihitung, tidak disimpan) |
| `batch` | produk, no_batch (unik), **kedaluwarsa**, jumlah_masuk, **sisa**, tanggal_masuk | Dasar FEFO |
| `kunjungan` | sales, outlet, waktu, lat/lng, hasil, alasan lewati check-in, catatan | Check-in dan hasil kunjungan |
| `pesanan` | **client_uuid** (unik, dari HP), outlet, sales (penanggung jawab), kunjungan, status, **di_acc_oleh/pada**, **ketentuan_bayar** (tunai/tempo), **lama_tempo**, jatuh tempo, catatan_gudang, no_ref_outlet, status bayar, dibuat_di_hp, diterima_server, dikirim_oleh/pada, ditolak/dibatalkan_oleh/alasan, **selesai_oleh/pada/alasan**, perlu_perhatian | Status: menunggu ACC / di-ACC / dikirim / dikirim sebagian / selesai / ditolak / batal |
| `pesanan_item` | pesanan, produk, jumlah diminta, jumlah dicadangkan, **jumlah dikirim**, **jumlah kurang**, **jumlah dibatalkan**, harga, keterangan | Kekurangan > 0 = masuk daftar Belum lengkap · urgent |
| `pesanan_riwayat` | pesanan, waktu, oleh, jenis (dibuat/diubah/ACC/tolak/kirim/urgent/selesai/buka kembali/bayar), keterangan, perubahan (JSON) | **Append-only**; ditampilkan sebagai "Riwayat transaksi pesanan" |
| `pembayaran` | no. pembayaran, pesanan, tanggal, nominal, metode (transfer/tunai/giro), file bukti, catatan, dicatat_oleh, koreksi_dari | **Append-only**; koreksi oleh direktur sebagai baris baru |
| `penerimaan` | no. penerimaan, tanggal, sumber (produksi/pemasok), dokumen (berita acara/surat jalan, PO), jumlah surat jalan, jumlah diterima, hasil pemeriksaan, catatan, diterima_oleh, foto dokumen | Satu penerimaan = satu batch masuk; terkunci setelah disimpan |
| `pengiriman_batch` | pesanan_item, batch, jumlah | Dasar telusur batch ke outlet |
| `mutasi_stok` | produk, batch, jenis (masuk/pesan/batal/kirim/**karantina**/penyesuaian), Δfisik, Δdipesan, fisik_sesudah, dipesan_sesudah, referensi, oleh, alasan, waktu | **Append-only** |
| `permintaan_mingguan` | produk, minggu (Senin), jumlah, sumber (impor Excel / sintetis) | Riwayat dari luar SIGAP untuk prediksi |

## Urutan membangun

1. `users` + grup peran, `produk`, `batch`, `mutasi_stok` (fondasi aturan stok).
2. `outlet`, `pesanan`, `pesanan_item`, `pengiriman_batch` (pesanan dan FEFO).
3. `kunjungan` (check-in, kunjungan hari ini, siklus order).
4. `target`, `permintaan_mingguan` (dashboard dan prediksi).

## Aturan data

- `mutasi_stok`, `pesanan_riwayat`, dan `pembayaran` **hanya ditambah**, tidak pernah diubah atau dihapus.
- `penerimaan` terkunci setelah disimpan; selisih dikoreksi lewat opname (`mutasi_stok` jenis penyesuaian).
- `users` yang punya transaksi tidak dihapus, hanya `status = nonaktif`.
- `pesanan.client_uuid` **unik**; pengiriman ulang dengan kode sama dijawab "duplikat".
- Semua perubahan stok lewat satu lapisan layanan (mis. modul `stok`) dalam `transaction.atomic` + `select_for_update()`, bukan mengubah kolom langsung dari view atau admin.
- Nomor HP outlet disimpan dalam format yang sudah dirapikan (`08xx`) agar cek duplikat konsisten.
