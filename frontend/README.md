# SIGAP — Frontend (PWA)

Satu aplikasi PWA React untuk semua peran SIGAP. Panduan lengkap ada di root repo:

- Menjalankan lokal: [README](../README.md#-memulai-pengembangan)
- Aturan tampilan: [07 · Pedoman UI/UX](../docs/pengembangan/07_Pedoman_UI_UX.md)
- Susunan kode: [08 · Struktur Folder](../docs/pengembangan/08_Struktur_Folder.md)
- Branch, commit, PR: [09 · Konvensi Kerja Tim](../docs/pengembangan/09_Konvensi_Kerja_Tim.md)

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan (http://localhost:5173), `/api` diteruskan ke backend :8000 |
| `npm run build` | Build produksi + service worker |
| `npm run lint` | oxlint |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run test` | Vitest |
| `npm run format` | Prettier |

`src/routeTree.gen.ts` dibuat otomatis oleh TanStack Router saat `dev`/`build`; jangan diedit manual.
