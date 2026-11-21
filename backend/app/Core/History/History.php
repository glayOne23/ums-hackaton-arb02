<?php

namespace App\Core\History;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * KR-10: one line in a record's change history (W12), stored in
 * sys_activity_log: what happened, the before → after lines, and the reason.
 * Lines are written in plain Indonesian when they are recorded, so the
 * history reads the same even after names change later.
 */
final class History
{
    public const LOG = 'history';

    /**
     * @param  list<string>  $changes  e.g. "Nama: Toko Lama → Toko Baru"
     */
    public static function record(Model $subject, string $title, array $changes = [], ?string $reason = null, ?User $by = null): void
    {
        activity(self::LOG)
            ->performedOn($subject)
            ->causedBy($by)
            ->withProperties(array_filter(['changes' => $changes, 'reason' => $reason]))
            ->log($title);
    }

    /**
     * "Label: old → new" for every labelled field that changed.
     *
     * @param  array<string, string>  $labels  field => label on screen
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  array<string, callable(mixed): string>  $formats  field => how to show a value
     * @return list<string>
     */
    public static function diff(array $labels, array $before, array $after, array $formats = []): array
    {
        $lines = [];
        foreach ($labels as $field => $label) {
            $old = $before[$field] ?? null;
            $new = $after[$field] ?? null;
            if (self::same($old, $new)) {
                continue;
            }
            $show = $formats[$field] ?? fn (mixed $value): string => self::plain($value);
            $lines[] = "{$label}: {$show($old)} → {$show($new)}";
        }

        return $lines;
    }

    public static function plain(mixed $value): string
    {
        return match (true) {
            $value === null || $value === '' => '(kosong)',
            is_bool($value) => $value ? 'ya' : 'tidak',
            $value instanceof \BackedEnum => method_exists($value, 'label') ? (string) $value->label() : (string) $value->value,
            is_array($value) => implode(', ', array_map(fn ($v) => self::plain($v), $value)) ?: '(kosong)',
            default => (string) $value,
        };
    }

    private static function same(mixed $a, mixed $b): bool
    {
        if ($a instanceof \BackedEnum) {
            $a = $a->value;
        }
        if ($b instanceof \BackedEnum) {
            $b = $b->value;
        }
        if (is_numeric($a) && is_numeric($b)) {
            return (float) $a === (float) $b;
        }

        return $a === $b || ((string) json_encode($a) === (string) json_encode($b));
    }
}
