# Struktur_Folder — SIGAP CV Arba'in

17 November 2026 · Antech Async · Turunan dari dokumen 04 (System Design) §1.3 dan §12

Repo ini adalah **monorepo**: backend Laravel dan frontend PWA React di satu repo, supaya perubahan API dan layar yang terkait bisa masuk dalam satu merge request. Backend dan frontend sudah di-*scaffold* (§4). Folder tambahan di bawah (modul, fitur, dsb.) adalah **target**: dibuat **saat pertama kali diisi kode**, bukan disiapkan kosong.

## 1. Gambaran besar

```text
ums-hackaton-arb02/
├── backend/            REST API Laravel 13 (modular monolith)
├── frontend/           PWA React 19 untuk semua peran
├── docs/
│   ├── pengembangan/   Dokumen rancangan 01–08 (sumber kebenaran)
│   ├── referensi/      Bahan dari repo tim (mitra, proposal, review Figma)
│   ├── adr/            Catatan keputusan arsitektur (ADR)
│   └── api/            Ekspor OpenAPI dari Scramble (openapi.json)
├── infra/docker/       Dockerfile produksi, konfigurasi Nginx/PHP-FPM
├── scripts/            Skrip bantu (generate tipe API, seed data contoh, dsb.)
├── .editorconfig
├── .gitattributes
└── .gitignore
```

## 2. Backend (`backend/`)

Kode dibagi **per domain bisnis**, sesuai SDD §12. Satu modul memiliki model, aksi, event, HTTP, kebijakan izin, dan tesnya sendiri. Modul lain hanya boleh memanggil modul ini lewat **Action** atau **Event**-nya, tidak langsung mengubah model modul lain.

```text
backend/
├── app/
│   ├── Core/                   Mekanisme lintas modul (dipakai semua domain)
│   │   ├── Persetujuan/        Persetujuan umum (SDD §4.4): tabel persetujuan, PerluPersetujuan trait
│   │   ├── Koreksi/            Perbaiki, koreksi, batalkan, mesin status (SDD §4.5)
│   │   ├── Sinkron/            Terima transaksi offline idempoten (client_uuid), paket kerja
│   │   ├── Audit/              Konfigurasi activitylog, halaman riwayat
│   │   └── Support/            Helper umum: Rupiah, nomor dokumen, ULID, base classes
│   ├── Modules/
│   │   ├── Outlet/             OT  — outlet, penugasan, gabung outlet, stok standar
│   │   ├── Produk/             PR  — produk, kategori, potongan, daftar harga
│   │   ├── Gudang/             GD  — lokasi stok, batch, saldo, mutasi, barang masuk, opname, retur
│   │   ├── Kunjungan/          KS  — transaksi titip & penjualan, nota
│   │   ├── Tagihan/            TG  — tagihan, pembayaran, setoran
│   │   ├── Laporan/            LP  — ringkasan pimpinan + laporan Excel/PDF
│   │   ├── Pengaturan/         PG  — kunci–nilai aturan, daftar pilihan, impor/ekspor (IE)
│   │   ├── Akses/              AK  — pengguna, peran, izin, perangkat
│   │   └── Maklon/             Fase 4 (dokumen 06); folder disiapkan, belum dikerjakan
│   ├── Http/                   (bawaan Laravel) middleware global saja
│   ├── Models/User.php         (bawaan Laravel) dipindah/diwariskan ke Modules/Akses
│   └── Providers/              Mendaftarkan ServiceProvider tiap modul
├── database/
│   ├── migrations/             Satu folder, nama file diawali modul: 2026_11_20_000100_gudang_buat_tabel_batch.php
│   ├── factories/
│   └── seeders/
│       └── contoh/             Data contoh anonim (BPOM "TR-CONTOH-…"), bukan data mitra
├── routes/
│   ├── api.php                 Hanya memuat routes/api/v1/*.php dengan prefiks /api/v1
│   └── api/v1/                 Satu file per modul: outlet.php, gudang.php, sinkron.php, …
└── tests/
    ├── Feature/<Modul>/        Tes Pest per endpoint/alur
    └── Unit/<Modul>/           Tes aturan bisnis murni (FEFO, saran isi ulang, potongan)
```

### 2.1 Isi satu modul

Buat subfolder hanya saat dibutuhkan. Contoh lengkap untuk `Modules/Kunjungan/`:

```text
Kunjungan/
├── Models/                 Transaksi.php, TransaksiDetail.php
├── Actions/                SimpanKunjunganTitip.php, HitungSaranIsiUlang.php   ← logika bisnis di sini
├── Data/                   DTO masukan/keluaran (array bertipe / readonly class)
├── Events/                 KunjunganDisimpan.php
├── Listeners/
├── Enums/                  JenisTransaksi.php, StatusTransaksi.php
├── Http/
│   ├── Controllers/        Tipis: validasi → panggil Action → kembalikan Resource
│   ├── Requests/           FormRequest (validasi + otorisasi izin)
│   └── Resources/          API Resource (bentuk JSON untuk Scramble/Orval)
├── Policies/
├── Exports/  Imports/      Laravel Excel (bila modul punya impor/ekspor)
└── KunjunganServiceProvider.php
```

Aturan:

1. **Controller tidak berisi logika bisnis.** Semua hitungan (laku, isi ulang, tagihan, mutasi stok) ada di Action dan dites di `tests/Unit`.
2. **Angka aturan dibaca dari Pengaturan**, tidak ditulis mati (SDD prinsip 2). Gunakan `Pengaturan::nilai('batas_tagih')`.
3. **Mutasi stok hanya lewat** `Modules/Gudang/Actions/CatatMutasi` dalam satu transaksi DB.
4. Nama domain memakai **Bahasa Indonesia** sama dengan nama tabel (`Outlet`, `Tagihan`, `SimpanKunjunganTitip`); istilah teknis framework tetap Inggris (`Controller`, `Request`, `Resource`, `Policy`).
5. Setiap endpoint ada di bawah `/api/v1` (SDD §12).

## 3. Frontend (`frontend/`)

Satu PWA untuk semua peran (PW-01). Rute dibagi menjadi dua **area** agar kode termuat terpisah (SDD §1.2): HP sales tidak mengunduh halaman kantor.

```text
frontend/
├── public/
│   └── icons/                  Ikon PWA 192/512/maskable, logo SVG
├── src/
│   ├── app/                    main.tsx, providers (QueryClient, Router, Toaster), pendaftaran service worker
│   ├── routes/                 TanStack Router (file-based)
│   │   ├── _auth/              Masuk, lupa sandi (L1)
│   │   ├── lapangan/           Layar sales HP: M1 outlet saya … M6 hari ini
│   │   └── kantor/             Layar admin, gudang, pimpinan: W1–W13 (menu difilter izin)
│   ├── features/<modul>/       Sama dengan modul backend
│   │   ├── api/                Hook TanStack Query tambahan (di luar hasil Orval)
│   │   ├── components/         Komponen khusus modul (KartuOutlet, BarisKunjungan)
│   │   ├── hooks/
│   │   └── schemas/            Skema Zod (form & data offline)
│   ├── components/
│   │   ├── ui/                 Komponen shadcn/ui (hasil `npx shadcn add`), boleh diubah
│   │   ├── layout/             NavBawah, MenuSamping, KepalaHalaman, TataLetakLapangan/Kantor
│   │   └── common/             Komponen SIGAP lintas modul: StatusChip, StepperAngka, TabelData, BannerSinyal
│   ├── lib/
│   │   ├── api/generated/      Hasil Orval dari docs/api/openapi.json — JANGAN diedit manual
│   │   ├── api/client.ts       Instance fetch + token Sanctum
│   │   ├── format.ts           formatRupiah, formatTanggal, formatRelatif (pedoman UI §9.2)
│   │   └── utils.ts            cn() dan helper kecil
│   ├── offline/                Dexie: db.ts, antrean transaksi, paket kerja, kirim ulang
│   ├── stores/                 Zustand: sesi, preferensi tampilan (ukuran huruf, kontras)
│   ├── i18n/id/                Teks antarmuka (siap multi-bahasa, SDD §12)
│   ├── styles/
│   │   ├── tokens.css          Token desain — lihat 07_Pedoman_UI_UX
│   │   └── globals.css         @import tailwindcss + tokens
│   └── sw.ts                   Service worker (vite-plugin-pwa, injectManifest)
└── tests/
    ├── unit/                   Vitest + Testing Library
    └── e2e/                    Playwright: offline, 360/768/1280 px
```

Aturan:

1. `routes/` hanya menyusun halaman; isi layar diambil dari `features/`.
2. `features/A` tidak boleh mengimpor dari `features/B`. Bila perlu dipakai bersama, pindahkan ke `components/common` atau `lib`.
3. Semua akses data server lewat hook Orval/TanStack Query; semua tulisan dari lapangan lewat `offline/` (antrean Dexie) dulu.
4. Nama file komponen `PascalCase.tsx`, hook `useSesuatu.ts`, lainnya `kebab-case.ts`. Nama domain berbahasa Indonesia.
5. Alias impor `@/` menunjuk ke `src/`.

## 4. Catatan scaffold (sudah dilakukan 17 Nov 2026)

Scaffold sudah dijalankan; anggota tim cukup mengikuti "Menjalankan secara lokal" di [09_Konvensi_Kerja_Tim](09_Konvensi_Kerja_Tim.md) §7. Hasilnya:

| Bagian | Isi | Versi terpasang |
| --- | --- | --- |
| Backend | Laravel + Sanctum (`install:api`), paket SDD §1.3, Pest, Larastan (`phpstan.neon` level 5), Pint | Laravel 13.42, PHP 8.5, Pest 5 |
| Frontend | Vite React TS, Tailwind 4 (plugin Vite), TanStack Router (file-based + code splitting), TanStack Query, vite-plugin-pwa, token desain di `src/styles/tokens.css`, `components.json` shadcn/ui, helper `src/lib/format.ts` | React 19.3, Vite 8.3, TypeScript 7 |
| Konfigurasi | `.env.example` → MySQL `sigap`, locale `id`; proxy Vite `/api` → `127.0.0.1:8000`; font Inter latin ikut di-precache service worker | — |

Perbedaan dari SDD (oxlint, TanStack Table v9, MySQL 8.4, GitHub) dicatat di [ADR 0001](../adr/0001-penyesuaian-versi-saat-scaffold.md). Komponen shadcn/ui ditambah per kebutuhan dengan `npx shadcn@latest add <nama>`.

> **Periksa setelah `shadcn add`.** Generator kadang gagal membaca alias `@/lib/utils` (TypeScript 7), lalu menulis `import { cn } from "cn"` **dan memasang paket npm `cn` milik pihak lain**. Bila itu terjadi: `npm uninstall cn`, ganti impornya menjadi `@/lib/utils`, lalu sesuaikan ukuran komponen dengan Pedoman UI §7 (tombol & input 48 px di HP).

Perintah yang dipakai, sebagai catatan:

```bash
# Backend
composer create-project laravel/laravel:^13.0 backend
cd backend && composer require laravel/sanctum spatie/laravel-permission spatie/laravel-activitylog \
  maatwebsite/excel spatie/laravel-pdf spatie/laravel-query-builder dedoc/scramble \
  laravel-notification-channels/webpush spatie/laravel-backup laravel/pennant
composer require --dev pestphp/pest pestphp/pest-plugin-laravel larastan/larastan laravel/pint

# Frontend
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend && npm i @tanstack/react-router @tanstack/react-query @tanstack/react-table dexie dexie-react-hooks \
  react-hook-form zod zustand date-fns lucide-react sonner recharts @fontsource-variable/inter
npm i -D tailwindcss @tailwindcss/vite vite-plugin-pwa orval vitest @testing-library/react @playwright/test
```

Selanjutnya:

1. Folder `app/Modules/<Modul>` dan `src/features/<modul>` dibuat saat modul itu mulai dikerjakan. Autoload tidak perlu diubah karena `App\\` sudah mencakup `app/Modules/`.
2. Folder `docs/api/`, `infra/docker/`, dan `scripts/` dibuat saat pertama kali ada isinya (ekspor OpenAPI, Dockerfile, skrip).

## 5. Dokumen dan keputusan

- Dokumen rancangan bernomor di `docs/pengembangan/` (01–08). Dokumen baru melanjutkan nomor.
- Keputusan teknis yang mengubah dokumen 04 dicatat sebagai ADR di `docs/adr/NNNN-judul.md` (format: konteks, keputusan, akibat).
- `docs/api/openapi.json` dihasilkan otomatis dari backend (`php artisan scramble:export`), lalu frontend menjalankan `npx orval` untuk memperbarui `src/lib/api/generated/`.
