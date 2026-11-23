# Sumber pitch deck SIGAP

Bahan untuk membuat ulang `docs/pitch/SIGAP_Pitch_Deck.pptx` dan `.pdf`.

| File | Isi |
| --- | --- |
| `build.js` | Menyusun 10 slide (teks, catatan pembicara, grafik, tangkapan layar) dengan pptxgenjs |
| `shots.cjs` | Mengambil ulang tangkapan layar dari aplikasi yang sedang jalan (Playwright) |
| `shots/` | Tangkapan layar yang dipakai deck: `m-*` layar HP sales, `d-*` layar kantor. Data contoh fiktif |

## Mengubah isi slide

Teks, angka, dan catatan pembicara ada di `build.js`, satu blok per slide (`// ===== 1. Pembuka =====` dan seterusnya).

```bash
cd docs/pitch/sumber
npm install
npm run build          # menulis ../SIGAP_Pitch_Deck.pptx
```

PDF dibuat dari PPTX dengan LibreOffice:

```bash
soffice --headless --convert-to pdf --outdir .. ../SIGAP_Pitch_Deck.pptx
```

## Mengambil ulang tangkapan layar

Perlu backend dengan data contoh (`php artisan migrate --seed`) dan frontend dev server di `http://localhost:5173` (atau atur `PITCH_BASE_URL`). Script masuk sebagai `sales1`, `pimpinan`, `gudang`, dan `kantor`, membuka layar, lalu memotretnya. Kunjungan tidak disimpan, jadi data tidak berubah.

```bash
cd frontend && npm install && npx playwright install chromium   # sekali
cd ../docs/pitch/sumber
npm run shots          # menimpa isi shots/
npm run build
```

Layar kunjungan diambil dari outlet pertama milik `sales1` yang masih punya titipan di rak, dalam keadaan tanpa sinyal.

## Font

Judul memakai Cambria, isi memakai Calibri. Keduanya terpasang bersama Microsoft Office. Di LibreOffice tanpa font itu, ukuran teks bisa sedikit berbeda.
