<?php

namespace App\Modules\Import\Exports;

use App\Modules\Import\Column;
use App\Modules\Import\Types\ImportType;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * The template of one import (W10 "Unduh template"): the columns with one
 * fictional example row, a sheet explaining each column, and a sheet with the
 * valid choices (outlet types, regions, …) so the admin can copy them exactly.
 */
final class TemplateExport implements Export, WithMultipleSheets
{
    public function __construct(private readonly ImportType $type) {}

    public function sheets(): array
    {
        $columns = $this->type->columns();
        $sheets = [
            new TableExport($this->type->title(), array_map(fn (Column $c) => $c->heading(), $columns), [
                array_map(fn (Column $c) => $c->example, $columns),
            ]),
            new TableExport('Petunjuk', ['Kolom', 'Wajib', 'Keterangan'], array_map(fn (Column $c) => [
                $c->label, $c->required ? 'Ya' : 'Tidak', $c->help,
            ], $columns)),
        ];

        $choices = $this->type->choices();
        if ($choices !== []) {
            $headings = array_keys($choices);
            $height = max(array_map(count(...), $choices));
            $rows = [];
            for ($i = 0; $i < $height; $i++) {
                $rows[] = array_map(fn (string $heading) => $choices[$heading][$i] ?? null, $headings);
            }
            $sheets[] = new TableExport('Pilihan', $headings, $rows);
        }

        return $sheets;
    }
}
