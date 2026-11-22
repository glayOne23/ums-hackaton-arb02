<?php

namespace App\Modules\Auth\Models;

use App\Modules\Auth\Roles;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Role with an Indonesian name and the screen area its users open (PG-08).
 *
 * @property string|null $label
 * @property string $area "field" (sales phone screens) or "office"
 * @property string|null $description main duties, shown in Pengguna → Peran dan hak akses
 */
class Role extends SpatieRole
{
    public function displayName(): string
    {
        return $this->label ?? Roles::LABELS[$this->name] ?? $this->name;
    }

    /** Default roles come from the seeder and cannot be deleted. */
    public function isDefault(): bool
    {
        return array_key_exists($this->name, Roles::LABELS);
    }
}
