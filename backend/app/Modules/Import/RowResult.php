<?php

namespace App\Modules\Import;

/** The check of one Excel row: ready to import, similar to existing data, or with problems. */
final class RowResult
{
    public const READY = 'ready';

    public const SIMILAR = 'similar';

    public const ERROR = 'error';

    /** @var list<string> */
    public array $problems = [];

    /** @var list<string> */
    public array $similar = [];

    /**
     * Existing records this row may be merged into instead of created (W10 [Gabung]).
     *
     * @var list<array{id: string, code: string, name: string}>
     */
    public array $mergeInto = [];

    /**
     * @param  array<string, mixed>  $values  cells as read (for the preview)
     * @param  array<string, mixed>  $data  cleaned values to save
     */
    public function __construct(
        public readonly int $line,
        public readonly array $values,
        public array $data = [],
    ) {}

    public function problem(string $message): void
    {
        $this->problems[] = $message;
    }

    public function status(): string
    {
        return $this->problems !== [] ? self::ERROR : ($this->similar !== [] ? self::SIMILAR : self::READY);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'line' => $this->line,
            'status' => $this->status(),
            'values' => $this->values,
            'problems' => $this->problems,
            'similar' => $this->similar,
            'merge_into' => $this->mergeInto,
        ];
    }
}
