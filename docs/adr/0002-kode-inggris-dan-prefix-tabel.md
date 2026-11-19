# 0002 — Kode berbahasa Inggris dan prefix tabel per kelompok

Tanggal: 2026-11-18 · Status: diterima · Pemutus: Ridwan Renaldi (lead developer)

## Konteks

Dokumen 08 aturan 4 semula meminta nama domain di kode berbahasa Indonesia (`Masuk`, `PenggunaResource`, `Izin`), sementara istilah framework tetap berbahasa Inggris. Akibatnya kode bercampur dua bahasa (`SesiController::masuk`, `$pengguna->createToken`), dan nama tabel bawaan paket (`users`, `roles`, `jobs`) tidak bisa dibedakan dari tabel bisnis yang akan datang.

Saat keputusan ini dibuat, baru modul Akses yang selesai, dan semua tabel yang ada masih tabel bawaan framework/paket. Biaya perubahannya sekarang paling kecil.

## Keputusan

1. **Kode berbahasa Inggris, tampilan berbahasa Indonesia.** Bahasa Inggris dipakai untuk nama tabel, kolom, kelas, fungsi, variabel, file, rute API dan halaman, nama izin dan peran, nilai enum, kunci pengaturan, token desain, dan komentar kode. Bahasa Indonesia dipakai untuk semua teks yang dibaca pengguna (label, pesan, notifikasi, label izin/peran), dokumen di `docs/`, serta deskripsi commit/PR.
2. **Prefix tabel per kelompok** sesuai modul pemilik: `sys_`, `auth_`, `core_`, `cfg_`, `crm_`, `prd_`, `inv_`, `sls_`, `bil_`, `rpt_`, `mfg_`. Rinciannya di [10_Arsitektur_Basis_Data](../pengembangan/10_Arsitektur_Basis_Data.md).
3. Nama modul backend dan folder fitur frontend memakai Bahasa Inggris: `Auth`, `Setting`, `Outlet`, `Product`, `Inventory`, `Sales`, `Billing`, `Report`, `Manufacturing`.

Perubahan yang langsung diterapkan:

| Sebelum | Sesudah |
| --- | --- |
| `users`, `sessions`, `password_reset_tokens`, `personal_access_tokens`, `roles`, `permissions`, `model_has_*`, `role_has_permissions` | Diawali `auth_` |
| `migrations`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs` | Diawali `sys_` |
| Kolom `no_hp`, `aktif`, `terakhir_masuk_at` | `phone`, `is_active`, `last_login_at` |
| `app/Modules/Akses` (`Masuk`, `SesiController`, `Izin`, …) | `app/Modules/Auth` (`Login`, `SessionController`, `Permissions`, `Roles`) |
| API `POST /auth/login` `{login, kata_sandi, perangkat}` → `{token, pengguna}` | `{login, password, device_name}` → `{token, user}` |
| API `GET /auth/saya` | `GET /auth/me` |
| Peran `pimpinan`, `admin_kantor`, `admin_gudang` | `manager`, `office_admin`, `warehouse_admin` (`sales` tetap) |
| Izin `outlet.ubah`, `tagihan.catat`, … | `outlet.manage`, `payment.record`, … (lihat `App\Modules\Auth\Permissions`) |
| Halaman `/masuk`, `/lapangan`, `/kantor` | `/login`, `/field`, `/office` |
| `features/akses`, `useSesi`, `GalatApi`, `formatRupiah`, … | `features/auth`, `useSession`, `ApiError`, `formatCurrency`, … |
| Token warna `daun-*`, `madu-*`, `tanah-*`; tombol `size="utama"` | `leaf-*`, `honey-*`, `earth-*`; `size="cta"` |

## Akibat

- **Basis data lokal harus dibuat ulang:** `php artisan migrate:fresh --seed`. Belum ada data produksi, jadi migrasi lama diubah langsung tanpa migrasi rename.
- Sesi yang tersimpan di HP/browser (`sigap-sesi`) tidak terbaca lagi, sehingga pengguna perlu masuk ulang sekali.
- Dokumen 04 dan 06 tetap memakai istilah konsep berbahasa Indonesia. Nama tabel/kolom final ada di dokumen 10. Dokumen 07, 08, dan 09 disesuaikan.
- Tabel paket yang dipasang nanti (activitylog, webpush, pennant) wajib diberi prefix lewat konfigurasinya sebelum migrasi pertama.
