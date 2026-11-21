<?php

namespace App\Modules\Import\Types;

use App\Core\Models\ImportBatch;
use App\Models\User;
use App\Modules\Import\Column;
use App\Modules\Import\RowResult;

/**
 * One kind of Excel import (IE-01). It knows its template columns, checks each
 * row against the data already in SIGAP and against earlier rows of the same
 * file, saves the rows that pass, and can undo a whole session (KR-14).
 */
abstract class ImportType
{
    abstract public function key(): string;

    abstract public function title(): string;

    abstract public function description(): string;

    /** @return list<Column> */
    abstract public function columns(): array;

    /**
     * Check every row. Rows are checked in file order, so a row can be compared
     * with the rows above it.
     *
     * @param  list<array{line: int, values: array<string, mixed>}>  $rows
     * @return list<RowResult>
     */
    abstract public function check(array $rows): array;

    /**
     * Save the rows that passed. Runs inside the import transaction.
     *
     * @param  list<RowResult>  $rows
     */
    abstract public function store(array $rows, ImportBatch $batch, User $actor): void;

    /**
     * Undo everything a session saved. Throws a ValidationException that says
     * what blocks it (e.g. an imported outlet was already visited).
     */
    abstract public function revert(ImportBatch $batch, User $actor): void;

    /**
     * W10 [Gabung]: use similar rows to complete records that already exist
     * instead of creating new ones. Returns what was filled in per row, kept
     * on the session so revertMerges() can put it back. Only kinds that fill
     * RowResult::$mergeInto are asked.
     *
     * @param  list<array{0: RowResult, 1: string}>  $rows  row and the id of the record it joins
     * @return list<array<string, mixed>>
     */
    public function merge(array $rows, ImportBatch $batch, User $actor): array
    {
        throw new \LogicException("Import {$this->key()} cannot merge rows.");
    }

    /**
     * Undo what merge() filled in, where nobody has changed it since.
     *
     * @param  list<array<string, mixed>>  $merges
     */
    public function revertMerges(array $merges, ImportBatch $batch, User $actor): void {}

    /**
     * Valid choices to show on the template's second sheet, e.g. outlet types.
     *
     * @return array<string, list<string>> heading => values
     */
    public function choices(): array
    {
        return [];
    }

    /**
     * The same columns filled from SIGAP, for "Ekspor Excel" (IE-02). Null when
     * this kind has no export.
     *
     * @return list<list<mixed>>|null
     */
    public function exportRows(): ?array
    {
        return null;
    }

    /** Permission needed to export this kind of data. */
    public function exportPermission(): string
    {
        return 'data.import';
    }

    /**
     * One message for a refused undo: the first few reasons, then a count.
     *
     * @param  list<string>  $lines
     */
    public static function summarize(array $lines): string
    {
        $more = count($lines) - 3;

        return 'Impor ini tidak bisa dibatalkan karena datanya sudah dipakai. '.implode(' ', array_slice($lines, 0, 3))
            .($more > 0 ? " Dan {$more} lainnya." : '');
    }
}
