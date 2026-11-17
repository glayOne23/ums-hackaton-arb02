<?php

namespace App\Modules\Akses;

/**
 * Katalog izin dan peran bawaan (SDD §7, SRS PG-08).
 *
 * Nama izin: "<area>.<aksi>". Peran bawaan hanya titik awal; admin bisa
 * mencentang ulang izin tiap peran atau membuat peran baru dari menu Peran & Izin.
 * Otorisasi selalu dicek di server dengan nama izin ini, bukan nama peran.
 */
final class Izin
{
    public const PERAN_PIMPINAN = 'pimpinan';

    public const PERAN_ADMIN_KANTOR = 'admin_kantor';

    public const PERAN_ADMIN_GUDANG = 'admin_gudang';

    public const PERAN_SALES = 'sales';

    /** @var array<string, string> nama izin => keterangan untuk layar Peran & Izin */
    public const SEMUA = [
        'ringkasan.lihat' => 'Lihat ringkasan',
        'laporan.lihat' => 'Lihat laporan',
        'outlet.lihat' => 'Lihat outlet',
        'outlet.ubah' => 'Tambah/ubah outlet & penugasan',
        'outlet.usul' => 'Usulkan outlet baru',
        'produk.lihat' => 'Lihat produk & harga',
        'produk.ubah' => 'Tambah/ubah produk, harga & potongan',
        'potongan.setujui' => 'Setujui perubahan potongan',
        'gudang.lihat' => 'Lihat stok gudang',
        'gudang.ubah' => 'Barang masuk, retur, opname',
        'permintaan.lihat' => 'Lihat permintaan barang',
        'permintaan.ajukan' => 'Ajukan permintaan barang',
        'permintaan.siapkan' => 'Siapkan barang untuk sales',
        'permintaan.setujui' => 'Setujui barang keluar gudang',
        'kunjungan.lihat' => 'Lihat kunjungan & penjualan',
        'kunjungan.buat' => 'Catat kunjungan & penjualan',
        'kunjungan.perbaiki' => 'Perbaiki kunjungan & penjualan',
        'tagihan.lihat' => 'Lihat tagihan',
        'tagihan.ubah' => 'Ubah tagihan & pembayaran',
        'tagihan.catat' => 'Catat pembayaran dari outlet',
        'setoran.terima' => 'Terima setoran sales',
        'pengaturan.ubah' => 'Ubah pengaturan aturan bisnis',
        'pengguna.ubah' => 'Kelola pengguna, peran & izin',
    ];

    /** @return array<string, list<string>> peran => izin bawaan */
    public static function peranBawaan(): array
    {
        return [
            self::PERAN_PIMPINAN => [
                'ringkasan.lihat', 'laporan.lihat', 'outlet.lihat', 'produk.lihat',
                'potongan.setujui', 'gudang.lihat', 'permintaan.lihat',
                'kunjungan.lihat', 'tagihan.lihat',
            ],
            self::PERAN_ADMIN_KANTOR => [
                'ringkasan.lihat', 'laporan.lihat', 'outlet.lihat', 'outlet.ubah',
                'produk.lihat', 'produk.ubah', 'permintaan.lihat',
                'kunjungan.lihat', 'kunjungan.perbaiki',
                'tagihan.lihat', 'tagihan.ubah', 'setoran.terima',
                'pengaturan.ubah', 'pengguna.ubah',
            ],
            self::PERAN_ADMIN_GUDANG => [
                'laporan.lihat', 'produk.lihat', 'gudang.lihat', 'gudang.ubah',
                'permintaan.lihat', 'permintaan.siapkan', 'permintaan.setujui',
            ],
            self::PERAN_SALES => [
                'ringkasan.lihat', 'outlet.lihat', 'outlet.usul', 'produk.lihat',
                'permintaan.ajukan', 'kunjungan.buat', 'kunjungan.perbaiki', 'tagihan.catat',
            ],
        ];
    }

    /** Peran yang memakai area "lapangan" (layar HP sales) setelah masuk. */
    public const PERAN_LAPANGAN = [self::PERAN_SALES];
}
