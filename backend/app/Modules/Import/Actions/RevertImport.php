<?php

namespace App\Modules\Import\Actions;

use App\Core\Models\ImportBatch;
use App\Core\Period\ClosedPeriods;
use App\Models\User;
use App\Modules\Import\Types\ImportType;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * KR-14: undo a whole import session, as long as nothing has used its data.
 * Nothing is half undone: one blocked row stops the whole undo.
 */
final class RevertImport
{
    public function handle(ImportType $type, ImportBatch $batch, User $actor): void
    {
        if ($batch->status === ImportBatch::REVERTED) {
            throw ValidationException::withMessages(['batch' => 'Impor ini sudah dibatalkan.']);
        }

        app(ClosedPeriods::class)->assertOpen($batch->created_at, "Impor {$batch->file_name}", 'batch');

        DB::transaction(function () use ($type, $batch, $actor) {
            $type->revert($batch, $actor);
            $type->revertMerges($batch->merges ?? [], $batch, $actor);

            $batch->forceFill(['status' => ImportBatch::REVERTED, 'reverted_by' => $actor->id, 'reverted_at' => now()])->save();

            activity('import')
                ->performedOn($batch)
                ->causedBy($actor)
                ->event('deleted')
                ->withProperties(['type' => $type->key()])
                ->log("Impor {$type->title()} dibatalkan: {$batch->file_name}");
        });
    }
}
