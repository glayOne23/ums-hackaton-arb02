<?php

namespace App\Modules\Outlet\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

/**
 * OT-07 stok standar of one product at one outlet.
 *
 * @property string $id
 * @property string $outlet_id
 * @property string $product_id
 * @property int $target_qty
 */
class OutletStockTarget extends Model
{
    use HasUlids;

    protected $table = 'crm_outlet_stock_targets';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['target_qty' => 'integer'];
    }
}
