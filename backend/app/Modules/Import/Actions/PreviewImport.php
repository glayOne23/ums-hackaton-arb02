<?php

namespace App\Modules\Import\Actions;

use App\Models\User;
use App\Modules\Import\ImportReader;
use App\Modules\Import\RowResult;
use App\Modules\Import\Types\ImportType;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * W10 step 1: read the file and check every row, without saving anything.
 * The rows are kept for an hour under a token, so "Impor" does not need the
 * file uploaded again.
 */
final class PreviewImport
{
    public const TTL_MINUTES = 60;

    public function __construct(private readonly ImportReader $reader) {}

    /** @return array<string, mixed> */
    public function handle(ImportType $type, UploadedFile $file, User $actor): array
    {
        $rows = $this->reader->read($file->getRealPath() ?: $file->getPathname(), $type);
        $results = $type->check($rows);

        $token = (string) Str::ulid();
        Cache::put(self::cacheKey($token), [
            'type' => $type->key(),
            'user_id' => $actor->id,
            'file_name' => $file->getClientOriginalName(),
            'rows' => $rows,
        ], now()->addMinutes(self::TTL_MINUTES));

        return [
            'token' => $token,
            'type' => $type->key(),
            'file_name' => $file->getClientOriginalName(),
            'columns' => array_map(fn ($c) => ['key' => $c->key, 'label' => $c->label], $type->columns()),
            'counts' => self::counts($results),
            'rows' => array_map(fn (RowResult $r) => $r->toArray(), $results),
        ];
    }

    public static function cacheKey(string $token): string
    {
        return "import-preview:{$token}";
    }

    /**
     * @param  list<RowResult>  $results
     * @return array{total: int, ready: int, similar: int, error: int}
     */
    public static function counts(array $results): array
    {
        $statuses = array_map(fn (RowResult $r) => $r->status(), $results);

        return [
            'total' => count($results),
            'ready' => count(array_keys($statuses, RowResult::READY, true)),
            'similar' => count(array_keys($statuses, RowResult::SIMILAR, true)),
            'error' => count(array_keys($statuses, RowResult::ERROR, true)),
        ];
    }
}
