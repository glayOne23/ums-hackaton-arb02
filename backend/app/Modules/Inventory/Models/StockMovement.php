<?php

namespace App\Modules\Inventory\Models;

use App\Models\User;
use App\Modules\Inventory\Enums\MovementBasis;
use App\Modules\Inventory\Enums\MovementType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * One line of the stock ledger. Never changed or deleted.
 *
 * @property string $id
 * @property string $batch_id
 * @property string|null $from_location_id
 * @property string|null $to_location_id
 * @property int $qty
 * @property MovementType $type
 * @property MovementBasis $basis
 * @property string|null $source_type
 * @property string|null $source_id
 * @property string|null $note
 * @property Carbon $created_at
 */
#[Fillable(['batch_id', 'from_location_id', 'to_location_id', 'qty', 'type', 'basis', 'source_type', 'source_id', 'reverses_id', 'note', 'created_by'])]
class StockMovement extends Model
{
    use HasUlids;

    protected $table = 'inv_stock_movements';

    protected function casts(): array
    {
        return ['qty' => 'integer', 'type' => MovementType::class, 'basis' => MovementBasis::class];
    }

    /** @return BelongsTo<Batch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /** @return BelongsTo<StockLocation, $this> */
    public function fromLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class, 'from_location_id');
    }

    /** @return BelongsTo<StockLocation, $this> */
    public function toLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class, 'to_location_id');
    }

    /** @return MorphTo<Model, $this> */
    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
