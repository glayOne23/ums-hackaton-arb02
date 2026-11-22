<?php

namespace App\Modules\Setting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * FP-06: one extra field of outlets or products (cfg_custom_fields).
 *
 * @property string $id
 * @property string $entity outlet | product
 * @property string $key
 * @property string $label
 * @property string $type text | number | date | choice
 * @property list<string>|null $options
 * @property bool $is_active
 * @property int $sort
 * @property Carbon $created_at
 */
class CustomField extends Model
{
    use HasUlids;

    public const ENTITIES = ['outlet' => 'Outlet', 'product' => 'Produk'];

    public const TYPES = ['text' => 'Teks', 'number' => 'Angka', 'date' => 'Tanggal', 'choice' => 'Pilihan'];

    protected $table = 'cfg_custom_fields';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['options' => 'array', 'is_active' => 'boolean', 'sort' => 'integer'];
    }
}
