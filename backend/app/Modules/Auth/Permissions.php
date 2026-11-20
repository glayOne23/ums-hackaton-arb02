<?php

namespace App\Modules\Auth;

/**
 * Permission catalog (SDD §7, SRS PG-08).
 *
 * Name format: "<resource>.<action>" in English, e.g. "outlet.manage".
 * The value is the Indonesian label shown on the Roles & Permissions screen.
 * Authorization is always checked on the server by permission name, never by role name.
 */
final class Permissions
{
    /** @var array<string, string> permission name => UI label */
    public const ALL = [
        'dashboard.view' => 'Lihat ringkasan',
        'report.view' => 'Lihat laporan',
        'outlet.view' => 'Lihat outlet',
        'outlet.view_all' => 'Lihat semua outlet (bukan hanya outlet tugas sendiri)',
        'outlet.manage' => 'Tambah/ubah outlet & penugasan',
        'outlet.propose' => 'Usulkan outlet baru',
        'product.view' => 'Lihat produk & harga',
        'product.manage' => 'Tambah/ubah produk, harga & potongan',
        'discount.approve' => 'Setujui perubahan potongan',
        'inventory.view' => 'Lihat stok gudang',
        'inventory.manage' => 'Barang masuk, retur, opname',
        'stock_adjustment.approve' => 'Setujui penyesuaian opname',
        'stock_request.view' => 'Lihat permintaan barang',
        'stock_request.create' => 'Ajukan permintaan barang',
        'stock_request.prepare' => 'Siapkan barang untuk sales',
        'stock_request.approve' => 'Setujui barang keluar gudang',
        'visit.view' => 'Lihat kunjungan & penjualan',
        'visit.create' => 'Catat kunjungan & penjualan',
        'visit.correct' => 'Perbaiki kunjungan & penjualan',
        'invoice.view' => 'Lihat tagihan',
        'invoice.manage' => 'Ubah tagihan & pembayaran',
        'payment.record' => 'Catat pembayaran dari outlet',
        'remittance.receive' => 'Terima setoran sales',
        'setting.manage' => 'Ubah pengaturan aturan bisnis',
        'user.manage' => 'Kelola pengguna, peran & izin',
    ];
}
