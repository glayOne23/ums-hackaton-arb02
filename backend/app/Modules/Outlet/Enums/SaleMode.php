<?php

namespace App\Modules\Outlet\Enums;

/** How an outlet buys from Arba'in (OT-01). */
enum SaleMode: string
{
    case Consignment = 'consignment';
    case Cash = 'cash';
    case Credit = 'credit';

    public function label(): string
    {
        return match ($this) {
            self::Consignment => 'Titip jual',
            self::Cash => 'Beli langsung',
            self::Credit => 'Tempo',
        };
    }

    /** @return list<array{value: string, label: string}> */
    public static function options(): array
    {
        return array_map(
            fn (self $mode) => ['value' => $mode->value, 'label' => $mode->label()],
            self::cases(),
        );
    }
}
