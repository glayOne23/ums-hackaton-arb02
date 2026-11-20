# 0003 — Opsi Docker untuk backend di lingkungan lokal

Tanggal: 2026-11-20 · Status: usulan · Pemutus: Ridwan Renaldi (lead developer)

## Konteks

ADR 0001 menetapkan lingkungan lokal memakai PHP 8.5 dan MySQL dari WampServer, Herd, atau Laragon. Anggota tim yang memakai Linux tidak punya paket PHP 8.5 lengkap dengan ekstensi yang dibutuhkan paket kita: `pdo_mysql`, `zip` (spatie/laravel-backup), `gd` dan `intl` (Laravel Excel, PDF), serta `bcmath`. Sebagian anggota juga sudah menjalankan MySQL di container untuk proyek lain.

Lingkungan lokal yang dicari harus:

- memakai versi PHP yang sama dengan server (8.5);
- tidak perlu build ulang setiap kali kode berubah;
- tidak memaksa MySQL ikut di-container-kan.

## Keputusan

Menambahkan **opsi** menjalankan backend lewat Docker Compose untuk pengembangan lokal. Opsi ini tidak menggantikan cara di ADR 0001.

- `backend/docker/dev.Dockerfile` berisi PHP 8.5 CLI, ekstensi di atas, dan Composer. Kode tidak disalin ke dalam image.
- `backend/compose.yaml` punya dua layanan, `app` (`php artisan serve` di 127.0.0.1:8000) dan `queue` (`queue:listen`). Keduanya me-mount folder `backend`, sehingga perubahan kode langsung terpakai.
- `network_mode: host` dipakai agar container bisa menjangkau MySQL di `127.0.0.1:<port>`, baik MySQL di laptop maupun container MySQL lain yang port-nya dibuka. Dengan cara ini, proxy `/api` di Vite juga tetap menuju `127.0.0.1:8000` tanpa setelan tambahan.
- Container berjalan dengan UID/GID pengguna (bawaan 1000), sehingga file buatan `artisan` dan `composer` tetap milik pengguna.
- MySQL tidak termasuk di compose ini. Setiap orang mengisi `DB_HOST`, `DB_PORT`, dan kredensialnya di `.env` sesuai MySQL yang dipakai.
- Frontend tetap dijalankan langsung (`npm run dev`), karena hot reload Vite paling cepat tanpa container.

## Akibat

- Anggota tim di Linux cukup memasang Docker, tanpa PHP lokal. Image dibuat ulang hanya saat `dev.Dockerfile` berubah.
- `network_mode: host` hanya berlaku penuh di Linux. Pengguna Docker Desktop (Windows/macOS) sebaiknya tetap memakai Herd/Laragon/WampServer sesuai ADR 0001. Kalau nanti dibutuhkan, compose bisa ditambah varian dengan pemetaan port dan `host.docker.internal`.
- Compose ini khusus pengembangan, bukan untuk produksi.
- README bagian "Memulai pengembangan" ditambah langkah opsi Docker.
