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
        'target.manage' => 'Atur target bulanan sales',
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
        'data.import' => 'Impor data dari Excel',
        'user.manage' => 'Kelola pengguna, peran & izin',
    ];

    /**
     * Rows of the Roles & Permissions screen (W9): one group per menu, in menu order.
     * Every permission in ALL belongs to exactly one group.
     *
     * @var array<string, list<string>> group title => permission names
     */
    public const GROUPS = [
        'Ringkasan & laporan' => ['dashboard.view', 'report.view', 'target.manage'],
        'Outlet' => ['outlet.view', 'outlet.view_all', 'outlet.manage', 'outlet.propose'],
        'Kunjungan & penjualan' => ['visit.view', 'visit.create', 'visit.correct'],
        'Tagihan & setoran' => ['invoice.view', 'invoice.manage', 'payment.record', 'remittance.receive'],
        'Produk, harga & potongan' => ['product.view', 'product.manage', 'discount.approve'],
        'Gudang' => ['inventory.view', 'inventory.manage', 'stock_adjustment.approve'],
        'Permintaan barang' => ['stock_request.view', 'stock_request.create', 'stock_request.prepare', 'stock_request.approve'],
        'Pengaturan' => ['setting.manage', 'data.import', 'user.manage'],
    ];

    /** The permission that must stay with at least one active user, or nobody can fix roles again. */
    public const ADMIN = 'user.manage';
}
