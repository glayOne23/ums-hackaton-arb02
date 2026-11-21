<?php

namespace App\Modules\Setting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One rule changed from its default. Only the Setting module writes it;
 * everyone else reads through Setting::value().
 *
 * @property string $key
 * @property int|bool|string $value
 * @property int|null $updated_by
 * @property Carbon $updated_at
 */
#[Fillable(['key', 'value', 'updated_by'])]
class SettingValue extends Model
{
    protected $table = 'cfg_settings';

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return ['value' => 'json', 'updated_by' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
