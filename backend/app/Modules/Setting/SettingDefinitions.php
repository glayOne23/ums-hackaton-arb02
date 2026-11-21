<?php

namespace App\Modules\Setting;

/**
 * Every business rule an admin may change (SRS 3.7, doc 10 §6): type, limits,
 * default, and the words on the Settings screen (W8). A new rule is added
 * here and in doc 10 §6; nothing else changes.
 *
 * "editable" is false for rules whose feature is not built yet, so the
 * screen never offers a switch that does nothing.
 *
 * @phpstan-type Definition array{
 *     section: string, label: string, help?: string, type: 'int'|'bool'|'string'|'choice',
 *     default: int|bool|string, min?: int, max?: int, max_length?: int,
 *     options?: array<string, string>, suffix?: string, editable?: bool
 * }
 */
final class SettingDefinitions
{
    /** Sections in screen order */
    public const SECTIONS = [
        'billing' => 'Penagihan',
        'expiry' => 'Kedaluwarsa',
        'visit' => 'Kunjungan',
        'approval' => 'Persetujuan',
        'report' => 'Laporan',
        'company' => 'Data perusahaan di nota',
        'later' => 'Belum dipakai',
    ];

    /** @var array<string, Definition> */
    public const ALL = [
        'billing_threshold' => [
            'section' => 'billing', 'type' => 'int', 'default' => 2, 'min' => 0, 'max' => 1000,
            'label' => 'Sarankan tagih bila laku lebih dari',
            'help' => 'Dipakai untuk saran di lembar bayar sales (PG-01).',
        ],
        'billing_threshold_unit' => [
            'section' => 'billing', 'type' => 'choice', 'default' => 'unit',
            'options' => ['unit' => 'unit (jumlah barang)', 'product' => 'jenis produk'],
            'label' => 'Dihitung per',
        ],
        'credit_term_days' => [
            'section' => 'billing', 'type' => 'int', 'default' => 30, 'min' => 1, 'max' => 365, 'suffix' => 'hari',
            'label' => 'Tempo untuk outlet tempo',
        ],
        'expiry_withdrawal_months' => [
            'section' => 'expiry', 'type' => 'int', 'default' => 6, 'min' => 0, 'max' => 36, 'suffix' => 'bulan',
            'label' => 'Tandai untuk ditarik bila ED kurang dari',
            'help' => 'Juga batas peringatan ED di stok gudang.',
        ],
        'visit_cycle_days' => [
            'section' => 'visit', 'type' => 'int', 'default' => 30, 'min' => 1, 'max' => 365, 'suffix' => 'hari',
            'label' => 'Outlet perlu dikunjungi setiap',
            'help' => 'Bisa diatur lain per outlet. Juga jatuh tempo tagihan titip jual yang belum dibayar.',
        ],
        'form_photo_required' => [
            'section' => 'visit', 'type' => 'bool', 'default' => false,
            'label' => 'Foto form bercap wajib',
        ],
        'data_saver' => [
            'section' => 'visit', 'type' => 'bool', 'default' => false,
            'label' => 'Hemat data: foto form dikirim hanya lewat Wi-Fi',
            'help' => 'Angka kunjungan tetap langsung terkirim (NF-02).',
        ],
        'approve_stock_request' => [
            'section' => 'approval', 'type' => 'bool', 'default' => true,
            'label' => 'Barang keluar gudang perlu disetujui',
        ],
        'approve_discount' => [
            'section' => 'approval', 'type' => 'bool', 'default' => true,
            'label' => 'Perubahan potongan perlu disetujui Pimpinan',
        ],
        'approve_stock_adjustment' => [
            'section' => 'approval', 'type' => 'bool', 'default' => false,
            'label' => 'Penyesuaian opname perlu disetujui',
        ],
        'slow_sell_through_percent' => [
            'section' => 'report', 'type' => 'int', 'default' => 30, 'min' => 1, 'max' => 100, 'suffix' => '%',
            'label' => 'Produk disebut lambat laku bila lakunya di bawah',
            'help' => 'Laku dibagi titipan awal dalam sebulan, di laporan perputaran stok (LP-04).',
        ],
        'company_name' => [
            'section' => 'company', 'type' => 'string', 'default' => "CV Arba'in Jaya Mandiri", 'max_length' => 100,
            'label' => 'Nama perusahaan',
        ],
        'company_address' => [
            'section' => 'company', 'type' => 'string', 'default' => '', 'max_length' => 255,
            'label' => 'Alamat',
        ],
        'company_whatsapp' => [
            'section' => 'company', 'type' => 'string', 'default' => '', 'max_length' => 20,
            'label' => 'Nomor WhatsApp',
        ],
        'edit_window_days' => [
            'section' => 'later', 'type' => 'int', 'default' => 0, 'min' => 0, 'max' => 30, 'suffix' => 'hari',
            'label' => 'Batas perbaikan langsung oleh pembuat transaksi', 'editable' => false,
        ],
        'trash_retention_days' => [
            'section' => 'later', 'type' => 'int', 'default' => 30, 'min' => 1, 'max' => 365, 'suffix' => 'hari',
            'label' => 'Masa simpan Tempat Sampah', 'editable' => false,
        ],
        'period_closing_enabled' => [
            'section' => 'later', 'type' => 'bool', 'default' => false,
            'label' => 'Tutup buku per bulan', 'editable' => false,
        ],
    ];

    /** @return Definition */
    public static function get(string $key): array
    {
        if (! isset(self::ALL[$key])) {
            throw new \InvalidArgumentException("Unknown setting [{$key}]. Add it to doc 10 §6 and SettingDefinitions::ALL first.");
        }

        return self::ALL[$key];
    }

    /**
     * Validation rules for a new value.
     *
     * @return list<mixed>
     */
    public static function rules(string $key): array
    {
        $definition = self::get($key);

        return match ($definition['type']) {
            'int' => ['required', 'integer', 'min:'.($definition['min'] ?? 0), 'max:'.($definition['max'] ?? PHP_INT_MAX)],
            'bool' => ['required', 'boolean'],
            'choice' => ['required', 'string', 'in:'.implode(',', array_keys($definition['options'] ?? []))],
            'string' => ['present', 'nullable', 'string', 'max:'.($definition['max_length'] ?? 255)],
        };
    }

    /** The stored form of a validated value */
    public static function cast(string $key, mixed $value): int|bool|string
    {
        return match (self::get($key)['type']) {
            'int' => (int) $value,
            'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            default => trim((string) $value),
        };
    }
}
