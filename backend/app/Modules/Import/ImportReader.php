<?php

namespace App\Modules\Import;

use App\Modules\Import\Types\ImportType;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Throwable;

/**
 * Reads the first sheet of an uploaded file. The heading row may sit below a
 * title, columns may be in any order, and "(wajib)" or spelling differences in
 * the headings do not matter.
 */
final class ImportReader
{
    public const MAX_ROWS = 5000;

    /**
     * @return list<array{line: int, values: array<string, mixed>}>
     */
    public function read(string $path, ImportType $type): array
    {
        try {
            $sheet = IOFactory::load($path)->getSheet(0);
        } catch (Throwable) {
            throw ValidationException::withMessages(['file' => 'File tidak bisa dibaca. Simpan sebagai Excel (.xlsx) lalu coba lagi.']);
        }

        $grid = $sheet->toArray(null, true, false, false);

        $lookup = [];
        foreach ($type->columns() as $column) {
            foreach ([$column->label, $column->heading(), ...$column->aliases] as $name) {
                $lookup[self::headingKey($name)] = $column->key;
            }
        }

        // The heading row: the first of the top 10 rows that names a required column
        $required = array_map(fn (Column $c) => $c->key, array_filter($type->columns(), fn (Column $c) => $c->required));
        $headerIndex = null;
        $map = [];
        foreach (array_slice($grid, 0, 10, true) as $index => $cells) {
            $found = [];
            foreach ($cells as $col => $cell) {
                $key = $lookup[self::headingKey((string) $cell)] ?? null;
                if ($key !== null && ! in_array($key, $found, true)) {
                    $found[$col] = $key;
                }
            }
            if (array_intersect($required, $found) !== []) {
                $headerIndex = $index;
                $map = $found;
                break;
            }
        }

        if ($headerIndex === null) {
            throw ValidationException::withMessages(['file' => 'Baris judul kolom tidak ditemukan. Pakai template dari tombol "Unduh template".']);
        }

        $missing = array_diff($required, $map);
        if ($missing !== []) {
            $labels = array_map(fn (Column $c) => $c->label, array_filter($type->columns(), fn (Column $c) => in_array($c->key, $missing, true)));
            throw ValidationException::withMessages(['file' => 'Kolom wajib tidak ada: '.implode(', ', $labels).'.']);
        }

        $rows = [];
        foreach (array_slice($grid, $headerIndex + 1, null, true) as $index => $cells) {
            $values = [];
            foreach ($map as $col => $key) {
                $values[$key] = $cells[$col] ?? null;
            }
            if (implode('', array_map(fn ($v) => Cell::text($v), $values)) === '') {
                continue;
            }
            $rows[] = ['line' => $index + 1, 'values' => $values];
        }

        if ($rows === []) {
            throw ValidationException::withMessages(['file' => 'File ini belum berisi data di bawah judul kolom.']);
        }
        if (count($rows) > self::MAX_ROWS) {
            throw ValidationException::withMessages(['file' => 'Paling banyak '.self::MAX_ROWS.' baris per impor. Bagi file menjadi beberapa bagian.']);
        }

        return $rows;
    }

    private static function headingKey(string $heading): string
    {
        return str_replace(' ', '', Cell::key(str_ireplace('(wajib)', '', $heading)));
    }
}
