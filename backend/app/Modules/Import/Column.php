<?php

namespace App\Modules\Import;

/** One column of an import template. */
final readonly class Column
{
    /**
     * @param  list<string>  $aliases  other headings accepted for this column
     */
    public function __construct(
        public string $key,
        public string $label,
        public bool $required,
        public string $example,
        public string $help = '',
        public array $aliases = [],
    ) {}

    public function heading(): string
    {
        return $this->required ? "{$this->label} (wajib)" : $this->label;
    }
}
