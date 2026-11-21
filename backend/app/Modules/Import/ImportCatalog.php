<?php

namespace App\Modules\Import;

use App\Modules\Import\Types\ConsignmentStockImport;
use App\Modules\Import\Types\ImportType;
use App\Modules\Import\Types\OutletImport;
use App\Modules\Import\Types\ProductImport;

/** The kinds of W10 imports, in the order data should go in (outlets and products before stock). */
final class ImportCatalog
{
    /** @var list<class-string<ImportType>> */
    private const TYPES = [OutletImport::class, ProductImport::class, ConsignmentStockImport::class];

    /** @return list<ImportType> */
    public function all(): array
    {
        return array_map(fn (string $class) => app($class), self::TYPES);
    }

    public function find(string $key): ?ImportType
    {
        foreach ($this->all() as $type) {
            if ($type->key() === $key) {
                return $type;
            }
        }

        return null;
    }
}
