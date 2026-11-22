# Pedoman_UI_UX — SIGAP CV Arba'in

17 November 2026 · Antech Async · Turunan dari dokumen 02 (SRS §4 UX-01–11, §3.10 PW) dan 05 (Wireframe §1)

Dokumen ini adalah **aturan tampilan yang mengikat** untuk semua layar SIGAP, baik di Figma maupun di kode. Bila Figma dan dokumen ini berbeda, ikuti dokumen ini lalu perbarui Figma. Token di bawah sudah terpasang sebagai kode di [frontend/src/styles/tokens.css](../../frontend/src/styles/tokens.css) — file itulah sumber kebenarannya; [Lampiran A](#lampiran-a--tokenscss) hanya salinan untuk dibaca. Bila token diubah, ubah file itu lalu perbarui lampiran.

Pengguna utama SIGAP adalah **sales di lapangan**: memakai HP Android RAM 4 GB, di bawah matahari, sambil berdiri di depan rak outlet, sering tanpa sinyal. Admin dan pimpinan memakai laptop dan terbiasa Excel. Semua aturan di bawah diturunkan dari dua kenyataan itu.

## 1. Prinsip

| # | Prinsip | Artinya di layar |
| --- | --- | --- |
| P1 | **Terbaca di bawah matahari** | Kontras tinggi, huruf ≥ 16 px di layar sales, tanpa teks abu-abu pucat, tanpa efek kaca/transparan |
| P2 | **Satu layar, satu tugas, satu tombol utama** | Tombol utama hijau penuh, menempel di bawah (HP). Aksi lain bergaya sekunder/ghost |
| P3 | **Isi dulu, ubah seperlunya** | Angka sudah terisi; pengguna hanya mengubah yang berbeda |
| P4 | **Warna punya arti tetap** | Merah = harus ditindak, kuning = perlu perhatian, hijau = selesai. Warna ini tidak boleh dipakai untuk dekorasi |
| P5 | **Tidak pernah hanya warna** | Status selalu = warna + ikon + kata |
| P6 | **Hitungan selalu terlihat** | Total, laku, dan stok akhir berubah langsung saat angka diubah |
| P7 | **Tenang saat tanpa sinyal** | Offline adalah keadaan normal, bukan galat. Pesan netral: "Tersimpan di HP" |
| P8 | **Modern berarti bersih dan berkarakter, bukan ramai** | Pita merek hijau tua di header, kartu putih berbayang lembut di latar hijau sangat muda, warna dipakai untuk struktur dan makna (§2.7), animasi singkat |
| P9 | **Ringan** | Tanpa gambar besar, tanpa font tambahan, tanpa library animasi. Aplikasi sales ≤ 2 MB (NF-02) |

## 2. Warna

### 2.1 Palet merek

Hijau daun dipilih karena produk mitra adalah herbal, dan sesuai wireframe dokumen 05 ("tombol hijau besar"). Struktur memakai slate (abu-biru) dan data yang disorot memakai indigo, lihat §2.2.

| Token | Hex | Pemakaian |
| --- | --- | --- |
| `leaf-50` | `#f0fdf4` | Hover tombol dan tautan, latar chip sukses |
| `leaf-100` | `#dcfce7` | Petak ikon merek, pil menu aktif, lingkaran inisial outlet; teks sekunder di dalam pita merek (6,5:1) |
| `leaf-200` | `#bbf7d0` | Garis fokus lembut |
| `leaf-500` | `#22c55e` | Hanya untuk grafik dan ikon besar, **bukan teks** |
| `leaf-600` | `#15803d` | **Primary**: tombol utama, tautan aktif, ring fokus (5,0:1 terhadap putih) |
| `leaf-700` | `#166534` | **Pita merek (header)** dengan teks putih (7,1:1); primary saat ditekan; primary di mode kontras tinggi; saringan aktif |
| `leaf-800` | `#14532d` | Teks di atas `leaf-50` (8,7:1) |
| `honey-400` | `#fbbf24` | Aksen merek: logo, ilustrasi layar masuk. **Tidak dipakai di UI kerja** agar tidak tertukar dengan kuning "perhatian" |
| `honey-700` | `#b45309` | Teks aksen merek bila dibutuhkan |

### 2.2 Netral dan warna kombinasi

Sejak 22 Nov 2026 palet dibagi menjadi tiga peran, supaya tidak semuanya hijau dan header tabel atau data yang disorot tidak menyatu dengan latar:

| Peran | Warna | Dipakai untuk |
| --- | --- | --- |
| **Aksi & posisi aktif** | Hijau `leaf-*` | Tombol, kolom isian, tautan, menu aktif, pilihan terpilih |
| **Struktur** | Slate (abu-biru dingin) `slate-*` | Latar halaman, header tabel, garis, judul bagian menu, teks sekunder |
| **Data yang disorot** | Indigo `indigo-*` | Baris Jumlah, chip peran, angka yang diubah pengguna |

Slate **tidak pernah** dipakai untuk tombol atau kolom isian (aturan §7.1: abu-abu = nonaktif). Indigo bukan warna status; status tetap memakai §2.3.

| Token | Hex | Pemakaian | Kontras |
| --- | --- | --- | --- |
| `--background` | `#e8edf3` | **Latar halaman**. Kartu dan menu samping putih dipisahkan dengan garis + bayangan. Isi daftar selalu di atas kartu putih, jangan memberi baris latar yang mendekati warna ini | Teks utama 14,9:1, sekunder 6,4:1 |
| `--border` | `#dde3ea` | Garis kartu dan pemisah baris (dekoratif) | — |
| `--muted` / `slate-200` | `#e2e8f0` | Kerangka memuat, chip netral | Teks sekunder 6,2:1 |
| `--table-head` / `slate-700` | `#334155` | **Header tabel gelap** dengan teks putih, supaya tidak pernah menyatu dengan latar halaman atau baris putih. Saat dicetak menjadi polos | Putih 10,4:1 |
| `--row-hover` | `#f3f6fa` | Baris tabel saat disorot | Tautan `leaf-700` 6,6:1 |
| `slate-300` | `#cbd5e1` | Garis tepi menu samping | — |
| `slate-500` | `#64748b` | Judul bagian menu, ikon menu tidak aktif (bukan teks isi) | 4,8:1 |
| `--muted-foreground` / `slate-600` | `#475569` | Teks sekunder (keterangan, label kecil) | 7,6:1 |
| `earth-900` | `#1c1917` | Teks utama | 16,7:1 |
| `--highlight` / `indigo-50` | `#eef2ff` | Latar data yang disorot | Teks `indigo-800` 8,9:1 |
| `--highlight-border` / `indigo-600` | `#4f46e5` | Garis atas baris Jumlah, garis angka yang diubah | 6,3:1 |
| `earth-200`–`earth-600` | — | **Hanya** tombol dan kolom nonaktif | — |

Aturan: teks lebih terang dari `slate-600` dilarang untuk isi. Garis input memakai `--input` (`#6b8a72`, hijau keabuan 3,8:1).

### 2.3 Warna status (semantik)

Ini satu-satunya warna yang boleh menyampaikan arti. Setiap status punya pasangan latar lembut + teks gelap untuk chip/banner, dan satu warna tegas untuk ikon/tombol.

| Arti | Token | Latar lembut | Teks di atas latar | Tegas | Contoh |
| --- | --- | --- | --- | --- | --- |
| **Bahaya — harus ditindak** | `danger` | `#fef2f2` | `#991b1b` (7,6:1) | `#b91c1c` | Dekat kedaluwarsa, sisa > titipan, hapus/batalkan |
| **Perhatian — perlu dilihat** | `warning` | `#fffbeb` | `#92400e` (6,8:1) | `#d97706` (ikon saja) | Belum dikunjungi, belum dibayar, perlu dicek |
| **Selesai — beres** | `success` | `#f0fdf4` | `#166534` (6,8:1) | `#15803d` | Selesai hari ini, lunas, terkirim |
| **Info — netral** | `info` | `#eff6ff` | `#1e40af` (8,0:1) | `#1d4ed8` | Tersimpan di HP, menunggu persetujuan, petunjuk |

Catatan penting: primary dan success sama-sama hijau (keputusan dokumen 05). Untuk membedakannya, **status sukses selalu memakai ikon centang**, sedangkan tombol primary tidak pernah memakai ikon centang kecuali tombolnya memang "Selesai".

### 2.4 Pemetaan status bisnis → tampilan

Gunakan komponen `StatusChip` dengan pemetaan tetap berikut. Jangan membuat warna status baru di tiap layar.

| Status | Varian | Ikon (lucide) | Teks di layar |
| --- | --- | --- | --- |
| Kunjungan selesai hari ini | success | `CircleCheck` | Selesai hari ini |
| Lewat siklus kunjungan | warning | `Clock` | 42 hari lalu |
| Sangat lama (> 2× siklus) | danger | `Clock` | 226 hari lalu · sangat lama |
| Belum dibayar | warning | `Wallet` | Belum bayar Rp 86.000 |
| Lewat jatuh tempo | danger | `Wallet` | Telat bayar 12 hari |
| Dekat kedaluwarsa | danger | `TriangleAlert` | ED 03/2027 |
| Menunggu sinyal (antrean) | info | `CloudOff` | Menunggu sinyal |
| Terkirim | success | `Check` | Terkirim |
| Gagal kirim | danger | `CircleX` | Gagal kirim · Kirim ulang |
| Menunggu persetujuan | info | `Hourglass` | Menunggu persetujuan |
| Ditolak | danger | `CircleX` | Ditolak · lihat catatan |
| Perlu dicek (konflik) | warning | `CircleHelp` | Perlu dicek |
| Dibatalkan | netral (`tanah`) | `Ban` | Dibatalkan (teks dicoret) |

### 2.5 Warna grafik

- Seri utama (data "kita", omzet, % laku): `leaf-600`. Target/pembanding: `earth-300` atau garis putus `earth-500`.
- Bila butuh banyak seri (mis. per sales): `#15803d`, `#1d4ed8`, `#7c3aed`, `#0e7490`, `#be185d`. **Merah, kuning, dan oranye tidak boleh dipakai sebagai warna seri**, karena sudah berarti bahaya/perhatian.
- Batang progres performa sales tetap hijau; capaian di bawah target ditandai dengan teks/ikon warning di sampingnya, bukan dengan mengganti warna batang.
- Ikuti skill `dataviz` / komponen chart shadcn agar semua grafik seragam.

### 2.6 Mode tampilan

| Mode | Status | Keterangan |
| --- | --- | --- |
| Terang | **Bawaan** | Paling terbaca di luar ruangan |
| Kontras tinggi | **Wajib (UX-08)** | `data-contrast="high"` di `<html>`: primary → `leaf-700`, teks sekunder → `earth-900`, garis → `earth-600`, semua teks ≥ 7:1 |
| Gelap | Tidak di MVP | Token sudah disiapkan sebagai variabel CSS, jadi bisa ditambah tanpa mengubah komponen |

### 2.7 Identitas visual dan warna untuk struktur (sejak 22 Nov 2026)

Tampilan awal terlalu datar: hampir semuanya kartu putih bergaris tipis, sehingga identitas dan hierarki lemah. Warna ditambahkan **hanya pada tempat yang memberi struktur atau makna**, dan setiap pasangan dicek kontrasnya.

| Elemen | Aturan | Kontras |
| --- | --- | --- |
| Pita merek | Header HP dan kantor: `data-surface="brand"` (latar `leaf-700`). Di dalamnya teks, ikon, fokus, dan tautan otomatis menjadi terang lewat variabel CSS; komponen tidak perlu varian khusus | Putih 7,1:1; teks sekunder `leaf-100` 6,5:1 |
| Kartu angka (KPI) | Petak ikon 36 px di samping label. Warna petak mengikuti arti: `tile-brand` (omzet, normal), `tile-info` (kunjungan), `tile-warning` (ada yang perlu dilihat), `tile-danger` (harus ditindak). Angka `text-2xl`–`3xl` tebal | Ikon ≥ 5,3:1 di petaknya |
| Menu | Menu aktif ditandai pil `tile-brand` di belakang ikon (menu bawah) atau latar `tile-brand` + teks `leaf-800` (menu samping) | 8,3:1 |
| Saringan (chip) | Aktif: latar `leaf-700`, teks putih. Tidak aktif: kartu putih berbayang | 7,1:1 |
| Garis aksen kartu | Lihat §7.3. Kuning memakai `warning` (`#d97706`), bukan kuning muda | ≥ 3,2:1 terhadap putih |

Yang **tetap dilarang**: gradien besar, efek kaca/blur, warna status sebagai hiasan, mode gelap untuk layar lapangan (paling sulit dibaca di bawah matahari), dan madu (`honey-*`) di UI kerja.

## 3. Tipografi

- **Font: Inter (variable)**, dipasang sendiri lewat paket `@fontsource-variable/inter` subset latin, supaya ikut tersimpan offline oleh service worker. Cadangan: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Tidak boleh memuat font dari Google Fonts (gagal saat tanpa sinyal).
- **Angka selalu `tabular-nums`** (kelas `tabular-nums`) di tabel, stepper, dan total, agar digit sejajar dan tidak "melompat" saat berubah.
- Semua ukuran dalam `rem` agar fitur perbesar huruf (UX-08) bekerja.

| Token | Ukuran / tinggi baris | Berat | Pemakaian |
| --- | --- | --- | --- |
| `text-xs` | 12 / 16 | 500 | Metadata di tabel desktop saja. **Dilarang di layar sales** |
| `text-sm` | 14 / 20 | 400–500 | Teks sekunder admin, label kolom tabel |
| `text-base` | 16 / 24 | 400 | Teks isi; **minimum di layar sales** |
| `text-lg` | 18 / 28 | 500–600 | Nama outlet/produk di kartu sales, judul kartu |
| `text-xl` | 20 / 28 | 600 | Judul halaman di HP |
| `text-2xl` | 24 / 32 | 600 | Judul halaman desktop; angka di stepper |
| `text-3xl` | 30 / 36 | 700 | Angka KPI ringkasan |
| `text-4xl` | 36 / 40 | 700 | Total tagihan di lembar bayar (M3) |

Pengaturan ukuran huruf (Profil → Tampilan): **Normal 100% · Besar 112,5% · Sangat besar 125%**, disimpan per perangkat dan diterapkan ke `font-size` elemen `<html>`. Setiap layar sales wajib diuji di 125% pada lebar 360 px tanpa teks terpotong.

Aturan teks: huruf kapital di awal kalimat saja (*sentence case*), bukan HURUF BESAR SEMUA, kecuali nama outlet yang memang tersimpan kapital di data mitra. Rata kiri. Panjang baris paragraf maks. ±70 karakter.

## 4. Ruang, bentuk, dan bayangan

| Aspek | Aturan |
| --- | --- |
| Grid ruang | Kelipatan 4 px. Yang sering dipakai: 4, 8, 12, 16, 24, 32, 48 |
| Tepi halaman | HP 16 px · tablet 24 px · desktop 32 px |
| Jarak antar-kartu | 12 px (HP), 16 px (tablet/desktop) |
| Padding kartu | 16 px (HP), 20–24 px (desktop) |
| Sudut | `radius-sm` 6 px (chip, input kecil) · `radius-md` 10 px (tombol, input) · `radius-lg` 14 px (kartu, lembar bawah, dialog) · `full` (avatar, badge angka) |
| Bayangan | Dua tingkat saja. `shadow-card` (sangat lembut) untuk **semua kartu** di atas latar; `shadow-raised` untuk yang melayang: header, lembar bawah, dialog, kartu yang di-hover. Tidak ada bayangan berlapis atau efek kaca. Mode kontras tinggi mematikan `shadow-card` dan memakai garis tegas |
| Lebar konten desktop | Maks. 1440 px; form maks. 720 px |

## 5. Tata letak responsif

Mengikuti PW-03 dan dokumen 05 §1.1. Breakpoint memakai bawaan Tailwind: `sm` = 640 px, `lg` = 1024 px.

| Lebar | Navigasi | Tabel | Tombol utama | Filter |
| --- | --- | --- | --- | --- |
| < 640 px (HP) | Bilah bawah, maks. 4 menu + "Lainnya", ikon 24 px + label | Kartu | Menempel di bawah, lebar penuh, tinggi 56 px | Lembar bawah (Drawer) |
| 640–1024 px (tablet) | Menu samping bisa diciutkan | Kolom penting saja, ketuk baris → detail | Kanan atas dan bawah form | Bilah di atas tabel |
| > 1024 px (desktop) | Menu samping tetap 256 px | Penuh: cari, filter, urut, ekspor | Kanan atas halaman | Bilah di atas tabel + panel detail di samping |

Lebar minimum yang didukung: **360 px** (NF-04). Tidak boleh ada gulir horizontal halaman di lebar ini; tabel lebar berubah jadi kartu, bukan digulir ke samping.

Menu yang tampil mengikuti izin pengguna (PW-01). Menu yang tidak diizinkan **disembunyikan**, bukan ditampilkan abu-abu.

**Menu dikelompokkan** (sejak 22 Nov 2026, `components/layout/nav-items.ts`). Menu samping dan halaman "Lainnya" di HP memakai judul bagian yang sama; bagian tanpa menu yang diizinkan ikut disembunyikan:

| Bagian | Menu |
| --- | --- |
| Pantauan | Ringkasan, Laporan |
| Penjualan | Outlet, Kunjungan, Tagihan |
| Produk & gudang | Produk, Potongan, Gudang |
| Administrasi | Koreksi, Impor Excel, Pengguna, Pengaturan |

Menu aktif: latar `tile-brand`, teks `leaf-800` tebal, dan **garis hijau 4 px di tepi kiri**, supaya posisi terbaca tanpa mengandalkan warna saja. Ikon menu berwarna `leaf-700`.

## 6. Interaksi dan ukuran sentuh

- Area sentuh minimum **48 × 48 px di layar sales**, 44 × 44 px di tempat lain. Jarak antar-target ≥ 8 px.
- Elemen penting untuk sales ada di **sepertiga bawah layar** (zona jempol). Tombol kembali di kiri atas boleh, tetapi aksi utama tidak pernah di atas.
- Tidak ada interaksi yang hanya bisa lewat *hover*, *swipe*, atau tekan lama. Bila ada *swipe*, harus ada tombol yang setara.
- Tombol − / + selalu di kiri dan kanan angka; ketuk angka membuka keypad angka (`inputmode="numeric"`).
- Ketukan mengubah data harus terasa: tombol berubah warna saat ditekan (`active:`) dan, bila tersedia, getar 10 ms (`navigator.vibrate`) untuk − / +.

### 6.1 Kerangka halaman kantor

Setiap halaman daftar di area kantor tersusun sama, dari atas ke bawah:

1. **`PageHeader`** (`components/common/PageHeader`): ikon modul di kotak `tile-brand`, judul `text-2xl` tebal, satu kalimat tujuan halaman, dan aksi halaman di kanan (tombol primary paling kanan). Di HP aksi turun ke bawah judul.
2. Tab sub-menu bila ada (`choice`/`choice-on`).
3. **`FilterBar`**: cari dan saringan dalam satu bilah putih berbayang, satu baris di desktop.
4. Ringkasan angka (bila ada), lalu tabel atau kartu.
5. **`Pagination`** di bawah daftar (§7.4).

## 7. Komponen

Semua komponen dasar berasal dari **shadcn/ui** di `frontend/src/components/ui/` dan disesuaikan dengan token di dokumen ini. Komponen khusus SIGAP ada di `frontend/src/components/common/`. Dilarang membuat ulang komponen yang sudah ada.

### 7.1 Tombol

| Varian | Tampilan | Kapan |
| --- | --- | --- |
| `default` (primary) | Latar `leaf-600`, teks putih semibold, bayangan hijau tipis; hover `leaf-700` | **Satu per layar**: aksi yang menyelesaikan tugas ("Lanjut", "Simpan kunjungan") |
| `outline` | Latar putih, **garis `leaf-600`**, teks `leaf-800` semibold; hover `leaf-50` | Aksi alternatif ("Sebagian…", "Cetak", "Ubah") |
| `secondary` (tonal) | Latar `leaf-100`, teks `leaf-800` | Aksi sering dan aman: "Detail" di baris tabel, "Lihat kartu stok" |
| `ghost` | Tanpa latar, teks `link` (`leaf-700`; putih di pita merek) | Aksi kecil ("Perbaiki", "Riwayat", "Nanti saja") |
| `danger` | Latar `#b91c1c`, teks putih | Hanya di dialog konfirmasi hapus/batalkan |
| `danger-outline` | Garis dan teks merah | Tombol pemicu hapus/batalkan sebelum dialog |

**Abu-abu hanya berarti nonaktif** (sejak 22 Nov 2026). Semua tombol yang bisa ditekan berwarna hijau (atau merah untuk hapus); tombol nonaktif menjadi abu-abu datar `earth-200` + teks `earth-600` tanpa bayangan, bukan hijau pudar. Kolom isian memakai garis hijau keabuan `--input` (`#6b8a72`, 3,8:1) dan berubah hijau saat disorot; kolom nonaktif bergaris putus-putus di latar `muted`.

Ukuran: HP tinggi 48 px (utama menempel 56 px); desktop 40 px; aksi di baris tabel `size="row"` 40 px. Label tombol = **kata kerja + objek** ("Simpan kunjungan", bukan "OK"). Saat proses: tombol nonaktif + spinner kecil + label tetap, cegah ketuk dua kali.

### 7.2 Stepper angka (`NumberStepper`)

Komponen terpenting untuk sales (M2, M5, opname).

```text
Sisa di rak   [ − ]   12   [ + ]   dari 14
              48px   24px   48px
```

- Angka `text-2xl` semibold, `tabular-nums`, minimal lebar 3 digit.
- Batas bawah 0; tombol − nonaktif di 0. Batas atas boleh dilewati hanya bila aturan mengizinkan; bila melewati (mis. sisa > titipan), kotak bergaris merah + pesan di bawahnya: "Sisa lebih dari titipan (14). Hitung ulang?"
- Angka yang **sudah diubah** dari nilai awal diberi latar `leaf-50` dan titik kecil, supaya sales tahu baris mana yang ia sentuh.
- Perubahan diumumkan ke pembaca layar (`aria-live="polite"`) beserta hitungan turunannya ("Laku 2").

### 7.3 Kartu dan daftar

- Kartu outlet (M1): nama `text-lg` semibold di baris 1; wilayah dan status di baris 2–3; seluruh kartu bisa diketuk (bukan hanya tombol kecil di dalamnya).
- **Garis aksen kiri** 4 px menunjukkan tanda paling mendesak di kartu: merah (`danger`) dekat kedaluwarsa → hijau (`success`) selesai hari ini → kuning (`warning`) belum bayar atau lama tidak dikunjungi. Garis ini pelengkap; chip status (warna + ikon + teks) tetap wajib.
- **Setiap kartu atau baris yang bisa diketuk diakhiri penanda buka** (`components/common/OpenHint`): panah `›` hijau, ditambah label pendek di laptop ("Lihat nota", "Buka"). Kartu yang membuka-tutup memakai panah bawah di lingkaran `leaf-50`. Tautan teks lepas diganti tombol (`secondary`).
- Lingkaran inisial outlet (`tile-brand`) hanya hiasan untuk memudahkan memindai; **disembunyikan pada ukuran huruf Besar dan Sangat besar** agar nama dan status mendapat ruang.
- **Kartu berjudul** (`components/common/SectionCard`): judul berada **di dalam** kartu sebagai baris kepala berlatar `slate-50` dengan garis pemisah, bukan menumpang di garis tepi kartu. Kelompok kolom isian (Pengaturan, izin peran) memakai `FieldsetCard` agar tetap `fieldset` + `legend` bagi pembaca layar; panel biasa memakai `SectionCard`. Angka ringkas di judul (mis. "2/4" izin dicentang) memakai chip `highlight`.
- Urutan informasi: **nama → status yang perlu ditindak → keterangan**.
- Maksimal 3 baris informasi per kartu di HP. Sisanya di halaman detail.

### 7.4 Tabel admin (`DataTable`)

- Dibangun dengan TanStack Table, satu komponen untuk desktop (tabel) dan HP (kartu) — PW-04.
- **Kolom Aksi wajib** di tabel data yang barisnya punya halaman sendiri (`components/common/RowActions`): **Detail** (`secondary`, ikon mata), **Ubah** (`outline`, ikon pensil), **Hapus** (`danger-outline`, ikon tempat sampah, membuka dialog dampak yang sama dengan halaman detail). Ubah/Hapus hanya tampil bagi pemegang izin. Di layar ≥ 1536 px berlabel; di bawahnya tombol ikon 40 px dengan `title` dan `aria-label`. Nama di kolom pertama tetap tautan (hijau, bergaris bawah tipis).
- Baris tabel berubah `leaf-50` saat disorot; tabel boleh bergulir mendatar, isinya tidak pernah terpotong.
- Wajib: kolom cari, filter, urut per kolom, jumlah baris, ekspor Excel (UX-10). Header lengket saat digulir.
- Angka dan uang **rata kanan**, teks rata kiri, status di tengah-kiri sebagai chip.
- Tinggi baris 48 px (normal) atau 40 px (rapat, bisa dipilih). Garis antar-baris `earth-200`, tanpa garis vertikal; zebra tidak dipakai.
- Susunan kolom laporan mengikuti file Excel mitra yang sekarang agar admin "tetap merasa di Excel".
- Tabel kecil di dalam kartu (batch stok, isi permintaan barang) memakai aturan yang sama: bingkai `rounded-md` bergaris, kepala gelap, sel `px-3 py-2.5`, baris disorot `--row-hover`.
- Kepala tabel berlatar `--table-head` (slate gelap) dengan teks putih semibold; baris disorot `--row-hover`; baris Jumlah `--highlight` (indigo) dengan garis atas indigo 2 px. Baris nonaktif/dibatalkan tetap berlatar putih dan ditandai teks redup, coret, atau chip, bukan latar abu.

**Paginasi** (`components/common/Pagination`, sejak 22 Nov 2026). Setiap daftar yang bisa memuat banyak data dipecah per halaman:

- Isi: "1–20 dari 134 outlet", tombol **Sebelumnya**, nomor halaman (pertama, terakhir, halaman sekarang ± 1, sisanya "…"), tombol **Berikutnya**. Halaman sekarang memakai `choice-on` dan `aria-current="page"`. Di HP nomor diganti "Hal. 2 dari 7" dan tombol hanya ikon 44 px (tetap punya `aria-label`).
- Tidak tampil bila semua data muat di satu halaman. Pindah halaman menggulir kembali ke atas daftar.
- Data yang dipecah di server (outlet, produk, kunjungan, barang masuk, retur) memakai `meta` dari API. Data yang dikirim utuh (tagihan per outlet, potongan, pengguna, setoran, permintaan barang, stok gudang, opname, koreksi, tempat sampah, riwayat akses) dipecah di layar dengan `usePagedItems` (`lib/pagination.ts`), 20 baris per halaman; saringan baru mengembalikan ke halaman 1.
- Laporan dan kartu stok menampilkan 50 baris per halaman di layar, tetapi **cetak selalu memuat semua baris**.

### 7.5 Form

- Label di **atas** kolom, bukan placeholder sebagai label. Kolom wajib diberi tanda "(wajib)" pada label; kolom opsional tidak diberi tanda apa pun.
- Validasi saat kolom ditinggalkan dan saat simpan, bukan saat mengetik huruf pertama.
- Pesan galat di bawah kolom, warna `danger`, dengan ikon, berisi **apa yang salah + cara memperbaiki** ("Kecamatan wajib diisi. Pilih dari daftar.").
- Pilihan ≤ 5 opsi memakai tombol pilihan (segmented/radio kartu), bukan dropdown (UX-02). Pilihan banyak (outlet, produk) memakai kolom cari dengan daftar hasil.
- Form desktop maksimal 2 kolom; HP selalu 1 kolom.
- Form panjang (Pengaturan, Peran & izin) memakai `SaveBar` (`components/common/SaveBar`). Selama belum ada perubahan, tombol "Belum ada perubahan" diam di bawah form dan **tidak melayang di atas kartu**. Begitu ada perubahan, bilah selebar konten menempel di bawah layar berisi "N perubahan belum disimpan" + tombol Simpan.

### 7.6 Lembar bawah, dialog, dan notifikasi

| Komponen | Dipakai untuk |
| --- | --- |
| **Lembar bawah** (Drawer) di HP / dialog samping di desktop | Langkah lanjutan satu tugas: bayar & simpan (M3), filter, detail cepat |
| **Dialog konfirmasi** | Hanya untuk aksi yang menghapus, membatalkan, atau mengubah stok/tagihan orang lain. Wajib menampilkan **dampak** dalam kalimat biasa ("Stok outlet −10, tagihan +Rp 655.200") |
| **Toast** (sonner) | Konfirmasi singkat yang tidak perlu ditindak ("Kunjungan tersimpan"). Tampil 4 detik, di bawah (HP) / kanan bawah (desktop), tidak menutupi tombol utama |
| **Banner** | Keadaan yang bertahan: offline, versi baru tersedia ("Muat ulang"), data lama ("Data per 08.15") |

Jangan memakai dialog untuk konfirmasi hal yang bisa diperbaiki; lebih baik simpan langsung dan beri tombol "Perbaiki"/"Urungkan" (UX-07).

### 7.7 Status koneksi dan antrean (UX-11)

- Indikator kecil tetap di kepala layar sales: ikon `Cloud` (online) atau `CloudOff` + "Tersimpan di HP".
- Bila ada antrean: "2 kunjungan menunggu sinyal" sebagai banner info, bisa diketuk untuk melihat daftar dan tombol "Kirim ulang".
- **Kata "sinkron", "sync", "offline", "error" tidak muncul di layar sales.** Gunakan "menunggu sinyal", "terkirim", "gagal kirim".
- Menyimpan transaksi saat offline harus terasa **sama berhasilnya** dengan saat online (toast sukses, bukan peringatan).

### 7.8 Keadaan kosong, memuat, dan galat

| Keadaan | Aturan |
| --- | --- |
| Memuat | *Skeleton* berbentuk konten, bukan spinner layar penuh. Tampilkan data cache dulu bila ada |
| Kosong | `EmptyState`: ikon di lingkaran `leaf-50` + satu kalimat penjelas + satu tombol aksi ("Belum ada outlet. Impor dari Excel") |
| Galat server | Kalimat biasa + tombol "Coba lagi" + tautan "Hubungi admin" (WhatsApp, UX-09). Kode galat teknis hanya di detail yang bisa dibuka |
| Tanpa izin | "Menu ini tidak tersedia untuk peran Anda." + tombol kembali |

### 7.9 Ikon

- **lucide-react** saja. Garis 2 px. Ukuran: 16 px (dalam teks/tabel), 20 px (tombol), 24 px (navigasi bawah, status penting).
- Ikon navigasi dan ikon tombol aksi **selalu disertai label teks**. Tombol hanya-ikon hanya untuk aksi yang sangat umum (tutup ×, kembali ←, cari) dan wajib punya `aria-label`.

### 7.10 Pilihan, tab, dan saringan

Tab, chip saringan, dan pilihan bersegmen memakai utilitas `choice` (belum dipilih: garis `--input`, teks `leaf-800`, hover `leaf-50`) dan `choice-on` (terpilih: latar `leaf-700`, teks putih; teks keterangan di dalamnya otomatis `leaf-100`). Jangan membuat varian sendiri dengan garis abu-abu; pilihan yang belum dipilih harus tetap terlihat bisa ditekan.

### 7.11 Pasang aplikasi (PW-02)

- `lib/install.ts` menyimpan tawaran pasang dari browser (`beforeinstallprompt`) sejak aplikasi dibuka; `InstallAppButton` memunculkan dialog pasang resmi. Di iPhone/iPad (tanpa tawaran itu) tombol membuka langkah Bagikan → **Tambahkan ke Layar Utama**.
- HP sales: kartu "Pasang SIGAP di HP" di atas Outlet saya; "Nanti saja" menyembunyikannya 7 hari di perangkat itu. Semua peran: bagian **Aplikasi** di lembar Bantuan.
- Tidak tampil sama sekali bila SIGAP sudah dibuka dari ikon (terpasang) atau browser tidak bisa memasang. Browser hanya menawarkan pemasangan lewat **HTTPS** dengan service worker aktif, jadi tombol tidak muncul di `npm run dev`.

## 8. Gerak (motion)

- Durasi 150 ms (hover/tekan), 200 ms (buka lembar/dialog), 250 ms maksimum. Kurva `ease-out` saat masuk, `ease-in` saat keluar.
- Hanya animasikan `opacity` dan `transform` (ringan di HP 4 GB).
- Tidak ada animasi dekoratif, parallax, atau animasi saat halaman dibuka.
- Hormati `prefers-reduced-motion`: semua transisi menjadi instan.

## 9. Bahasa dan format

### 9.1 Gaya bahasa

- Bahasa Indonesia sehari-hari yang sopan, kalimat aktif, sapaan "Anda" untuk admin; layar sales boleh tanpa kata ganti ("Simpan kunjungan").
- **Istilah lapangan** (UX-04): titip, sisa, laku, tarik, isi ulang, nota, belum dibayar, setoran.

| Jangan tulis (di layar sales) | Tulis |
| --- | --- |
| Batch, FEFO | (tidak ditampilkan) / "ED terdekat" |
| Sinkronisasi, sync, offline | Menunggu sinyal, terkirim |
| Submit, OK, Proses | Simpan kunjungan, Lanjut, Kirim nota |
| Error, invalid, gagal validasi | "Sisa lebih dari titipan (4). Hitung ulang?" |
| Stock on hand | Stok bawaan |

### 9.2 Format

| Data | Format | Contoh | Kode |
| --- | --- | --- | --- |
| Uang | `Rp` + spasi + titik ribuan, tanpa desimal | Rp 196.560 | `Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0})` |
| Uang ringkas (KPI) | jt / rb | Rp 12,4 jt | helper `formatCurrencyCompact` |
| Angka | Titik ribuan | 1.240 | `Intl.NumberFormat('id-ID')` |
| Persen | Tanpa desimal kecuali < 10 | 62% · 4,5% | — |
| Tanggal | Tanggal + bulan singkat (+ tahun bila bukan tahun ini) | 16 Nov · 3 Mar 2027 | date-fns locale `id` |
| Tanggal di tabel | dd/MM/yyyy | 16/11/2026 | — |
| Jam | Titik | 09.12 | — |
| Kedaluwarsa | Bulan/tahun | ED 03/2027 | — |
| Waktu relatif | Untuk kunjungan | 42 hari lalu · hari ini · kemarin | — |
| Nomor dokumen | Prefiks + tahun-bulan + urut | NT-2611-0142 | — |

## 10. Aksesibilitas

Target minimum **WCAG 2.1 AA** untuk semua layar; layar sales di mode kontras tinggi mencapai **AAA (7:1)**.

- Kontras teks ≥ 4,5:1 (teks besar ≥ 3:1); batas komponen (input, tombol sekunder) ≥ 3:1.
- Fokus keyboard selalu terlihat: ring 2 px `leaf-600` dengan jarak 2 px. Jangan pernah `outline: none` tanpa pengganti.
- Semua fungsi desktop bisa dijalankan dengan keyboard; urutan Tab mengikuti urutan baca.
- Setiap input punya `<label>`; setiap ikon tanpa teks punya `aria-label`.
- Hitungan yang berubah otomatis memakai `aria-live="polite"`.
- Gunakan elemen HTML yang benar (`button`, `a`, `table`), bukan `div` yang bisa diklik.
- Bahasa halaman `lang="id"`.

## 11. Performa visual

- Gambar: hanya foto form (dikompres ≤ 200 KB) dan avatar. Ilustrasi keadaan kosong memakai ikon lucide, bukan gambar.
- Logo dan ikon PWA dalam SVG + PNG ukuran manifest (192, 512, maskable).
- Dilarang: `backdrop-filter`/blur, bayangan berlapis, gradien besar, video, font kedua, library animasi (Framer Motion dsb.).
- Grafik hanya dimuat di halaman kantor (code splitting); bundel sales tidak memuat Recharts.

## 12. Daftar periksa sebelum merge (UI)

Reviewer menolak PR yang belum memenuhi butir di bawah.

- [ ] Hanya memakai token dari `tokens.css`; tidak ada warna hex/ukuran px acak di komponen
- [ ] Satu tombol primary per layar; di HP menempel di bawah
- [ ] Status memakai `StatusChip` (warna + ikon + teks)
- [ ] Tidak ada tombol, kolom, atau pilihan aktif yang tampil abu-abu (abu-abu = nonaktif, §7.1)
- [ ] Tabel data punya kolom Aksi (Detail · Ubah · Hapus sesuai izin, §7.4)
- [ ] Setiap kartu/baris yang bisa diketuk punya penanda buka `›` (§7.3)
- [ ] Halaman kantor memakai `PageHeader` + `FilterBar`; daftar panjang punya `Pagination` (§6.1, §7.4)
- [ ] Menu baru masuk ke salah satu bagian menu (§5)
- [ ] Diuji di 360 px, 768 px, 1280 px; tanpa gulir horizontal
- [ ] Diuji dengan ukuran huruf 125% dan mode kontras tinggi
- [ ] Area sentuh ≥ 48 px di layar sales
- [ ] Teks memakai istilah lapangan; tidak ada kata terlarang (§9.1)
- [ ] Uang, tanggal, dan angka memakai helper format (§9.2)
- [ ] Ada keadaan memuat, kosong, galat, dan tanpa sinyal
- [ ] Bisa dioperasikan keyboard; fokus terlihat; label lengkap
- [ ] Aksi berbahaya punya dialog dengan kalimat dampak

## Lampiran A — tokens.css

Salinan dari `frontend/src/styles/tokens.css` (diperbarui 22 Nov 2026). File tersebut diimpor dari `src/styles/globals.css`:

```css
/* SIGAP design tokens — usage rules: docs/pengembangan/07_Pedoman_UI_UX.md */

@theme {
  /* --- Brand palette: leaf green --- */
  --color-leaf-50: #f0fdf4;
  --color-leaf-100: #dcfce7;
  --color-leaf-200: #bbf7d0;
  --color-leaf-500: #22c55e; /* charts & large icons only, never text */
  --color-leaf-600: #15803d; /* primary — 5.0:1 on white */
  --color-leaf-700: #166534; /* primary pressed / high contrast — 7.1:1 */
  --color-leaf-800: #14532d;
  --color-leaf-900: #0f3d22; /* brand header pressed */

  /* --- Brand accent: honey (logo & login screen only, not working UI) --- */
  --color-honey-400: #fbbf24;
  --color-honey-700: #b45309;

  /* --- Warm neutrals (earth) --- */
  --color-earth-50: #fafaf9;
  --color-earth-100: #f5f5f4;
  --color-earth-200: #e7e5e4;
  --color-earth-300: #d6d3d1;
  --color-earth-500: #78716c; /* input border — 4.8:1 */
  --color-earth-600: #57534e; /* secondary text — 7.6:1 */
  --color-earth-900: #1c1917; /* primary text — 16.7:1 */

  /* --- Structure neutrals: slate (cool blue-grey). Page, table heads, lines, secondary text.
         Never for buttons or fields: an enabled control always carries green (§7.1). --- */
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-300: #cbd5e1;
  --color-slate-500: #64748b; /* small headings only — 4.8:1 on white */
  --color-slate-600: #475569; /* secondary text — 7.6:1 */
  --color-slate-700: #334155; /* table head text — 9.5:1 on slate-100 */

  /* --- Data highlight: indigo. Totals, role chips, changed numbers — not status, not action --- */
  --color-indigo-50: #eef2ff;
  --color-indigo-100: #e0e7ff;
  --color-indigo-200: #c7d2fe;
  --color-indigo-600: #4f46e5; /* highlight border — 6.3:1 */
  --color-indigo-800: #3730a3; /* highlight text — 8.9:1 on indigo-50 */

  /* --- Typography --- */
  --font-sans: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* --- Shape --- */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* --- Depth (UI guide §4): soft, low shadows; never stacked or blurred glass --- */
  --shadow-card: 0 1px 2px rgb(20 40 24 / 0.06), 0 1px 3px rgb(20 40 24 / 0.08);
  --shadow-raised: 0 4px 12px rgb(20 40 24 / 0.1), 0 1px 3px rgb(20 40 24 / 0.08);

  /* --- Motion --- */
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
}

/* Semantic variables (shadcn/ui format). Components read these, never the raw palette. */
:root {
  --radius: 10px;

  /* Cool slate page: white cards and the white side menu stand out with their border; green is kept for actions. Text ≥ 15.5:1, secondary ≥ 6.7:1 */
  --background: #e8edf3;
  --foreground: var(--color-earth-900);
  --card: #ffffff;
  --card-foreground: var(--color-earth-900);
  --popover: #ffffff;
  --popover-foreground: var(--color-earth-900);

  --primary: var(--color-leaf-600);
  --primary-foreground: #ffffff;
  --secondary: #ffffff;
  --secondary-foreground: var(--color-earth-900);
  --muted: var(--color-slate-200);
  --muted-foreground: var(--color-slate-600);
  --accent: var(--color-leaf-50);
  --accent-foreground: var(--color-leaf-800);

  --destructive: #b91c1c;
  --destructive-foreground: #ffffff;

  --border: #dde3ea; /* decorative card/divider lines; inputs keep --input (≥ 3:1) */
  --input: #6b8a72; /* field border: green-grey 3.8:1, reads as "fill me in", not as locked grey */
  --ring: var(--color-leaf-600);

  /* Brand surface: app header (white on leaf-700 = 7.1:1, readable in sunlight) */
  --brand: var(--color-leaf-700);
  --brand-foreground: #ffffff;
  --link: var(--color-leaf-700);

  /* Status: soft (chip/banner background), text (on soft background), strong (icon/button) */
  --danger: #b91c1c;
  --danger-soft: #fef2f2;
  --danger-text: #991b1b;
  --warning: #d97706;
  --warning-soft: #fffbeb;
  --warning-text: #92400e;
  --success: #15803d;
  --success-soft: #f0fdf4;
  --success-text: #166534;
  --info: #1d4ed8;
  --info-soft: #eff6ff;
  --info-text: #1e40af;

  /* Tables (UI guide §7.4): dark slate head with white text (10.4:1) so it never blends with the page;
     faint cool hover; indigo for highlighted data (totals, selection) */
  --table-head: var(--color-slate-700);
  --table-head-foreground: #ffffff;
  --row-hover: #f3f6fa;
  --highlight: var(--color-indigo-50);
  --highlight-foreground: var(--color-indigo-800);
  --highlight-border: var(--color-indigo-600);

  /* Icon tiles (KPI cards, avatars): tinted square + strong icon, all ≥ 5:1 */
  --tile-brand: var(--color-leaf-100);
  --tile-info: #dbeafe;
  --tile-warning: #fef3c7;
  --tile-danger: #fee2e2;

  /* Charts: categorical series. Red/yellow/orange are left out on purpose (they already mean status). */
  --chart-1: #15803d;
  --chart-2: #1d4ed8;
  --chart-3: #7c3aed;
  --chart-4: #0e7490;
  --chart-5: #be185d;
  --chart-target: var(--color-earth-500);
}

/* High-contrast mode (UX-08): <html data-contrast="high"> — all text ≥ 7:1 */
:root[data-contrast='high'] {
  --background: #ffffff;
  --primary: var(--color-leaf-700);
  --muted-foreground: var(--color-earth-900);
  --border: var(--color-earth-600);
  --input: var(--color-earth-900);
  --ring: var(--color-leaf-700);
  --warning-text: #78350f;
  --table-head: var(--color-earth-900);
  --highlight-foreground: #1e1b4b;
  --shadow-card: none;
}

/* Inside the brand header: text, icons, and hover/focus switch to light on dark green */
[data-surface='brand'] {
  --foreground: var(--brand-foreground);
  --muted-foreground: var(--color-leaf-100); /* 6.5:1 on leaf-700 */
  --accent: rgb(255 255 255 / 0.14);
  --accent-foreground: #ffffff;
  --ring: #ffffff;
  --link: #ffffff;
  background-color: var(--brand);
  color: var(--foreground);
}
:root[data-contrast='high'] [data-surface='brand'] {
  --muted-foreground: #ffffff;
}

/* User-selected font size (UX-08): <html data-font-size="large|x-large"> */
:root[data-font-size='large'] {
  font-size: 112.5%;
}
:root[data-font-size='x-large'] {
  font-size: 125%;
}

/*
 * Choices: tabs, filter chips, segmented options (UI guide §7.10).
 * Unselected still looks tappable (green-grey border, green text); selected is solid
 * dark green. Descriptions inside a selected choice turn light green (6.5:1).
 */
@utility choice {
  border-color: var(--input);
  background-color: var(--card);
  color: var(--color-leaf-800);
  &:hover {
    border-color: var(--color-leaf-600);
    background-color: var(--color-leaf-50);
  }
}
@utility choice-on {
  /* Tripled selector: wins over .choice and .choice:hover whatever order Tailwind emits them in */
  &&& {
    border-color: var(--color-leaf-700);
    background-color: var(--color-leaf-700);
    color: #ffffff;
    font-weight: 600;
    --muted-foreground: var(--color-leaf-100);
  }
}

/* Map semantic variables to Tailwind classes (bg-primary, text-danger-text, etc.) */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-link: var(--link);
  --color-tile-brand: var(--tile-brand);
  --color-table-head: var(--table-head);
  --color-table-head-foreground: var(--table-head-foreground);
  --color-row-hover: var(--row-hover);
  --color-highlight: var(--highlight);
  --color-highlight-foreground: var(--highlight-foreground);
  --color-highlight-border: var(--highlight-border);
  --color-tile-info: var(--tile-info);
  --color-tile-warning: var(--tile-warning);
  --color-tile-danger: var(--tile-danger);

  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-danger-text: var(--danger-text);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-warning-text: var(--warning-text);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-success-text: var(--success-text);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-info-text: var(--info-text);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
}

@layer base {
  html {
    color-scheme: light;
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

Jangan menulis hex langsung di komponen; pakai kelas Tailwind dari token ini (mis. `bg-primary`, `text-muted-foreground`, `bg-danger-soft`, `text-leaf-800`).

```css
/* SIGAP design tokens — usage rules: docs/pengembangan/07_Pedoman_UI_UX.md */

@theme {
  /* --- Brand palette: leaf green --- */
  --color-leaf-50: #f0fdf4;
  --color-leaf-100: #dcfce7;
  --color-leaf-200: #bbf7d0;
  --color-leaf-500: #22c55e; /* charts & large icons only, never text */
  --color-leaf-600: #15803d; /* primary — 5.0:1 on white */
  --color-leaf-700: #166534; /* primary pressed / high contrast — 7.1:1 */
  --color-leaf-800: #14532d;
  --color-leaf-900: #0f3d22; /* brand header pressed */

  /* --- Brand accent: honey (logo & login screen only, not working UI) --- */
  --color-honey-400: #fbbf24;
  --color-honey-700: #b45309;

  /* --- Warm neutrals (earth) --- */
  --color-earth-50: #fafaf9;
  --color-earth-100: #f5f5f4;
  --color-earth-200: #e7e5e4;
  --color-earth-300: #d6d3d1;
  --color-earth-500: #78716c; /* input border — 4.8:1 */
  --color-earth-600: #57534e; /* secondary text — 7.6:1 */
  --color-earth-900: #1c1917; /* primary text — 16.7:1 */

  /* --- Typography --- */
  --font-sans: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* --- Shape --- */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* --- Depth (UI guide §4): soft, low shadows; never stacked or blurred glass --- */
  --shadow-card: 0 1px 2px rgb(20 40 24 / 0.06), 0 1px 3px rgb(20 40 24 / 0.08);
  --shadow-raised: 0 4px 12px rgb(20 40 24 / 0.1), 0 1px 3px rgb(20 40 24 / 0.08);

  /* --- Motion --- */
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
}

/* Semantic variables (shadcn/ui format). Components read these, never the raw palette. */
:root {
  --radius: 10px;

  /* Very light leaf tint: cards stand out, text keeps ≥ 6.9:1 (secondary) and 15.9:1 (main) */
  --background: #eef2f6;
  --foreground: var(--color-earth-900);
  --card: #ffffff;
  --card-foreground: var(--color-earth-900);
  --popover: #ffffff;
  --popover-foreground: var(--color-earth-900);

  --primary: var(--color-leaf-600);
  --primary-foreground: #ffffff;
  --secondary: #ffffff;
  --secondary-foreground: var(--color-earth-900);
  --muted: #e2e8f0;
  --muted-foreground: var(--color-earth-600);
  --accent: var(--color-leaf-50);
  --accent-foreground: var(--color-leaf-800);

  --destructive: #b91c1c;
  --destructive-foreground: #ffffff;

  --border: #dbe3d8; /* decorative card/divider lines; inputs keep --input (≥ 3:1) */
  --input: #6b8a72; /* field border: green-grey 3.8:1, reads as "fill me in", not as locked grey */
  --ring: var(--color-leaf-600);

  /* Brand surface: app header (white on leaf-700 = 7.1:1, readable in sunlight) */
  --brand: var(--color-leaf-700);
  --brand-foreground: #ffffff;
  --link: var(--color-leaf-700);

  /* Status: soft (chip/banner background), text (on soft background), strong (icon/button) */
  --danger: #b91c1c;
  --danger-soft: #fef2f2;
  --danger-text: #991b1b;
  --warning: #d97706;
  --warning-soft: #fffbeb;
  --warning-text: #92400e;
  --success: #15803d;
  --success-soft: #f0fdf4;
  --success-text: #166534;
  --info: #1d4ed8;
  --info-soft: #eff6ff;
  --info-text: #1e40af;

  /* Icon tiles (KPI cards, avatars): tinted square + strong icon, all ≥ 5:1 */
  --tile-brand: var(--color-leaf-100);
  --tile-info: #dbeafe;
  --tile-warning: #fef3c7;
  --tile-danger: #fee2e2;

  /* Charts: categorical series. Red/yellow/orange are left out on purpose (they already mean status). */
  --chart-1: #15803d;
  --chart-2: #1d4ed8;
  --chart-3: #7c3aed;
  --chart-4: #0e7490;
  --chart-5: #be185d;
  --chart-target: var(--color-earth-500);
}

/* High-contrast mode (UX-08): <html data-contrast="high"> — all text ≥ 7:1 */
:root[data-contrast='high'] {
  --background: #ffffff;
  --primary: var(--color-leaf-700);
  --muted-foreground: var(--color-earth-900);
  --border: var(--color-earth-600);
  --input: var(--color-earth-900);
  --ring: var(--color-leaf-700);
  --warning-text: #78350f;
  --shadow-card: none;
}

/* Inside the brand header: text, icons, and hover/focus switch to light on dark green */
[data-surface='brand'] {
  --foreground: var(--brand-foreground);
  --muted-foreground: var(--color-leaf-100); /* 6.5:1 on leaf-700 */
  --accent: rgb(255 255 255 / 0.14);
  --accent-foreground: #ffffff;
  --ring: #ffffff;
  --link: #ffffff;
  background-color: var(--brand);
  color: var(--foreground);
}
:root[data-contrast='high'] [data-surface='brand'] {
  --muted-foreground: #ffffff;
}

/* User-selected font size (UX-08): <html data-font-size="large|x-large"> */
:root[data-font-size='large'] {
  font-size: 112.5%;
}
:root[data-font-size='x-large'] {
  font-size: 125%;
}

/*
 * Choices: tabs, filter chips, segmented options (UI guide §7.10).
 * Unselected still looks tappable (green-grey border, green text); selected is solid
 * dark green. Descriptions inside a selected choice turn light green (6.5:1).
 */
@utility choice {
  border-color: var(--input);
  background-color: var(--card);
  color: var(--color-leaf-800);
  &:hover {
    border-color: var(--color-leaf-600);
    background-color: var(--color-leaf-50);
  }
}
@utility choice-on {
  /* Tripled selector: wins over .choice and .choice:hover whatever order Tailwind emits them in */
  &&& {
    border-color: var(--color-leaf-700);
    background-color: var(--color-leaf-700);
    color: #ffffff;
    font-weight: 600;
    --muted-foreground: var(--color-leaf-100);
  }
}

/* Map semantic variables to Tailwind classes (bg-primary, text-danger-text, etc.) */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-link: var(--link);
  --color-tile-brand: var(--tile-brand);
  --color-tile-info: var(--tile-info);
  --color-tile-warning: var(--tile-warning);
  --color-tile-danger: var(--tile-danger);

  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-danger-text: var(--danger-text);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-warning-text: var(--warning-text);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-success-text: var(--success-text);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-info-text: var(--info-text);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
}

@layer base {
  html {
    color-scheme: light;
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```
