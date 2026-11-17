# 0001 — Penyesuaian versi dan alat saat scaffold

Tanggal: 2026-11-17 · Status: diterima · Pemutus: Ridwan Renaldi (lead developer)

## Konteks

SDD (dokumen 04 §1, §1.3) ditulis sebelum kode dibuat. Saat scaffold tanggal 17 Nov 2026, beberapa versi dan alat yang benar-benar terpasang berbeda dari yang tertulis, karena template generator dan ketersediaan paket.

## Keputusan

| Hal | SDD | Dipakai | Alasan |
| --- | --- | --- | --- |
| Basis data | MySQL 9.7 LTS | **MySQL 8.4 LTS** | Tersedia di lingkungan lokal dan umum di hosting; SDD sudah menyebutnya sebagai alternatif. Tidak ada fitur 9.x yang dipakai |
| Lint frontend | ESLint + Prettier | **oxlint** + Prettier | Bawaan template Vite saat ini; jauh lebih cepat, aturan inti setara |
| TypeScript | (tidak disebut) | **TypeScript 7** | Bawaan template Vite |
| Tabel | TanStack Table v8 | **TanStack Table v9** | Versi stabil terbaru saat dipasang |
| Service worker | vite-plugin-pwa mode `injectManifest` | Mode **`generateSW`** dulu | Cukup untuk cache aset offline. Pindah ke `injectManifest` (`src/sw.ts`) saat Web Push (PW-08) dikerjakan |
| Repo & CI | GitLab CI | **GitHub** (remote `origin`); CI memakai GitHub Actions saat dibuat | Repo tim ada di GitHub |
| Lingkungan lokal | (tidak disebut) | PHP 8.5 & MySQL dari WampServer, Composer 2, Node 26 LTS | Sudah tersedia di laptop lead developer; anggota lain bebas memakai Herd/Laragon selama versinya sama |

## Akibat

- Dokumen 04 §1 dan §1.3 tidak diubah; ADR ini yang menjadi rujukan versi terbaru.
- `.env.example` memakai `DB_CONNECTION=mysql` dengan database `sigap`.
- Saat CI dibuat, pemeriksaan yang dijalankan sama dengan [09_Konvensi_Kerja_Tim](../pengembangan/09_Konvensi_Kerja_Tim.md) §5.
