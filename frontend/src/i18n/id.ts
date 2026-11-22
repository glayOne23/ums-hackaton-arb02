/**
 * FP-08: interface texts kept apart from the code, so another language is one
 * more file like this. Keys are English (ADR 0002), texts Indonesian.
 *
 * Moved here so far: the app frame and shared components. Screens move over
 * gradually; new text goes here (doc 09 §6).
 */
export const id = {
  app: {
    name: 'SIGAP',
    company: "CV Arba'in",
    signOut: 'Keluar',
    help: 'Bantuan',
    more: 'Lainnya',
    menu: 'Menu',
    mainMenu: 'Menu utama',
  },
  nav: {
    groups: {
      monitor: 'Pantauan',
      sales: 'Penjualan',
      stock: 'Produk & gudang',
      admin: 'Administrasi',
    },
    items: {
      dashboard: 'Ringkasan',
      reports: 'Laporan',
      outlets: 'Outlet',
      visits: 'Kunjungan',
      billing: 'Tagihan',
      products: 'Produk',
      discounts: 'Potongan',
      inventory: 'Gudang',
      corrections: 'Koreksi',
      imports: 'Impor Excel',
      users: 'Pengguna',
      settings: 'Pengaturan',
    },
  },
  connection: {
    online: 'Tersambung',
    offline: 'Tersimpan di HP',
  },
  update: {
    available: 'Versi baru SIGAP tersedia.',
    reload: 'Muat ulang',
  },
  pagination: {
    label: 'Halaman',
    previous: 'Sebelumnya',
    next: 'Berikutnya',
    page: 'Halaman {page}',
    pageOf: 'Hal. {page} dari {last}',
    of: 'dari',
  },
  save: {
    nothingChanged: 'Belum ada perubahan',
    saveChanges: 'Simpan ({count} perubahan)',
    unsaved: '{count} perubahan belum disimpan',
  },
  voids: {
    pendingChip: 'Pembatalan menunggu persetujuan',
    requested: 'Diajukan {by}, {date}: {reason}',
    requestedToast: 'Pembatalan diajukan. Menunggu persetujuan Pimpinan.',
  },
  table: {
    actions: 'Aksi',
  },
} as const

/** The shape every other language file must follow */
export type Messages = typeof id
