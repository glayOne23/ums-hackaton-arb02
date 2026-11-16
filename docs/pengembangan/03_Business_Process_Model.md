# Business_Process_Model — SIGAP CV Arba'in

16 November 2026 · Ren (Antech Async) · Versi online: https://claude.ai/artifact/YGEyzE3nvQ3MLHSZ2ksfSa

**Versi 2 — analisis ulang.** Alur diringkas: sales cukup mengubah yang berbeda, persetujuan hanya di barang keluar gudang dan perubahan potongan (keduanya bisa dimatikan), dan modul maklon dirancang terpisah di dokumen 06.

Dokumen ini memetakan proses CV Arba'in **saat ini (as-is)** dan **dengan SIGAP (to-be)**. Langkah bertanda **\[SIGAP\]** dicatat di aplikasi. Angka seperti "> 2 item" dan "6 bulan" adalah nilai awal di menu Pengaturan, bukan aturan yang dikunci di program.

## 0. Peta proses

| Kode | Proses | Pelaku | Keluaran |
| --- | --- | --- | --- |
| P1 | Barang masuk gudang | Admin Gudang | Stok + batch + ED |
| P2 | Barang keluar ke sales | Sales, Admin Gudang | Stok bawaan sales |
| P3 | Kunjungan outlet titip jual | Sales | Laku, tagihan, isi ulang, nota |
| P4 | Penjualan beli langsung / tempo | Sales, Admin Kantor | Nota & tagihan dengan jatuh tempo |
| P5 | Tagihan, pembayaran & setoran | Sales, Admin Kantor | Tagihan lunas, uang diterima |
| P6 | Retur, rusak & kedaluwarsa | Sales, Admin Gudang | Stok kembali / rework / musnah |
| P7 | Opname gudang | Admin Gudang | Selisih tertelusur |
| P8 | Data outlet, produk, potongan & pengaturan | Admin Kantor, Pimpinan | Data & aturan aktif |
| P9 | Laporan | Pimpinan, Admin Kantor | Ringkasan & 12 laporan |

## 1. Gambaran besar (to-be)

```mermaid
flowchart LR
  A["P1 Barang masuk<br/>gudang"] --> B["P2 Keluar ke sales"]
  B --> C["Stok bawaan sales"]
  C --> D["P3 Kunjungan titip jual"]
  C --> E["P4 Beli langsung / tempo"]
  D --> F["P5 Tagihan & setoran"]
  E --> F
  D --> G["Stok di outlet"]
  G --> D
  D --> H["P6 Retur ED/rusak"]
  C --> H
  H --> I["P7 Opname"]
  F --> J["P9 Laporan"]
  G --> J
  I --> J
```

Semua perpindahan barang (gudang → sales → outlet → kembali) tercatat otomatis dari kegiatan sehari-hari, jadi tidak ada lagi rekap yang diketik ulang.

## 2. P1 — Barang masuk gudang

|  | As-is | To-be |
| --- | --- | --- |
| Langkah | Produksi menyerahkan barang; admin mencatat jumlah, batch, ED di Excel | **\[SIGAP\]** Admin memilih produk, mengetik batch & ED, mengisi jumlah, lalu simpan |
| Hasil | Kartu stok di Excel | Stok gudang & kartu stok terbarui otomatis |

## 3. P2 — Barang keluar ke sales

```mermaid
flowchart LR
  s1["[SIGAP] Sales minta barang<br/>dari HP (sisa bawaan terlihat)"] --> a1["[SIGAP] Admin Gudang siapkan<br/>(batch ED terdekat otomatis)"]
  a1 --> q{"Stok cukup?"}
  q -- tidak --> a2["Kurangi jumlah<br/>+ catatan"]
  a2 --> k
  q -- ya --> k{"Persetujuan<br/>dinyalakan?"}
  k -- ya --> k1["[SIGAP] Setujui satu klik"]
  k -- tidak --> s2
  k1 --> s2["Sales terima barang"]
```

Sisa bawaan dari perjalanan sebelumnya otomatis ikut terhitung, jadi sales hanya meminta kekurangannya.

## 4. P3 — Kunjungan outlet titip jual

**As-is:** sales membersihkan rak, menghitung sisa, membandingkan dengan nota lama, menghitung laku dan tagihan manual, mengisi ulang, menulis nota baru, lalu meminta cap & tanda tangan. Di kantor semuanya disalin ke Excel.

**To-be:**

```mermaid
flowchart TB
  subgraph Sales["Sales (HP, bisa tanpa sinyal)"]
    v1["Buka outlet<br/>(titipan terakhir tampil)"]
    v2{"Ada yang berubah<br/>di rak?"}
    v3["Tekan 'Tidak ada yang laku'"]
    v4["Ubah sisa produk<br/>yang berkurang"]
    v5["Sistem hitung laku,<br/>tagihan, saran isi ulang,<br/>tandai produk ED"]
    v6["Setujui saran isi ulang<br/>& tarik (atau ubah)"]
    v7{"Laku > batas tagih?"}
    v8["Terima uang:<br/>Dibayar / Sebagian"]
    v9["Tagihan dibawa<br/>ke kunjungan berikut"]
    v10["Simpan → nota WA/cetak<br/>(+ foto form bercap)"]
  end
  v1 --> v2
  v2 -- tidak --> v3 --> v10
  v2 -- ya --> v4 --> v5 --> v6 --> v7
  v7 -- ya --> v8 --> v10
  v7 -- tidak --> v9 --> v10
```

Yang dihapus dari pekerjaan sales: membawa nota lama, menghitung laku, menghitung harga setelah potongan, dan menyalin ke Excel. Yang tetap: form fisik bercap sebagai bukti sah.

## 5. P4 — Penjualan beli langsung / tempo

```mermaid
flowchart LR
  b1["[SIGAP] Buka outlet<br/>(cara jual: beli/tempo)"] --> b2["Pilih produk<br/>& jumlah"]
  b2 --> b3["Sistem hitung harga<br/>setelah potongan"]
  b3 --> b4{"Cara bayar"}
  b4 -- tunai --> b5["Dibayar"]
  b4 -- tempo --> b6["Tagihan dengan<br/>jatuh tempo (awal 30 hari)"]
  b5 --> b7["Nota WA/cetak"]
  b6 --> b7
```

Cocok untuk distributor (tempo 1 bulan) dan outlet yang membeli putus. Cara jual dipilih per outlet, sehingga satu aplikasi melayani kedua model.

## 6. P5 — Tagihan, pembayaran & setoran

```mermaid
flowchart LR
  t1["Tagihan dari P3/P4"] --> t2{"Dibayar saat itu?"}
  t2 -- ya --> t3["[SIGAP] Sales catat bayar"]
  t2 -- tidak --> t4["[SIGAP] Masuk daftar<br/>tagihan belum dibayar"]
  t4 --> t5["Ditagih di kunjungan berikut<br/>atau oleh petugas penagihan"]
  t5 --> t3
  t3 --> t6["Akhir hari: sales setor uang"]
  t6 --> t7{"[SIGAP] Admin:<br/>jumlah sesuai?"}
  t7 -- ya --> t8["Tandai 'Uang diterima'"]
  t7 -- tidak --> t9["Catat selisih<br/>+ keterangan"]
```

Tidak ada jurnal atau rekonsiliasi akuntansi; pembukuan tetap memakai cara keuangan yang ada, dengan data dari ekspor SIGAP.

## 7. P6 — Retur, rusak & kedaluwarsa

```mermaid
flowchart LR
  r0["Ditarik dari outlet<br/>(ED dekat / rusak)"] --> r1["Bawaan retur sales"]
  r00["Sisa bawaan baik"] --> r2
  r1 --> r2["[SIGAP] Admin Gudang terima"]
  r2 --> r3{"Kondisi"}
  r3 -- baik --> r4["Kembali ke stok"]
  r3 -- rusak --> r5["Rework"]
  r3 -- kedaluwarsa --> r6["Dimusnahkan"]
```

## 8. P7 — Opname gudang

```mermaid
flowchart LR
  o1["[SIGAP] Daftar stok sistem<br/>sudah terisi"] --> o2["Hitung fisik,<br/>ubah yang beda saja"]
  o2 --> o3{"Ada selisih?"}
  o3 -- tidak --> o6["Selesai"]
  o3 -- ya --> o4["Lihat riwayat keluar-masuk<br/>hari itu + isi alasan"]
  o4 --> o5["Simpan penyesuaian<br/>(persetujuan bila dinyalakan)"]
  o5 --> o6
```

## 9. P8 — Data & pengaturan

| Kegiatan | Pelaku | Catatan |
| --- | --- | --- |
| Tambah/ubah outlet, gabungkan outlet dobel | Admin Kantor | Sales boleh mengusulkan outlet baru dari lapangan |
| Tugaskan outlet ke 1+ sales | Admin Kantor | Alasan pindah dicatat; sales baru diberi notifikasi |
| Ubah harga & potongan | Admin Kantor (Manager Marketing) | Berlaku setelah disetujui Pimpinan, bila persetujuan dinyalakan |
| Ubah aturan (batas tagih, ED, siklus, tempo, foto wajib) | Admin Kantor | Berlaku untuk transaksi berikutnya, tercatat di riwayat |
| Atur peran & hak akses | Admin Kantor | Centang per menu/aksi |

## 10. P9 — Pelaporan

|  | As-is | To-be |
| --- | --- | --- |
| Cara | Nota → diketik ke 4–5 Excel | Tercatat sekali, laporan terbentuk otomatis |
| Waktu | Akhir bulan | Kapan saja |
| Penanda | Warna sel kuning | Tanda & filter (belum dikunjungi, setor terbanyak, ED dekat) |
| Keluaran | Excel/PDF manual | Ringkasan + ekspor Excel/PDF dengan susunan kolom yang sama |

## 10b. P10 — Koreksi kesalahan (berlaku untuk semua proses)

```mermaid
flowchart LR
  a["Kesalahan ditemukan"] --> b{"Masih hari yang sama<br/>& dibuat sendiri?"}
  b -- ya --> c["[SIGAP] Perbaiki langsung<br/>(tercatat di riwayat)"]
  b -- tidak --> d["[SIGAP] Ajukan koreksi<br/>+ alasan"]
  d --> e{"Butuh persetujuan?<br/>(Pengaturan)"}
  e -- tidak --> f["Koreksi berlaku"]
  e -- ya --> g["Penyetuju cek<br/>sebelum / sesudah"]
  g -- setuju --> f
  g -- tolak --> h["Kembali ke pengaju<br/>+ catatan"]
  c --> i["Stok, tagihan & laporan<br/>dihitung ulang otomatis"]
  f --> i
```

| Contoh kejadian | Siapa | Tindakan di SIGAP |
| --- | --- | --- |
| Sales salah ketik sisa (harusnya 1, tertulis 11) | Sales, hari itu juga | Buka nota → "Perbaiki" → simpan; nota baru terkirim ulang ke WA outlet |
| Kunjungan dicatat ke outlet yang salah | Admin Kantor | "Ajukan koreksi" → pindahkan ke outlet yang benar; stok kedua outlet terhitung ulang |
| Permintaan barang terlanjur disetujui padahal jumlah salah | Admin Gudang | "Ubah status" ke Disiapkan + alasan → ubah jumlah → setujui ulang |
| Pembayaran dicatat dua kali | Admin Kantor | Batalkan salah satu pembayaran + alasan; sisa tagihan kembali otomatis |
| Barang masuk salah batch/ED | Admin Gudang | Koreksi barang masuk; batch di gudang, bawaan sales, dan outlet ikut diperbarui |
| Outlet terhapus tidak sengaja | Admin Kantor | Pulihkan dari Tempat Sampah |
| Order maklon maju status terlalu cepat | Marketing | "Ubah status" mundur satu tahap + alasan |

## 11. Modul maklon (dokumen terpisah)

Alur maklon dari QnA (spesifikasi → sampel Rp500.000 → perizinan Rp7.500.000 dengan DP 50% → PO & DP 50% → produksi 2–3 pekan → QC → pelunasan → kirim) dirancang lengkap di dokumen 06\_Rancangan\_Modul\_Maklon (alur, status, tagihan bertahap, bahan milik klien, layar) dan dibangun setelah purwarupa inti, sesuai batasan brief.

## 12. Ringkasan perubahan as-is → to-be

| Titik | As-is | To-be |
| --- | --- | --- |
| Titipan per outlet | Nota kertas di tangan sales | Tampil otomatis saat outlet dibuka |
| Hitung laku & tagihan | Manual | Otomatis |
| Kunjungan tanpa perubahan | Tetap menulis nota | Satu tombol |
| Isi ulang | Kira-kira | Saran dari stok standar |
| ED di outlet | Tidak terpantau | Ditandai di layar sales |
| Aturan bisnis berubah | Diberitahu lisan | Diubah sekali di Pengaturan |
| Rekap bulanan | 4–5 file | Sekali klik ekspor |
