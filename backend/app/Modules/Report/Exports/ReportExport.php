<?php

namespace App\Modules\Report\Exports;

use App\Modules\Report\Reports\Report;
use Illuminate\Support\Carbon;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Shared\Date;

/**
 * A report as an Excel sheet: the same columns as the screen, numbers kept as
 * numbers (so totals and filters work in Excel), dates as real dates.
 */
final class ReportExport implements FromArray, ShouldAutoSize, WithColumnFormatting, WithHeadings, WithTitle
{
    private const FORMATS = [
        'int' => '#,##0',
        'money' => '"Rp"#,##0',
        'percent' => '0.0"%"',
        'date' => 'dd/mm/yyyy',
        'datetime' => 'dd/mm/yyyy hh:mm',
    ];

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array<string, int|float>|null  $totals
     */
    public function __construct(
        private readonly Report $report,
        private readonly array $rows,
        private readonly ?array $totals,
    ) {}

    public function headings(): array
    {
        return array_column($this->report->columns(), 'label');
    }

    public function array(): array
    {
        $columns = $this->report->columns();
        $lines = array_map(fn (array $row) => $this->line($columns, $row), $this->rows);

        if ($this->totals !== null) {
            $total = [];
            $first = true;
            foreach (array_keys($columns) as $key) {
                $total[] = $this->totals[$key] ?? ($first ? 'Jumlah' : null);
                $first = false;
            }
            $lines[] = $total;
        }

        return $lines;
    }

    public function columnFormats(): array
    {
        $formats = [];
        $index = 1;
        foreach ($this->report->columns() as $column) {
            if (isset(self::FORMATS[$column['type']])) {
                $formats[Coordinate::stringFromColumnIndex($index)] = self::FORMATS[$column['type']];
            }
            $index++;
        }

        return $formats;
    }

    public function title(): string
    {
        // Sheet names allow at most 31 characters and no "/"
        return mb_substr(str_replace(['/', '\\', '?', '*', '[', ']', ':'], ' ', $this->report->title()), 0, 31);
    }

    /**
     * @param  array<string, array{label: string, type: string}>  $columns
     * @param  array<string, mixed>  $row
     * @return list<mixed>
     */
    private function line(array $columns, array $row): array
    {
        $line = [];
        foreach ($columns as $key => $column) {
            $value = $row[$key] ?? null;
            if ($value !== null && in_array($column['type'], ['date', 'datetime'], true)) {
                $value = Date::PHPToExcel(Carbon::parse((string) $value)->setTimezone(config('app.timezone')));
            }
            $line[] = $value;
        }

        return $line;
    }
}
