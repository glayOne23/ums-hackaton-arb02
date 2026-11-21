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
 * when the admin ticked them, rows with problems never. A "mirip" row may
 * instead be merged into the existing record it looks like ([Gabung]): it
 * completes that record and is not created. All in one transaction.
 */
final class RunImport
{
    /**
     * @param  list<int>  $includeSimilar  line numbers of "mirip" rows the admin wants imported anyway
     * @param  array<int, string>  $merge  line => id of the existing record a "mirip" row joins
     */
    public function handle(ImportType $type, string $token, array $includeSimilar, User $actor, array $merge = []): ImportBatch
    {
        $preview = Cache::get(PreviewImport::cacheKey($token));
        if (! is_array($preview) || $preview['type'] !== $type->key() || $preview['user_id'] !== $actor->id) {
            throw ValidationException::withMessages(['token' => 'Pratinjau sudah kedaluwarsa. Pilih file lagi.']);
        }

        $results = $type->check($preview['rows']);

        // [Gabung] only into a record the check itself proposed for that row
        $joins = [];
        foreach ($results as $r) {
            $target = $merge[$r->line] ?? null;
            if ($r->status() === RowResult::SIMILAR && $target !== null && in_array($target, array_column($r->mergeInto, 'id'), true)) {
                $joins[] = [$r, $target];
            }
        }
        $joined = array_map(fn (array $join) => $join[0]->line, $joins);

        $chosen = array_values(array_filter($results, fn (RowResult $r) => $r->status() === RowResult::READY
            || ($r->status() === RowResult::SIMILAR && in_array($r->line, $includeSimilar, true) && ! in_array($r->line, $joined, true))));

        if ($chosen === [] && $joins === []) {
            throw ValidationException::withMessages(['token' => 'Tidak ada baris yang siap diimpor.']);
        }

        $batch = DB::transaction(function () use ($type, $preview, $results, $chosen, $joins, $actor) {
            $batch = ImportBatch::query()->create([
                'type' => $type->key(),
                'file_name' => mb_substr((string) $preview['file_name'], 0, 255),
                'row_count' => count($results),
                'imported_count' => count($chosen),
                'merged_count' => count($joins),
                'skipped_count' => count($results) - count($chosen) - count($joins),
                'status' => ImportBatch::IMPORTED,
                'created_by' => $actor->id,
            ]);
            $type->store($chosen, $batch, $actor);
            if ($joins !== []) {
                $batch->forceFill(['merges' => $type->merge($joins, $batch, $actor)])->save();
            }

            activity('import')
                ->performedOn($batch)
                ->causedBy($actor)
                ->event('created')
                ->withProperties(['type' => $type->key(), 'imported' => count($chosen), 'merged' => count($joins), 'skipped' => count($results) - count($chosen) - count($joins)])
                ->log("Impor {$type->title()}: ".count($chosen).' baris'.($joins !== [] ? ', '.count($joins).' digabung' : ''));

            return $batch;
        });

        Cache::forget(PreviewImport::cacheKey($token));

        return $batch;
    }
}
