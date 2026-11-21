<?php

namespace App\Modules\Import\Actions;

use App\Core\Models\ImportBatch;
use App\Models\User;
use App\Modules\Import\RowResult;
use App\Modules\Import\Types\ImportType;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * W10 step 2: import the previewed rows. Rows are checked again (someone may
 * have changed data meanwhile); rows ready to go are saved, "mirip" rows only
 * when the admin ticked them, rows with problems never. All in one transaction.
 */
final class RunImport
{
    /**
     * @param  list<int>  $includeSimilar  line numbers of "mirip" rows the admin wants imported anyway
     */
    public function handle(ImportType $type, string $token, array $includeSimilar, User $actor): ImportBatch
    {
        $preview = Cache::get(PreviewImport::cacheKey($token));
        if (! is_array($preview) || $preview['type'] !== $type->key() || $preview['user_id'] !== $actor->id) {
            throw ValidationException::withMessages(['token' => 'Pratinjau sudah kedaluwarsa. Pilih file lagi.']);
        }

        $results = $type->check($preview['rows']);
        $chosen = array_values(array_filter($results, fn (RowResult $r) => $r->status() === RowResult::READY
            || ($r->status() === RowResult::SIMILAR && in_array($r->line, $includeSimilar, true))));

        if ($chosen === []) {
            throw ValidationException::withMessages(['token' => 'Tidak ada baris yang siap diimpor.']);
        }

        $batch = DB::transaction(function () use ($type, $preview, $results, $chosen, $actor) {
            $batch = ImportBatch::query()->create([
                'type' => $type->key(),
                'file_name' => mb_substr((string) $preview['file_name'], 0, 255),
                'row_count' => count($results),
                'imported_count' => count($chosen),
                'skipped_count' => count($results) - count($chosen),
                'status' => ImportBatch::IMPORTED,
                'created_by' => $actor->id,
            ]);
            $type->store($chosen, $batch, $actor);

            activity('import')
                ->performedOn($batch)
                ->causedBy($actor)
                ->event('created')
                ->withProperties(['type' => $type->key(), 'imported' => count($chosen), 'skipped' => count($results) - count($chosen)])
                ->log("Impor {$type->title()}: ".count($chosen).' baris');

            return $batch;
        });

        Cache::forget(PreviewImport::cacheKey($token));

        return $batch;
    }
}
