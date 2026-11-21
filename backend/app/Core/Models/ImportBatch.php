<?php

namespace App\Core\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One Excel import session (IE-01, KR-14).
 *
 * @property string $id
 * @property string $type outlets | products | consignment_stock
 * @property string $file_name
 * @property int $row_count
 * @property int $imported_count
 * @property int $skipped_count
 * @property string $status imported | reverted
 * @property int $created_by
 * @property int|null $reverted_by
 * @property Carbon|null $reverted_at
 * @property Carbon $created_at
 */
#[Fillable(['type', 'file_name', 'row_count', 'imported_count', 'skipped_count', 'status', 'created_by'])]
class ImportBatch extends Model
{
    use HasUlids;

    public const IMPORTED = 'imported';

    public const REVERTED = 'reverted';

    protected $table = 'core_import_batches';

    protected function casts(): array
    {
        return [
            'row_count' => 'integer',
            'imported_count' => 'integer',
            'skipped_count' => 'integer',
            'reverted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function reverter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reverted_by');
    }
}
