<?php

namespace App\Modules\Auth;

/**
 * Default roles (SDD §7). These are only a starting point: admins can re-tick
 * permissions per role or create new roles from the Roles & Permissions screen.
 */
final class Roles
{
    public const MANAGER = 'manager';

    public const OFFICE_ADMIN = 'office_admin';

    public const WAREHOUSE_ADMIN = 'warehouse_admin';

    public const SALES = 'sales';

    /** @var array<string, string> role name => UI label */
    public const LABELS = [
        self::MANAGER => 'Pimpinan',
        self::OFFICE_ADMIN => 'Admin Kantor',
        self::WAREHOUSE_ADMIN => 'Admin Gudang',
        self::SALES => 'Sales',
    ];

    public const AREA_FIELD = 'field';

    public const AREA_OFFICE = 'office';

    /** @var array<string, string> screen area => UI label */
    public const AREAS = [
        self::AREA_FIELD => 'Layar lapangan (HP sales)',
        self::AREA_OFFICE => 'Layar kantor & gudang',
    ];

    /** Default roles whose users land in the field area after signing in. */
    public const FIELD_ROLES = [self::SALES];

    /** @return array<string, list<string>> role => default permissions */
    public static function defaultPermissions(): array
    {
        return [
            self::MANAGER => [
                'dashboard.view', 'report.view', 'outlet.view', 'outlet.view_all', 'product.view',
                'discount.approve', 'inventory.view', 'stock_request.view', 'stock_adjustment.approve',
                'visit.view', 'invoice.view',
            ],
            self::OFFICE_ADMIN => [
                'dashboard.view', 'report.view', 'target.manage', 'outlet.view', 'outlet.view_all', 'outlet.manage',
                'product.view', 'product.manage', 'stock_request.view',
                'visit.view', 'visit.correct',
                'invoice.view', 'invoice.manage', 'remittance.receive',
                'setting.manage', 'user.manage',
            ],
            self::WAREHOUSE_ADMIN => [
                'report.view', 'product.view', 'inventory.view', 'inventory.manage',
                'stock_request.view', 'stock_request.prepare', 'stock_request.approve',
            ],
            self::SALES => [
                'dashboard.view', 'outlet.view', 'outlet.propose', 'product.view',
                'stock_request.create', 'visit.create', 'visit.correct', 'payment.record',
            ],
        ];
    }
}
