/**
 * UX-09: one short tip per screen, shown the first time it is opened. Field
 * words (UX-04), what the screen is for, and the one thing to know. Matched
 * on the path; the first match wins, so specific paths come first.
 */
export interface ScreenHint {
  id: string
  match: RegExp
  title: string
  text: string
}

export const HINTS: ScreenHint[] = [
  // Field (sales phone)
  {
    id: 'field-visit',
    match: /^\/field\/visit\//,
    title: 'Kunjungan titip jual',
    text: 'Ubah hanya Sisa yang berkurang dengan tombol − / +. Laku, isi ulang, dan tagihan dihitung otomatis. Tidak ada yang laku? Tekan "Tidak ada yang laku".',
  },
  {
    id: 'field-sale',
    match: /^\/field\/sale\//,
    title: 'Penjualan langsung',
    text: 'Isi jumlah yang dibeli dari barang yang Anda bawa. Total dan tagihan dihitung otomatis.',
  },
  {
    id: 'field-receipt',
    match: /^\/field\/receipt\//,
    title: 'Nota',
    text: 'Kirim nota ke WhatsApp outlet atau cetak. Salah input? Tekan "Perbaiki" (hari yang sama).',
  },
  {
    id: 'field-fix',
    match: /^\/field\/fix\//,
    title: 'Perbaiki nota',
    text: 'Ubah angka yang salah lalu simpan. Nota lama tidak dihapus; nota pengganti dibuat dan bisa dikirim ulang ke outlet.',
  },
  {
    id: 'field-today',
    match: /^\/field\/today/,
    title: 'Hari ini',
    text: 'Rekap kunjungan dan uang hari ini, barang yang Anda bawa, dan permintaan barang ke gudang. Nota yang gagal terkirim bisa dikirim ulang dari sini.',
  },
  {
    id: 'field-propose',
    match: /^\/field\/propose/,
    title: 'Usulkan outlet baru',
    text: 'Isi data toko baru. Outlet bisa dikunjungi setelah dicek admin kantor; statusnya terlihat di "Usulan saya".',
  },
  {
    id: 'field-request',
    match: /^\/field\/request/,
    title: 'Minta barang',
    text: 'Pilih produk dan jumlahnya. Gudang menyiapkan barang; Anda mendapat notifikasi saat siap diambil.',
  },
  {
    id: 'field-outlets',
    match: /^\/field\/?$/,
    title: 'Outlet saya',
    text: 'Ketuk outlet untuk mulai kunjungan. Saring "Perlu dikunjungi" untuk yang lama tidak didatangi. Semua tetap bisa dipakai tanpa sinyal.',
  },

  // Office
  {
    id: 'office-visit-detail',
    match: /^\/office\/visits\/.+/,
    title: 'Nota',
    text: 'Angka rak per produk, tagihan, dan foto form. Salah? "Ajukan koreksi" atau "Batalkan nota"; semua perubahan tercatat di Riwayat.',
  },
  {
    id: 'office-visits',
    match: /^\/office\/visits/,
    title: 'Kunjungan & penjualan',
    text: 'Semua nota dari HP sales. Yang bertanda "Perlu dicek" angkanya berbeda dengan server; periksa di menu Koreksi.',
  },
  {
    id: 'office-outlet-profile',
    match: /^\/office\/outlets\/[^/]+$/,
    title: 'Profil outlet',
    text: 'Stok titipan, riwayat kunjungan, dan tagihan outlet ini. Stok standar boleh kosong; bila diisi, sales disarankan mengisi ulang sampai jumlah itu.',
  },
  {
    id: 'office-outlets',
    match: /^\/office\/outlets\/?$/,
    title: 'Outlet',
    text: 'Cari dan saring outlet, tambah outlet baru, atau ekspor ke Excel. Usulan outlet dari sales muncul di atas daftar.',
  },
  {
    id: 'office-billing',
    match: /^\/office\/billing/,
    title: 'Tagihan',
    text: 'Tagihan yang belum lunas per outlet, yang paling lama di atas. Daftar bisa dicetak atau dikirim lewat WhatsApp untuk penagih.',
  },
  {
    id: 'office-products',
    match: /^\/office\/products/,
    title: 'Produk',
    text: 'Data produk dan harga. Perubahan harga berlaku untuk transaksi berikutnya; nota lama tidak berubah.',
  },
  {
    id: 'office-discounts',
    match: /^\/office\/discounts/,
    title: 'Potongan',
    text: 'Potongan per jenis outlet, per outlet, atau per produk. Potongan baru menunggu persetujuan Pimpinan bila diatur di Pengaturan.',
  },
  {
    id: 'office-count',
    match: /^\/office\/inventory\/count/,
    title: 'Opname',
    text: 'Jumlah sistem sudah terisi; ubah hanya yang berbeda dengan hitungan fisik. Salah simpan? "Buka ulang" di hari yang sama.',
  },
  {
    id: 'office-requests',
    match: /^\/office\/inventory\/requests/,
    title: 'Permintaan sales',
    text: 'Siapkan barang yang diminta sales; batch dengan ED terdekat dipilih otomatis.',
  },
  {
    id: 'office-receipts',
    match: /^\/office\/inventory\/receipts/,
    title: 'Barang masuk',
    text: 'Catat barang masuk dengan nomor batch dan ED. Tanpa sinyal tetap bisa dicatat; terkirim saat sinyal kembali.',
  },
  {
    id: 'office-returns',
    match: /^\/office\/inventory\/returns/,
    title: 'Retur',
    text: 'Barang kembali dari sales dengan kondisinya: baik masuk gudang, rusak dan kedaluwarsa dipisahkan.',
  },
  {
    id: 'office-inventory',
    match: /^\/office\/inventory/,
    title: 'Stok gudang',
    text: 'Stok per produk dan batch, dengan peringatan ED dekat dan stok menipis. Ketuk produk untuk kartu stoknya.',
  },
  {
    id: 'office-reports',
    match: /^\/office\/reports/,
    title: 'Laporan',
    text: 'Pilih laporan, atur saringan, lalu unduh Excel atau cetak.',
  },
  {
    id: 'office-imports',
    match: /^\/office\/imports/,
    title: 'Impor Excel',
    text: 'Unduh template, isi, lalu pilih file. Setiap baris diperiksa dulu sebelum disimpan; satu sesi impor bisa dibatalkan.',
  },
  {
    id: 'office-corrections',
    match: /^\/office\/corrections/,
    title: 'Koreksi & pemulihan',
    text: 'Nota yang perlu dicek, koreksi yang menunggu persetujuan, dan data yang terhapus.',
  },
  {
    id: 'office-settings',
    match: /^\/office\/settings/,
    title: 'Pengaturan',
    text: 'Aturan kerja yang bisa diubah tanpa programmer. Perubahan berlaku mulai transaksi berikutnya.',
  },
  {
    id: 'office-users',
    match: /^\/office\/users/,
    title: 'Pengguna',
    text: 'Tambah pengguna, atur peran, dan centang izin per peran.',
  },
  {
    id: 'office-dashboard',
    match: /^\/office\/?$/,
    title: 'Ringkasan',
    text: 'Angka utama bulan ini dan yang perlu ditindaklanjuti. Ketuk sebuah angka untuk membuka laporannya.',
  },
]

export function hintFor(pathname: string): ScreenHint | null {
  return HINTS.find((h) => h.match.test(pathname)) ?? null
}
