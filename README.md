# SIGAP — Repo Pengembangan (ARB-02)

**SIGAP** (Sistem Integrasi Gudang, Aktivitas Sales, dan Pelanggan dengan Pelacakan Batch) adalah aplikasi web untuk **CV Arba'in Jaya Mandiri**, produsen dan distributor produk herbal di Surakarta. Satu pesanan dari sales langsung memperbarui stok, riwayat outlet, dan capaian target, termasuk saat HP tanpa sinyal.

Repo ini dipakai tim **Antech Async** untuk membangun SIGAP selama UMS Health Innovation Hackathon 2026 (tantangan ARB-02). Bahan riset, proposal, dan notulensi ada di repo bahan tim terpisah; yang disalin ke sini hanya yang dibutuhkan developer.

## Mulai dari mana

| Kalau Anda ingin … | Buka |
|---|---|
| Paham produk, masalah, dan target | [docs/01-produk.md](docs/01-produk.md) |
| Tahu siapa penggunanya dan apa yang harus bisa mereka lakukan | [docs/02-pengguna-dan-tugas.md](docs/02-pengguna-dan-tugas.md) |
| Aturan stok, FEFO, mode tanpa sinyal, prioritas kunjungan | [docs/03-aturan-bisnis.md](docs/03-aturan-bisnis.md) |
| Daftar layar dan alur | [docs/04-layar.md](docs/04-layar.md) · [docs/04b-user-flow.md](docs/04b-user-flow.md) |
| Tabel dan kolom | [docs/05-model-data.md](docs/05-model-data.md) |
| Stack dan arsitektur | [docs/06-arsitektur.md](docs/06-arsitektur.md) |
| Apa yang dikerjakan duluan | [docs/07-backlog-mvp.md](docs/07-backlog-mvp.md) |
| Kapan fitur dianggap selesai | [docs/08-kriteria-uji.md](docs/08-kriteria-uji.md) |
| Hal yang belum diputuskan | [docs/09-celah-dan-keputusan-terbuka.md](docs/09-celah-dan-keputusan-terbuka.md) |
| Desain, prototipe, dan alur visual | Figma (tautan di bagian bawah) |

Purwarupa kode lama (Django + PostgreSQL, lulus 22/22 uji) tetap ada di repo bahan tim, folder `proyek/arb-02/purwarupa/`. Gunakan sebagai rujukan, terutama `penjualan/stok.py` (aturan stok dan FEFO), `penjualan/prediksi.py` (prediksi penjualan), dan `static/app.js` (antrean tanpa sinyal dengan Dexie), supaya logika yang sudah teruji tidak ditulis ulang dari nol.

## Jadwal

| Tanggal | Kegiatan | Yang harus siap |
|---|---|---|
| 6 Nov 2026 | Pembekalan dan problem-owner clinic dengan mitra (Hotel Megaland) | Prototipe Figma, daftar pertanyaan, [deck paparan](https://claude.ai/artifact/SrTHvt3sYpFLrAQtUKqHfD) |
| **14 Nov 2026** | **Hackathon Day 1: evaluasi progres dan penyaringan finalis** | **5 fitur inti MVP bisa diperagakan** |
| 15–27 Nov 2026 | Pengembangan dan penyempurnaan aplikasi | Backlog P1–P2 |
| 28–29 Nov 2026 | Hackathon Day 2–3: camp, demo day, pemilihan juara | Skenario demo ±4 menit lancar |
| s.d. Apr 2027 | Uji kegunaan dan uji coba terbatas di mitra | Target TKT 6 |

## Tim

| Anggota | Peran | Memutuskan |
|---|---|---|
| Purwo Setiawan | Ketua · Analis kebutuhan, operasional dan regulasi | Kebutuhan klien dan fitur; komunikasi resmi dengan panitia |
| Ridwan Renaldi | **Lead developer** | Stack, arsitektur, kode yang masuk (review dan merge) |
| Muhammad Hammam Islami | Project manager · Bisnis dan hilirisasi | Jadwal, prioritas, pembagian tugas |
| Reza Amin Thohari | QA/Tester · UI halaman sales | Lulus atau tidaknya uji sebelum demo |

Semua anggota boleh ikut mengembangkan dan menawarkan bantuan di luar jobdesk. Keputusan tetap pada pemilik jobdesk di tabel di atas. Yang membangun tidak menguji karyanya sendiri.

## Aturan repo

- Repo sebaiknya **private**.
- **Jangan commit data mitra asli** (nama PIC, nomor HP, data penjualan). Pakai data contoh atau data yang sudah dianonimkan. Data dummy dari mitra disimpan di luar repo kecuali mitra mengizinkan.
- Nomor BPOM di data contoh memakai awalan `TR-CONTOH-` dan bersifat fiktif.
- Riwayat penjualan untuk prediksi di data contoh adalah **data sintetis**. Jangan dipresentasikan sebagai data mitra.
- `SECRET_KEY`, kata sandi basis data, dan konfigurasi server diisi lewat variabel lingkungan (`.env`), tidak di-commit.

## Tautan

- Figma hi-fi (desain dan prototipe): https://www.figma.com/design/cvBD4wgdf2jIGWW8NGOJZ7/SIGAP-%E2%80%94-Hi-fi-Prototype--ARB-02-?node-id=31-304 (halaman "SIGAP · Hi-fi v2")
- FigJam user flow: https://www.figma.com/board/Dtii8Pg38TnDXi29melNsM/SIGAP-%E2%80%94-User-Flow--ARB-02-
- Notion, halaman utama tim (jadwal, notulensi per tahap, riset): https://app.notion.com/p/4081d04a089181da802dd99c5c2f1504
- Notion, database Tugas Tim (PIC, status, tenggat): https://app.notion.com/p/7eca86f1caf44a009f0d854c1915bce1
- Notion, daftar pertanyaan untuk mitra (problem/goal statement, pain point): https://app.notion.com/p/4081d04a08918180be65e151c4616037
- Deck paparan clinic 6 Nov (7 slide): https://claude.ai/artifact/SrTHvt3sYpFLrAQtUKqHfD
- Laman tantangan ARB-02: https://ihub.ums.ac.id/hackathon/tantangan/arb-02-integrasi-data-pelanggan-aktivitas-sales-dan-stok

Halaman Notion dan deck paparan bersifat pribadi; minta akses ke project manager (Hammam).
