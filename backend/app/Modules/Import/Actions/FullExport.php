<?php

namespace App\Modules\Import\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use ZipArchive;

/**
 * FP-11: every business table in one ZIP (JSON or CSV, one file per table plus
 * manifest.json), so the partner's data is never locked in SIGAP.
 *
 * Left out: secrets (password hashes, API tokens, push keys) and framework
 * plumbing (cache, jobs, sessions, migrations). Only tables of this
 * application's own database are read, never other schemas on the same server.
 */
final class FullExport
{
    /** Table name prefixes that hold SIGAP data (doc 10 §2) */
    private const PREFIXES = ['auth_', 'crm_', 'prd_', 'inv_', 'sls_', 'bil_', 'cfg_', 'core_', 'mfg_'];

    /** Also kept: the change history (AK-03, KR-10) */
    private const EXTRA = ['sys_activity_log'];

    private const SKIP = ['auth_personal_access_tokens', 'auth_password_reset_tokens', 'auth_sessions'];

    /** @var array<string, list<string>> table => columns never exported */
    private const HIDDEN = ['auth_users' => ['password', 'remember_token']];

    /** @return list<string> */
    public function tables(): array
    {
        $connection = DB::connection();
        $current = $connection->getDriverName() === 'sqlite' ? 'main' : $connection->getDatabaseName();

        return collect(Schema::getTables())
            // Case-insensitive: MySQL on Windows reports "sigap" for DB_DATABASE=SIGAP
            ->filter(fn (array $t) => strcasecmp((string) ($t['schema'] ?? $current), $current) === 0)
            ->pluck('name')
            ->filter(fn (string $name) => ! in_array($name, self::SKIP, true)
                && (in_array($name, self::EXTRA, true) || collect(self::PREFIXES)->contains(fn ($p) => str_starts_with($name, $p))))
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /** Builds the ZIP and returns its temporary path; the caller deletes it after sending. */
    public function handle(string $format, User $actor): string
    {
        $path = tempnam(sys_get_temp_dir(), 'sigap-export-');
        if ($path === false) {
            throw new RuntimeException('Cannot create a temporary file for the export.');
        }
        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Cannot open the export ZIP.');
        }

        $parts = [];
        $counts = [];
        foreach ($this->tables() as $table) {
            $part = tempnam(sys_get_temp_dir(), 'sigap-table-');
            if ($part === false) {
                throw new RuntimeException('Cannot create a temporary file for the export.');
            }
            $counts[$table] = $format === 'csv' ? $this->writeCsv($table, $part) : $this->writeJson($table, $part);
            $zip->addFile($part, "{$table}.{$format}");
            $parts[] = $part;
        }

        $zip->addFromString('manifest.json', (string) json_encode([
            'application' => 'SIGAP',
            'exported_at' => now()->toIso8601String(),
            'exported_by' => $actor->name,
            'format' => $format,
            'rows' => $counts,
            'note' => 'Kata sandi, token masuk, dan kunci notifikasi tidak ikut diekspor. Arti tabel dan kolom: docs/pengembangan/10_Arsitektur_Basis_Data.md.',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $zip->close();
        array_map('unlink', $parts);

        activity('export')->causedBy($actor)->withProperties(['format' => $format, 'tables' => count($counts)])
            ->log('Mengekspor seluruh data');

        return $path;
    }

    private function writeJson(string $table, string $file): int
    {
        $out = fopen($file, 'w');
        if ($out === false) {
            throw new RuntimeException("Cannot write {$table}.");
        }
        fwrite($out, '[');
        $count = 0;
        foreach ($this->rows($table) as $row) {
            fwrite($out, ($count ? ",\n" : "\n").json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $count++;
        }
        fwrite($out, $count ? "\n]\n" : "]\n");
        fclose($out);

        return $count;
    }

    private function writeCsv(string $table, string $file): int
    {
        $out = fopen($file, 'w');
        if ($out === false) {
            throw new RuntimeException("Cannot write {$table}.");
        }
        // UTF-8 BOM so Excel shows names with special characters correctly
        fwrite($out, "\xEF\xBB\xBF");
        $columns = array_values(array_diff(Schema::getColumnListing($table), self::HIDDEN[$table] ?? []));
        fputcsv($out, $columns, ',', '"', '');
        $count = 0;
        foreach ($this->rows($table) as $row) {
            fputcsv($out, array_map(fn ($column) => $row[$column] ?? null, $columns), ',', '"', '');
            $count++;
        }
        fclose($out);

        return $count;
    }

    /** @return iterable<array<string, mixed>> */
    private function rows(string $table): iterable
    {
        $hidden = self::HIDDEN[$table] ?? [];
        foreach (DB::table($table)->cursor() as $row) {
            $values = (array) $row;
            foreach ($hidden as $column) {
                unset($values[$column]);
            }
            yield $values;
        }
    }
}
